import { MAX_ASCENSION } from '../data/ascension';
import { PERK_IDS } from '../data/perks';
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
  if (!isObj(m.perks) || !PERK_IDS.every((id) => Number.isInteger(m.perks[id]) && m.perks[id] >= 0 && m.perks[id] <= 3)) return 'mejoras';
  if (!isObj(m.bestiary) || !Object.values(m.bestiary).every((b: any) => isObj(b) && isNum(b.seen) && isNum(b.defeated))) return 'bestiario';
  const keys = ['runs', 'victories', 'defeats', 'retreats', 'bestFloor', 'combatsWon', 'deaths'];
  if (!isObj(m.history) || !keys.every((k) => isNum(m.history[k]))) return 'historial';
  return null;
}

/** v1 → v2: la Ascensión sustituye a Pesadilla (se empieza sin niveles desbloqueados) y las muertes cuentan en cualquier nivel. */
function migrateV1(m: any): any {
  const { nightmareDeaths, ...history } = isObj(m.history) ? m.history : ({} as any);
  return { ...m, maxAscension: 0, history: { ...history, deaths: nightmareDeaths ?? 0 } };
}

/** Guardado del progreso permanente (Esquirlas, mejoras, archivo). Nunca lanza; un guardado dañado se aparta con copia. */
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
