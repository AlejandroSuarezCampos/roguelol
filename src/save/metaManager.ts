import { MAX_ASCENSION } from '../data/ascension';
import { CHAMPION_IDS } from '../data/champions';
import { GEAR } from '../data/gear';
import { UNLOCK_BY_ID } from '../data/unlocks';
import { newMeta, type MetaState } from '../engine/meta';
import type { StorageLike } from './saveManager';

export const META_VERSION = 2;
export const META_KEY = 'shattered-runeterra:meta';
export const META_CORRUPT_KEY = 'shattered-runeterra:meta.corrupt';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isObj = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v);

function problem(m: any): string | null {
  if (!isObj(m) || !isNum(m.shards)) return 'Esquirlas';
  if (!Number.isInteger(m.maxAscension) || m.maxAscension < 0 || m.maxAscension > MAX_ASCENSION) return 'Ascensión';
  if (!Array.isArray(m.unlocked) || !m.unlocked.every((id: unknown) => typeof id === 'string' && id in UNLOCK_BY_ID) || new Set(m.unlocked).size !== m.unlocked.length) return 'desbloqueos';
  if (!isObj(m.loadout) || !Object.entries(m.loadout).every(([c, g]) => CHAMPION_IDS.includes(c as never) && typeof g === 'string' && GEAR[g]?.starter && m.unlocked.includes(`starter:${g}`)))
    return 'objetos iniciales';
  if (!isObj(m.bestiary) || !Object.values(m.bestiary).every((b: any) => isObj(b) && isNum(b.seen) && isNum(b.defeated))) return 'bestiario';
  const keys = ['runs', 'victories', 'defeats', 'retreats', 'bestFloor', 'combatsWon', 'deaths'];
  if (!isObj(m.history) || !keys.every((k) => isNum(m.history[k]))) return 'historial';
  return null;
}

/** Lo que costaba cada nivel de las mejoras de la v1 (se devuelve al migrar). */
const V1_PERK_COSTS: Record<string, number[]> = { vigor: [40, 80, 120], provisions: [30, 60, 90], belt: [35, 70, 105], mastery: [50, 100, 150] };

/**
 * v1 → v2: la Ascensión sustituye a Pesadilla (se empieza sin niveles desbloqueados), las muertes cuentan en cualquier nivel y las
 * mejoras de estadísticas desaparecen a favor de los desbloqueos: se devuelven todas las Esquirlas que costaron.
 */
function migrateV1(m: any): any {
  const { nightmareDeaths, ...history } = isObj(m.history) ? m.history : ({} as any);
  const { perks, ...rest } = m;
  const refund = Object.entries(V1_PERK_COSTS).reduce((a, [id, costs]) => a + costs.slice(0, isObj(perks) && Number.isInteger(perks[id]) ? perks[id] : 0).reduce((x, y) => x + y, 0), 0);
  return { ...rest, shards: (isNum(m.shards) ? m.shards : 0) + refund, maxAscension: 0, unlocked: [], loadout: {}, history: { ...history, deaths: nightmareDeaths ?? 0 } };
}

/** Guardado del progreso permanente (Esquirlas, desbloqueos, Ascensión, archivo). Nunca lanza; un guardado dañado se aparta con copia. */
export function createMetaManager(storage: StorageLike | null) {
  const safe = <T>(fn: (s: StorageLike) => T, fallback: T): T => {
    if (!storage) return fallback;
    try {
      return fn(storage);
    } catch {
      return fallback;
    }
  };
  return {
    load(): { meta: MetaState; corrupt: string | null } {
      const raw = safe((s) => s.getItem(META_KEY), null);
      if (raw === null) return { meta: newMeta(), corrupt: null };
      let data: any;
      let why: string | null = null;
      try {
        data = JSON.parse(raw);
        if (isObj(data) && data.version === 1 && isObj(data.meta)) data = { version: META_VERSION, meta: migrateV1(data.meta) };
        if (!isObj(data) || data.version !== META_VERSION) why = `versión ${isObj(data) ? data.version : '?'} no soportada`;
        else why = problem(data.meta);
      } catch {
        why = 'JSON inválido';
      }
      if (why) {
        safe((s) => (s.setItem(META_CORRUPT_KEY, raw), s.removeItem(META_KEY)), undefined);
        return { meta: newMeta(), corrupt: why };
      }
      return { meta: data.meta as MetaState, corrupt: null };
    },
    save(meta: MetaState): void {
      safe((s) => s.setItem(META_KEY, JSON.stringify({ version: META_VERSION, meta })), undefined);
    },
    clear(): void {
      safe((s) => s.removeItem(META_KEY), undefined);
    },
  };
}

export type MetaManager = ReturnType<typeof createMetaManager>;
