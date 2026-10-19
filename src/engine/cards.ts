import { CONFIG } from './config';
import { living, moveUnit } from './formation';
import { addStress } from './stress';
import { applyDamage, gainBlock, heal, revive } from './units';
import type { CardDef, CombatState, Effect, Unit } from './types';

export function ownerOf(s: CombatState, card: CardDef): Unit {
  const u = s.units.find((x) => x.side === 'ally' && x.id === card.owner);
  if (!u) throw new Error(`Sin campeón para ${card.owner}`);
  return u;
}

/** Coste real de la carta (las tareas siguientes añaden modificadores). */
export function cardCost(_s: CombatState, card: CardDef): number {
  return card.cost;
}

/** Motivo por el que no se puede jugar la carta (null = se puede). La UI lo muestra tal cual. */
export function whyCannotPlay(s: CombatState, card: CardDef, target?: Unit): string | null {
  if (s.outcome !== 'ongoing') return 'El combate ha terminado';
  const o = ownerOf(s, card);
  if (o.downed) return `${o.name} está derribado`;
  if (s.energy < cardCost(s, card)) return 'Energía insuficiente';
  if ((s.playedByOwner[card.owner] ?? 0) >= CONFIG.cardsPerChampion)
    return `Límite de ${CONFIG.cardsPerChampion} cartas de ${o.name} este turno`;
  const t = target;
  if (card.target === 'enemy') {
    if (!t) return 'Elige un objetivo';
    if (t.side !== 'enemy') return 'Debe ser un enemigo';
    if (t.downed) return 'Ya derrotado';
  }
  if (card.target === 'ally') {
    if (!t) return 'Elige un objetivo';
    if (t.side !== 'ally') return 'Debe ser un aliado';
    const revives = card.effects.some((e) => e.type === 'revive');
    if (revives && !t.downed) return 'Solo a un aliado derribado';
    if (!revives && t.downed) return 'Derribado: no recibe efectos normales';
  }
  return null;
}

/** Efectos que se resolverán: los de la carta + el bonus si el dueño (no derribado) está en una posición ideal. */
export function effectsFor(s: CombatState, card: CardDef): Effect[] {
  const o = ownerOf(s, card);
  const bonus = !o.downed && card.idealPositions?.includes(o.pos) ? (card.positionBonus ?? []) : [];
  return [...card.effects, ...bonus];
}

export const bonusActive = (s: CombatState, card: CardDef): boolean => effectsFor(s, card).length > card.effects.length;

function targetsOf(s: CombatState, card: CardDef, owner: Unit, t?: Unit): Unit[] {
  switch (card.target) {
    case 'enemy':
    case 'ally':
      return t ? [t] : [];
    case 'self':
      return [owner];
    case 'allEnemies':
      return living(s, 'enemy');
    case 'allAllies':
      return living(s, 'ally');
  }
}

function resolve(s: CombatState, e: Effect, owner: Unit, targets: Unit[]): void {
  for (const u of e.on === 'self' ? [owner] : targets) {
    switch (e.type) {
      case 'damage': {
        let amt = e.amount;
        const crit = !!e.canCrit && owner.critChance > 0 && s.rng.next() < owner.critChance;
        if (crit) amt = Math.floor(amt * CONFIG.critMultiplier);
        applyDamage(s, u, amt, { crit });
        break;
      }
      case 'block':
        gainBlock(u, e.amount);
        break;
      case 'heal':
        heal(u, e.amount);
        break;
      case 'applyStatus':
        if (!u.downed) u.statuses[e.status] = (u.statuses[e.status] ?? 0) + e.stacks;
        break;
      case 'move':
        moveUnit(s, u, e.to ?? u.pos + (e.by ?? 0));
        break;
      case 'reduceStress':
        addStress(s, u, -e.amount);
        break;
      case 'revive':
        revive(u, e.hp);
        break;
    }
  }
}

/** Juega la carta `uid` de la mano. Lanza un error con el motivo si no es legal. */
export function playCard(s: CombatState, uid: string, targetId?: string): void {
  const idx = s.hand.findIndex((c) => c.uid === uid);
  if (idx < 0) throw new Error('La carta no está en la mano');
  const card = s.cards[s.hand[idx].defId];
  const owner = ownerOf(s, card);
  const t = s.units.find((u) => u.id === targetId);
  const why = whyCannotPlay(s, card, t);
  if (why) throw new Error(why);

  s.energy -= cardCost(s, card);
  s.playedByOwner[card.owner] = (s.playedByOwner[card.owner] ?? 0) + 1;
  const [inst] = s.hand.splice(idx, 1);

  const targets = targetsOf(s, card, owner, t);
  for (const e of effectsFor(s, card)) resolve(s, e, owner, targets);

  s.discard.push(inst);
}
