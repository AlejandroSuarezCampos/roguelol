import { cardCost, forcedTarget, ownerOf, whyCannotPlay } from '../engine/cards';
import { intentTarget, intentValue } from '../engine/combat';
import { living } from '../engine/formation';
import type { CardDef, CombatState, Intent, Unit } from '../engine/types';

export interface CardAvailability {
  playable: boolean;
  /** Motivo por el que no se puede jugar (null si se puede). */
  reason: string | null;
  /** Por objetivo posible: null = legal, texto = motivo de que sea ilegal. Vacío si la carta no pide objetivo. */
  targets: Record<string, string | null>;
  /** A quién afecta una carta sin objetivo (propia, de área). */
  affects: string[];
  cost: number;
}

/** Lo que la UI necesita para pintar una carta de la mano y marcar objetivos válidos e ilegales. */
export function cardAvailability(s: CombatState, card: CardDef): CardAvailability {
  const cost = cardCost(s, card);
  const forced = forcedTarget(s, card);
  if (card.target === 'enemy' || card.target === 'ally') {
    const side = card.target === 'enemy' ? 'enemy' : 'ally';
    const targets: Record<string, string | null> = {};
    for (const unit of s.units.filter((x) => x.side === side))
      targets[unit.id] = forced && forced.id !== unit.id ? 'Deriva: va al objetivo marcado' : whyCannotPlay(s, card, unit);
    const legal = Object.values(targets).some((r) => r === null);
    const reason = legal ? null : (Object.values(targets).find((r) => r) ?? 'Sin objetivos');
    return { playable: legal, reason, targets, affects: [], cost };
  }
  const reason = whyCannotPlay(s, card);
  const affects =
    card.target === 'self' ? [ownerOf(s, card).id] : (card.target === 'allEnemies' ? living(s, 'enemy') : living(s, 'ally')).map((x) => x.id);
  return { playable: reason === null, reason, targets: {}, affects, cost };
}

export interface IntentView {
  intent: Intent;
  /** Daño, estrés o bloqueo final (el mismo valor que se aplicará). */
  value: number;
  /** Aliado que recibirá de verdad el golpe o el estrés. */
  target?: Unit;
  lethal: boolean;
  /** Golpe fuerte: al menos un tercio de la vida máxima del objetivo. */
  danger: boolean;
}

export function intentView(s: CombatState, enemy: Unit): IntentView[] {
  return (s.intents[enemy.id] ?? []).map((intent) => {
    const value = intentValue(s, enemy, intent);
    const target = intent.kind === 'attack' || intent.kind === 'stress' ? intentTarget(s, intent.target) : undefined;
    const lethal = intent.kind === 'attack' && !!target && value >= target.hp + target.block;
    const danger = intent.kind === 'attack' && !!target && value >= target.maxHp / 3;
    return { intent, value, target, lethal, danger };
  });
}
