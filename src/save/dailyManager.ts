import type { StorageLike } from './saveManager';

export const DAILY_VERSION = 1;
export const DAILY_KEY = 'shattered-runeterra:daily';
const MAX_ENTRIES = 80;

export interface DailyResult {
  /** Mejor puntuación de ese reto. */
  best: number;
  /** Mejor desenlace: ganar siempre prevalece. */
  won: boolean;
  attempts: number;
  /** Orden de registro (para recortar los más antiguos). */
  last: number;
}

export type DailyRecords = Record<string, DailyResult>;

const isObj = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v);
const valid = (r: any) =>
  isObj(r) && Number.isFinite(r.best) && r.best >= 0 && typeof r.won === 'boolean' && Number.isInteger(r.attempts) && r.attempts > 0 && Number.isFinite(r.last);

/** Guardado local de los resultados de retos diarios y semillas propias. Nunca lanza; los datos dañados se descartan. */
export function createDailyManager(storage: StorageLike | null) {
  const safe = <T>(fn: (s: StorageLike) => T, fallback: T): T => {
    if (!storage) return fallback;
    try {
      return fn(storage);
    } catch {
      return fallback;
    }
  };
  return {
    load(): DailyRecords {
      const raw = safe((s) => s.getItem(DAILY_KEY), null);
      if (raw === null) return {};
      try {
        const d = JSON.parse(raw);
        if (!isObj(d) || d.version !== DAILY_VERSION || !isObj(d.records)) return {};
        return Object.fromEntries(Object.entries(d.records).filter(([, r]) => valid(r))) as DailyRecords;
      } catch {
        return {};
      }
    },
    save(records: DailyRecords): void {
      const keep = Object.entries(records).sort((a, b) => b[1].last - a[1].last).slice(0, MAX_ENTRIES);
      safe((s) => s.setItem(DAILY_KEY, JSON.stringify({ version: DAILY_VERSION, records: Object.fromEntries(keep) })), undefined);
    },
  };
}

export type DailyManager = ReturnType<typeof createDailyManager>;

/** Anota un intento: conserva la mejor puntuación y que alguna vez se ganó. */
export function recordDaily(records: DailyRecords, key: string, score: number, won: boolean, now = Date.now()): void {
  const r = records[key];
  records[key] = { best: Math.max(r?.best ?? 0, score), won: (r?.won ?? false) || won, attempts: (r?.attempts ?? 0) + 1, last: now };
}

/** Días seguidos (hasta hoy o ayer) con el reto del día ganado. */
export function streakOf(records: DailyRecords, today: string): number {
  const day = (k: string) => new Date(`${k}T12:00:00`);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let d = day(today);
  if (!records[today]?.won) d.setDate(d.getDate() - 1);
  let n = 0;
  while (records[fmt(d)]?.won) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
