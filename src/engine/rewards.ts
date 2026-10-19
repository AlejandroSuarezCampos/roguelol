import { CONFIG } from './config';
import { mistTier, tierRank, type NodeType } from './mist';
import type { RunState } from './run';

export interface Rewards {
  gold: number;
  cardOptions: number;
  relics: number;
}

/** Probabilidad de obtener al menos una reliquia (para la vista previa del nodo y el botín). */
export function relicChanceFor(type: NodeType, mist: number): number {
  if (type === 'elite') return 1;
  if (type === 'combat' && mistTier(mist) === 'ruin') return CONFIG.mist.ruinNormalRelicChance;
  return 0;
}

/** Botín de un combate según la niebla actual. Toda élite da 1 reliquia (2 en Ruina). */
export function rollRewards(run: RunState, type: 'combat' | 'elite' | 'boss', baseGold: number): Rewards {
  const tier = mistTier(run.mist);
  const r = tierRank[tier];
  const gold = Math.round(baseGold * (r >= 1 ? 1 + CONFIG.mist.goldBonus : 1));
  const cardOptions = r >= 2 ? CONFIG.mist.denseCardOptions : CONFIG.mist.baseCardOptions;
  let relics = 0;
  if (type === 'elite') relics = tier === 'ruin' ? 2 : 1;
  else if (type === 'combat' && tier === 'ruin' && run.rng.next() < CONFIG.mist.ruinNormalRelicChance) relics = 1;
  return { gold, cardOptions, relics };
}
