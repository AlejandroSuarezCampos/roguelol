import type { ChampionId, CrisisKind } from '../engine/types';

/** Crisis fija y visible de cada campeón (spec de reglas núcleo §3). */
export const CRISIS: Record<ChampionId, CrisisKind> = {
  leona: 'rage',
  yasuo: 'selfish',
  lux: 'panic',
  soraka: 'despair',
};
