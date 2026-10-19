import { CONFIG } from './config';
import type { CombatState, Pos, Side, Unit } from './types';

export const living = (s: CombatState, side: Side): Unit[] => s.units.filter((u) => u.side === side && !u.downed);
export const unitAt = (s: CombatState, side: Side, pos: Pos): Unit | undefined =>
  s.units.find((u) => u.side === side && u.pos === pos);
export const byPos = (units: Unit[]): Unit[] => [...units].sort((a, b) => a.pos - b.pos);

const inBounds = (p: number): p is Pos => p >= 1 && p <= 4;

/** Mueve `unit` a `to`. Si está ocupada, intercambia. Fuera de 1–4 no hace nada. Devuelve si se movió. */
export function moveUnit(s: CombatState, unit: Unit, to: number): boolean {
  if (!inBounds(to) || to === unit.pos) return false;
  const other = unitAt(s, unit.side, to);
  if (other) other.pos = unit.pos;
  unit.pos = to;
  return true;
}

/** Motivo por el que no se puede intercambiar (null = se puede). */
export function canSwap(s: CombatState, a: Pos, b: Pos): string | null {
  if (Math.abs(a - b) !== 1) return 'No son adyacentes';
  if (s.swapUsed) return 'Ya intercambiaste este turno';
  if (s.energy < CONFIG.swapCost) return 'Energía insuficiente';
  if (!unitAt(s, 'ally', a) && !unitAt(s, 'ally', b)) return 'Posición vacía';
  return null;
}

/**
 * Intercambio de dos posiciones adyacentes: una vez por turno, por energía; no cuenta como carta.
 * Si una de las dos está vacía (un campeón murió en Pesadilla) el aliado simplemente se mueve a ella.
 */
export function swapAllies(s: CombatState, a: Pos, b: Pos): void {
  const why = canSwap(s, a, b);
  if (why) throw new Error(why);
  const ua = unitAt(s, 'ally', a);
  const ub = unitAt(s, 'ally', b);
  if (ua) ua.pos = b;
  if (ub) ub.pos = a;
  s.energy -= CONFIG.swapCost;
  s.swapUsed = true;
}
