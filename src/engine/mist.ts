import { CONFIG } from './config';
import type { CombatMods } from './types';

export type MistTier = 'haze' | 'mist' | 'dense' | 'ruin';
export type NodeType = 'combat' | 'elite' | 'boss' | 'rest' | 'shop' | 'event' | 'chest' | 'shrine';

/** 0–29 Bruma, 30–59 Niebla, 60–89 Niebla densa, 90–100 Ruina. */
export function mistTier(v: number): MistTier {
  const t = CONFIG.mist.tiers;
  if (v >= t.ruin) return 'ruin';
  if (v >= t.dense) return 'dense';
  if (v >= t.mist) return 'mist';
  return 'haze';
}

export const tierRank: Record<MistTier, number> = { haze: 0, mist: 1, dense: 2, ruin: 3 };

export const mistGain = (type: NodeType): number => (type === 'elite' ? CONFIG.mist.elite : CONFIG.mist.node);

/** Efectos acumulativos de los tramos sobre un combate. */
export function combatMods(mist: number, boss = false): CombatMods {
  const r = tierRank[mistTier(mist)];
  return {
    intentStressBonus: r >= 1 ? CONFIG.mist.intentStressBonus : 0,
    startShadowMark: r >= 2,
    hpMultiplier: r >= 3 ? CONFIG.mist.ruinHpMultiplier : 1,
    bossExtraIntent: boss && mist >= CONFIG.mist.bossExtraIntentAt,
  };
}
