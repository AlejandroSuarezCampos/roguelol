import { CARDS } from '../data/cards';
import { CHAMPION_IDS } from '../data/champions';
import { GEAR } from '../data/gear';
import { RELICS } from '../data/relics';
import { CONFIG } from '../engine/config';
import type { Expedition } from '../engine/expedition';
import { Rng } from '../engine/rng';
import { OMENS } from '../engine/run';
import { POTIONS } from '../engine/potions';

/** Versión del formato. Súbela (y añade una migración) si cambia la forma de lo que se guarda. */
export const SAVE_VERSION = 2;
export const SAVE_KEY = 'shattered-runeterra:run';
export const CORRUPT_KEY = 'shattered-runeterra:run.corrupt';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type LoadResult = { status: 'none' } | { status: 'ok'; expedition: Expedition } | { status: 'corrupt'; reason: string };

export interface SaveSummary {
  /** Piso actual (1 = primer piso; 0 si aún no ha entrado en ninguno). */
  floor: number;
  gold: number;
  champions: number;
  savedAt: number;
}

const NODE_TYPES = ['combat', 'elite', 'boss', 'rest', 'shop', 'event', 'chest', 'shrine'];
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Comprueba la forma y las referencias de un guardado. Devuelve el motivo del primer fallo, o null si es válido. */
function problem(x: any): string | null {
  if (!isObj(x) || !isObj(x.run) || !isObj(x.map)) return 'estructura';
  const r = x.run;
  if (!isObj(r.rng) || !isNum(r.rng.state)) return 'rng';
  if (!OMENS.includes(r.omen)) return 'presagio';
  if (!isNum(r.mist) || r.mist < 0 || r.mist > 100) return 'niebla';
  if (!isNum(r.gold) || r.gold < 0) return 'oro';
  if (!Array.isArray(r.relics) || !r.relics.every((id: unknown) => typeof id === 'string' && id in RELICS) || new Set(r.relics).size !== r.relics.length) return 'reliquias';
  if (!Array.isArray(r.belt) || r.belt.length !== CONFIG.potions.beltSize) return 'cinturón';
  for (const p of r.belt) if (p !== null && !(isObj(p) && p.id in POTIONS && typeof p.spent === 'boolean')) return 'poción';
  const champs = r.champions;
  if (!Array.isArray(champs) || champs.length !== CHAMPION_IDS.length) return 'campeones';
  if (new Set(champs.map((c: any) => c?.id)).size !== champs.length || !champs.every((c: any) => CHAMPION_IDS.includes(c?.id))) return 'campeón repetido o desconocido';
  if (new Set(champs.map((c: any) => c.pos)).size !== champs.length || !champs.every((c: any) => [1, 2, 3, 4].includes(c.pos))) return 'posiciones';
  for (const c of champs) {
    if (![c.hp, c.maxHp, c.stress].every(isNum) || c.maxHp <= 0 || c.hp < 0 || c.hp > c.maxHp || c.stress < 0 || c.stress > 100 || typeof c.downed !== 'boolean') return 'vida o estrés';
  }
  if (!Array.isArray(x.deck) || !x.deck.every((id: unknown) => typeof id === 'string' && id in CARDS)) return 'mazo';
  if (x.deck.length < CONFIG.shop.minDeck) return 'mazo demasiado pequeño';
  const nodes = x.map.nodes;
  if (!Array.isArray(nodes) || !nodes.length) return 'mapa';
  const ids = new Set<string>();
  for (const n of nodes) {
    if (!isObj(n) || typeof n.id !== 'string' || !isNum(n.floor) || !isNum(n.x) || !NODE_TYPES.includes(n.type) || !Array.isArray(n.next)) return 'nodo';
    ids.add(n.id);
  }
  if (ids.size !== nodes.length) return 'nodos repetidos';
  for (const n of nodes) if (!n.next.every((id: unknown) => typeof id === 'string' && ids.has(id))) return 'camino';
  if (!Array.isArray(x.inventory) || !x.inventory.every((id: unknown) => typeof id === 'string' && id in GEAR)) return 'inventario';
  if (!isObj(x.gear)) return 'gear';
  for (const id of CHAMPION_IDS) {
    const g = x.gear[id];
    if (!isObj(g)) return 'gear de campeón';
    for (const slot of ['weapon', 'armor'] as const) if (g[slot] !== null && !(typeof g[slot] === 'string' && GEAR[g[slot]]?.slot === slot)) return 'gear equipado';
  }
  if (x.currentId !== null && !ids.has(x.currentId)) return 'nodo actual';
  if (!Array.isArray(x.visited) || !x.visited.every((id: unknown) => typeof id === 'string' && ids.has(id))) return 'visitados';
  if (x.status !== 'active') return 'estado';
  if (!isObj(x.wounds) || !CHAMPION_IDS.every((id) => isNum(x.wounds[id]) && x.wounds[id] >= 0 && x.wounds[id] <= CONFIG.expedition.wound.cap)) return 'heridas';
  if (!isNum(x.removals) || x.removals < 0 || !Array.isArray(x.seenEvents) || !isObj(x.stats) || !isNum(x.stats.combats) || !isNum(x.stats.elites)) return 'contadores';
  return null;
}

/** El RNG se guarda como un número (`state`) y se reconstruye al cargar; lo demás son datos planos. */
function revive(x: any): Expedition {
  return { ...x, run: { ...x.run, rng: new Rng(x.run.rng.state) }, shop: null, inCombat: false };
}

/**
 * Guardado local de la expedición en curso, detrás de un almacenamiento intercambiable (localStorage en el navegador).
 * Nunca lanza: sin almacenamiento, sin cuota o con datos corruptos el juego sigue sin guardado.
 */
export function createSaveManager(storage: StorageLike | null, now: () => number = Date.now) {
  const safe = <T>(fn: (s: StorageLike) => T, fallback: T): T => {
    if (!storage) return fallback;
    try {
      return fn(storage);
    } catch {
      return fallback;
    }
  };

  function read(): { raw: string; data: any } | { raw: string; error: string } | null {
    const raw = safe((s) => s.getItem(SAVE_KEY), null);
    if (raw === null) return null;
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      return { raw, error: 'JSON inválido' };
    }
    if (!isObj(data) || data.version !== SAVE_VERSION) return { raw, error: `versión ${isObj(data) ? data.version : '?'} no soportada` };
    const why = problem(data.expedition);
    return why ? { raw, error: why } : { raw, data };
  }

  return {
    save(e: Expedition): void {
      if (e.status !== 'active') return;
      const payload = { version: SAVE_VERSION, savedAt: now(), expedition: { ...e, shop: null } };
      safe((s) => s.setItem(SAVE_KEY, JSON.stringify(payload)), undefined);
    },
    load(): LoadResult {
      const r = read();
      if (!r) return { status: 'none' };
      if ('error' in r) {
        // Copia de seguridad para poder investigarlo, y fuera el guardado roto para no volver a tropezar con él.
        safe((s) => (s.setItem(CORRUPT_KEY, r.raw), s.removeItem(SAVE_KEY)), undefined);
        return { status: 'corrupt', reason: r.error };
      }
      return { status: 'ok', expedition: revive(r.data.expedition) };
    },
    summary(): SaveSummary | null {
      const r = read();
      if (!r || 'error' in r) return null;
      const e = r.data.expedition;
      const cur = e.currentId ? e.map.nodes.find((n: any) => n.id === e.currentId) : null;
      return { floor: cur ? cur.floor + 1 : 0, gold: e.run.gold, champions: e.run.champions.length, savedAt: r.data.savedAt };
    },
    clear(): void {
      safe((s) => s.removeItem(SAVE_KEY), undefined);
    },
  };
}

export type SaveManager = ReturnType<typeof createSaveManager>;

/** localStorage si existe y funciona (puede no existir o lanzar en modo privado); si no, sin guardado. */
export function browserStorage(): StorageLike | null {
  try {
    const s = globalThis.localStorage;
    const probe = '__probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}
