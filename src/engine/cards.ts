import { applyUpgrade } from '../data/cards';
import { CONFIG } from './config';
import { computeDamage } from './damage';
import { byPos, living, moveUnit } from './formation';
import { processRelics } from './relics';
import { addStress } from './stress';
import { applyDamage, gainBlock, heal, revive } from './units';
import type { CardDef, CardInstance, ChampionId, CombatState, Effect, Unit } from './types';

/** Definición efectiva de una carta en mano: aplica su mejora si la instancia está mejorada. */
export function cardOf(s: CombatState, inst: CardInstance): CardDef {
  const def = s.cards[inst.defId];
  return inst.upgraded ? applyUpgrade(def) : def;
}

/** Una carta es «de AP» si alguno de sus efectos de daño escala con AP. */
export const isApCard = (card: CardDef): boolean =>
  card.effects.some((e) => e.type === 'damage' && e.scaling?.stat === 'ap');

export function ownerOf(s: CombatState, card: CardDef): Unit {
  const u = s.units.find((x) => x.side === 'ally' && x.id === card.owner);
  if (!u) throw new Error(`Sin campeón para ${card.owner}`);
  return u;
}

const crisisOf = (u: Unit) => (u.crisisActive ? u.crisis : undefined);

/** Coste real: base, +1 con el Presagio «Peso» si el dueño está derribado, −1 en Egoísmo. */
export function cardCost(s: CombatState, card: CardDef): number {
  const o = ownerOf(s, card);
  let c = card.cost;
  if (o.downed && s.omen === 'weight') c += CONFIG.omen.weightCost;
  if (crisisOf(o) === 'selfish') c -= 1;
  return Math.max(0, c);
}

/** Objetivo forzado por el Presagio «Deriva» (la UI lo marca antes de confirmar). */
export function forcedTarget(s: CombatState, card: CardDef): Unit | undefined {
  if (s.omen !== 'drift' || !ownerOf(s, card).downed) return undefined;
  if (card.target === 'enemy') return byPos(living(s, 'enemy'))[0];
  if (card.target === 'ally') return [...living(s, 'ally')].sort((a, b) => a.hp - b.hp || a.pos - b.pos)[0];
  return undefined;
}

/** Motivo por el que no se puede jugar la carta (null = se puede). La UI lo muestra tal cual. */
export function whyCannotPlay(s: CombatState, card: CardDef, target?: Unit): string | null {
  if (s.outcome !== 'ongoing') return 'El combate ha terminado';
  const o = ownerOf(s, card);
  if (s.energy < cardCost(s, card)) return 'Energía insuficiente';
  if ((s.playedByOwner[card.owner] ?? 0) >= CONFIG.cardsPerChampion)
    return `Límite de ${CONFIG.cardsPerChampion} cartas de ${o.name} este turno`;
  if (crisisOf(o) === 'panic' && card.type === 'attack') return `${o.name} en Pánico: no puede atacar`;
  const selfish = living(s, 'ally').find((u) => crisisOf(u) === 'selfish');
  if (selfish && selfish.id !== card.owner && s.otherCardsWhileSelfish >= 1)
    return `${selfish.name} en Egoísmo: solo 1 carta de otro campeón por turno`;
  const t = forcedTarget(s, card) ?? target;
  if (card.target === 'enemy') {
    if (!t) return 'Elige un objetivo';
    if (t.side !== 'enemy') return 'Debe ser un enemigo';
    if (t.downed) return 'Ya derrotado';
  }
  if (card.target === 'ally') {
    if (!t) return 'Elige un objetivo';
    if (t.side !== 'ally') return 'Debe ser un aliado';
    if (crisisOf(o) === 'rage') return `${o.name} en Ira: no puede apuntar a aliados`;
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

/** Roba `n` cartas; sin mazo de robo baraja el descarte. La mano no pasa de `CONFIG.maxHand`. */
export function drawCards(s: CombatState, n: number): void {
  for (let i = 0; i < n && s.hand.length < CONFIG.maxHand; i++) {
    if (!s.drawPile.length) {
      if (!s.discard.length) return;
      s.drawPile = s.rng.shuffle(s.discard);
      s.discard = [];
    }
    s.hand.push(s.drawPile.shift()!);
  }
}

function resolve(s: CombatState, e: Effect, owner: Unit, targets: Unit[]): void {
  // Efectos del lanzador que no dependen de los objetivos: se resuelven una sola vez.
  if (e.type === 'draw') return drawCards(s, e.amount);
  if (e.type === 'convertStatus') {
    const stacks = owner.statuses[e.status] ?? 0;
    delete owner.statuses[e.status];
    gainBlock(owner, stacks * e.perStack);
    if (stacks > 0) s.relicQueue.push({ type: 'statusConsumed', owner: owner.id as ChampionId, status: e.status, stacks });
    return;
  }
  for (const u of e.on === 'self' ? [owner] : targets) {
    switch (e.type) {
      case 'damage': {
        let additive = crisisOf(owner) === 'rage' ? CONFIG.crisis.rageDamage : 0;
        if (e.consumeStatus) {
          const holder = e.consumeStatus.from === 'self' ? owner : u;
          const stacks = holder.statuses[e.consumeStatus.status] ?? 0;
          additive += stacks * e.consumeStatus.bonusPerStack;
          delete holder.statuses[e.consumeStatus.status];
          if (stacks > 0) s.relicQueue.push({ type: 'statusConsumed', owner: owner.id as ChampionId, status: e.consumeStatus.status, stacks });
        }
        const hit = computeDamage(s, owner, u, {
          amount: e.amount, damageType: e.damageType, scaling: e.scaling, additive, crit: e.canCrit ? 'roll' : undefined,
        });
        applyDamage(s, u, hit.amount, { crit: hit.crit });
        break;
      }
      case 'block':
        gainBlock(u, e.amount);
        break;
      case 'heal':
        heal(u, crisisOf(owner) === 'despair' ? Math.floor(e.amount * CONFIG.crisis.despairHealFactor) : e.amount);
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
  const card = cardOf(s, s.hand[idx]);
  const owner = ownerOf(s, card);
  const t = forcedTarget(s, card) ?? s.units.find((u) => u.id === targetId);
  const why = whyCannotPlay(s, card, t);
  if (why) throw new Error(why);

  const ownerWasDowned = owner.downed;
  const selfish = living(s, 'ally').find((u) => crisisOf(u) === 'selfish');
  s.energy -= cardCost(s, card);
  s.playedByOwner[card.owner] = (s.playedByOwner[card.owner] ?? 0) + 1;
  if (selfish && selfish.id !== card.owner) s.otherCardsWhileSelfish++;
  const [inst] = s.hand.splice(idx, 1);

  const targets = targetsOf(s, card, owner, t);
  for (const e of effectsFor(s, card)) resolve(s, e, owner, targets);
  if (s.pendingApMark && isApCard(card)) {
    for (const u of targets) if (u.side === 'enemy' && !u.downed) u.statuses.mark = (u.statuses.mark ?? 0) + s.pendingApMark;
    s.pendingApMark = 0;
  }

  // Estrés que genera la propia carta; la virtud del dueño lo anula.
  if (!owner.virtueActive) {
    if (crisisOf(owner) === 'despair') addStress(s, owner, CONFIG.crisis.despairSelfStress);
    if (ownerWasDowned && s.omen === 'lament') for (const a of living(s, 'ally')) addStress(s, a, CONFIG.omen.lamentStress);
  }
  if (ownerWasDowned && s.omen === 'bleed') {
    const front = byPos(living(s, 'ally'))[0];
    if (front) applyDamage(s, front, CONFIG.omen.bleedDamage);
  }
  s.discard.push(inst);

  // Reliquias: contadores del turno y evento de carta jugada; después se vacía la cola.
  if (card.type === 'attack') s.relicState.attacksThisTurn++;
  if (!s.relicState.ownersThisTurn.includes(card.owner)) s.relicState.ownersThisTurn.push(card.owner);
  s.relicQueue.push({ type: 'cardPlayed', owner: card.owner, cardType: card.type });
  processRelics(s);
}
