import { CONFIG } from './config';
import type { CombatState, Unit } from './types';

export type StressTier = 'calm' | 'uneasy' | 'overwhelmed' | 'edge' | 'crisis';

/** Umbrales de §10.1: 0–24 sereno, 25–49 inquieto, 50–74 agobiado, 75–99 al límite, 100 crisis. */
export function stressTier(v: number): StressTier {
  if (v >= 100) return 'crisis';
  if (v >= 75) return 'edge';
  if (v >= 50) return 'overwhelmed';
  if (v >= 25) return 'uneasy';
  return 'calm';
}

/**
 * Cambia el estrés de un aliado (0–100). Al alcanzar 100 tira con el RNG de la run:
 * por debajo de `virtueChance` → virtud (baja a 50); si no → crisis (queda en 100).
 * La crisis termina en cuanto el estrés baja de 100.
 */
export function addStress(s: CombatState, u: Unit, delta: number): void {
  if (u.side !== 'ally' || delta === 0) return;
  const before = u.stress;
  u.stress = Math.max(0, Math.min(CONFIG.stress.max, u.stress + delta));
  if (before < CONFIG.stress.max && u.stress === CONFIG.stress.max && !u.crisisActive) {
    if (s.rng.next() < CONFIG.stress.virtueChance) {
      u.virtueActive = true;
      u.stress = CONFIG.stress.virtueResetTo;
    } else {
      u.crisisActive = true;
    }
  }
  if (u.crisisActive && u.stress < CONFIG.stress.max) u.crisisActive = false;
}
