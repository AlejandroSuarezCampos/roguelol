import { CONFIG } from './config';
import type { StatBlock } from './types';

/** Estadísticas de partida: todo 0 salvo el multiplicador de crítico. */
export const DEFAULT_STATS: StatBlock = {
  ad: 0,
  ap: 0,
  critChance: 0,
  critDamage: CONFIG.critMultiplier,
  penetration: 0,
  armor: 0,
  mr: 0,
};

/**
 * Función central de §6.3: base + bonos planos. La UI debe mostrar este mismo resultado.
 * La fase 3 añadirá aquí el gear y los modificadores porcentuales.
 */
export function getFinalStats(base: Partial<StatBlock> = {}, mods: Partial<StatBlock>[] = []): StatBlock {
  const out: StatBlock = { ...DEFAULT_STATS, ...base };
  for (const m of mods) for (const k of Object.keys(m) as (keyof StatBlock)[]) out[k] += m[k] ?? 0;
  return out;
}
