import { CONFIG } from './config';
import { living } from './formation';
import { addStress } from './stress';
import type { CombatState, Unit } from './types';

export function checkOutcome(s: CombatState): void {
  if (living(s, 'enemy').length === 0) s.outcome = 'won';
  else if (living(s, 'ally').length === 0) s.outcome = 'lost';
}

/**
 * Única ruta de daño: bloqueo primero, luego vida. Gestiona el derribo y el estrés que provoca
 * (crítico recibido, caída de un aliado, enemigo derrotado). Devuelve el daño que llegó a la vida.
 */
export function applyDamage(s: CombatState, target: Unit, amount: number, opts: { crit?: boolean } = {}): number {
  if (target.downed || amount <= 0) return 0;
  const absorbed = Math.min(target.block, amount);
  target.block -= absorbed;
  const toHp = amount - absorbed;
  target.hp = Math.max(0, target.hp - toHp);
  if (opts.crit) addStress(s, target, CONFIG.stress.critHit);
  if (target.hp === 0) {
    target.downed = true;
    target.block = 0;
    if (target.side === 'ally') s.relicQueue.push({ type: 'championDowned', unit: target.id });
    const delta = target.side === 'ally' ? CONFIG.stress.allyDowned : CONFIG.stress.enemyDefeated;
    for (const a of living(s, 'ally')) addStress(s, a, delta);
  }
  checkOutcome(s);
  return toHp;
}

/** Curación normal: nunca afecta a derribados (§5.5). Devuelve lo curado. */
export function heal(target: Unit, amount: number): number {
  if (target.downed) return 0;
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  return target.hp - before;
}

export function gainBlock(target: Unit, amount: number): void {
  if (!target.downed) target.block += amount;
}

/** Solo un efecto `revive` explícito levanta a un derribado. */
export function revive(target: Unit, hp: number): boolean {
  if (!target.downed) return false;
  target.downed = false;
  target.hp = Math.min(target.maxHp, hp);
  return true;
}
