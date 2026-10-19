import { CONFIG } from './config';
import type { CombatState, DamageType, Unit } from './types';

export interface DamageSpec {
  amount: number;
  damageType: DamageType;
  scaling?: { stat: 'ad' | 'ap'; ratio: number };
  /** Suma plana tras el escalado (crisis Ira, bonus de posición enemigo, consumo de estados). */
  additive?: number;
  /** `roll`: tira con critChance del lanzador; `always`: crítico telegrafiado (intenciones). */
  crit?: 'roll' | 'always';
}

/**
 * Calcula el daño de un golpe siguiendo §5.4: base + escalado → aditivos → crítico →
 * penetración → mitigación por defensa → vulnerable → redondeo hacia abajo (mínimo 0).
 * No aplica el daño: eso lo hace `applyDamage` (bloqueo y luego vida).
 */
export function computeDamage(s: CombatState, source: Unit, target: Unit, d: DamageSpec): { amount: number; crit: boolean } {
  let dmg = d.amount + (d.scaling ? source.stats[d.scaling.stat] * d.scaling.ratio : 0) + (d.additive ?? 0);
  const crit =
    d.crit === 'always' || (d.crit === 'roll' && source.stats.critChance > 0 && s.rng.next() < source.stats.critChance);
  if (crit) dmg *= source.stats.critDamage;
  if (d.damageType !== 'true') {
    const defense = d.damageType === 'physical' ? target.stats.armor : target.stats.mr;
    const effective = Math.max(0, defense - source.stats.penetration);
    dmg = (dmg * CONFIG.defenseScale) / (CONFIG.defenseScale + effective);
  }
  if (target.statuses.vulnerable) dmg *= 1 + CONFIG.status.vulnerableBonus;
  return { amount: Math.max(0, Math.floor(dmg)), crit };
}
