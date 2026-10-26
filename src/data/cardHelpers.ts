import type { CardUpgrade, Effect } from '../engine/types';

/** Atajos para escribir efectos de cartas. */
export const phys = (amount: number, over: Partial<Extract<Effect, { type: 'damage' }>> = {}): Effect => ({
  type: 'damage', amount, damageType: 'physical', scaling: { stat: 'ad', ratio: 0.1 }, ...over,
});
export const magic = (amount: number, over: Partial<Extract<Effect, { type: 'damage' }>> = {}): Effect => ({
  type: 'damage', amount, damageType: 'magic', scaling: { stat: 'ap', ratio: 0.1 }, ...over,
});
export const block = (amount: number, on?: 'self'): Effect => ({ type: 'block', amount, on });
export const status = (st: 'mark' | 'stun' | 'charge' | 'vulnerable' | 'burn', stacks: number, on?: 'self'): Effect => ({
  type: 'applyStatus', status: st, stacks, on,
});
export const up = (text: string, extra: Partial<CardUpgrade> = {}): CardUpgrade => ({ text, ...extra });
