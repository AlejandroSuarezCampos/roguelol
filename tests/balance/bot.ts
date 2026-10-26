import { CARDS } from '../../src/data/cards';
import { cardCost, cardOf, forcedTarget, playCard, whyCannotPlay } from '../../src/engine/cards';
import { endTeamTurn } from '../../src/engine/combat';
import { living } from '../../src/engine/formation';
import { Rng } from '../../src/engine/rng';
import type { CardDef, CombatState, Unit } from '../../src/engine/types';
import type { Expedition } from '../../src/engine/expedition';
import { advanceAct, availableNodes, claimBossRelic, claimCard, claimGear, claimPotion, claimRewards, livingWounds, combatFromExpedition, encounterKind, enterNode, finishCombat, rest } from '../../src/engine/expedition';
import { openChest, takeChestOffer } from '../../src/engine/chest';
import { choiceBlocked, pickEvent, resolveChoice } from '../../src/engine/events';
import { compareGear, equip } from '../../src/engine/gear';
import type { ChampionId } from '../../src/engine/types';
import { POTIONS, usePotion, usePotionOnMap, whyCannotUse } from '../../src/engine/potions';
import { buyCard, buyPotion, buyRelic, openShop } from '../../src/engine/shop';

interface Option {
  uid: string;
  target?: string;
  score: number;
}

/** Puntúa una jugada con una heurística de jugador mediocre: ataca al más débil, protege al herido, cura al que lo necesita. */
function score(s: CombatState, card: CardDef, t: Unit | undefined, rng: Rng): number {
  const owner = s.units.find((u) => u.id === card.owner)!;
  const cost = cardCost(s, card);
  let v = 1 + rng.next() * 2;
  for (const e of card.effects) {
    if (e.type === 'damage' && e.on !== 'self') {
      const dmg = e.amount + (e.scaling ? owner.stats[e.scaling.stat] * e.scaling.ratio : 0);
      v += dmg * (card.target === 'allEnemies' ? living(s, 'enemy').length : 1) * 0.6;
      if (t && t.hp <= dmg) v += 8;
    }
    if (e.type === 'block') {
      const who = e.on === 'self' || card.target === 'self' ? owner : t ?? owner;
      v += who.hp < who.maxHp * 0.5 ? e.amount * 0.7 : e.amount * 0.3;
    }
    if (e.type === 'heal') v += t ? Math.min(e.amount, t.maxHp - t.hp) * 0.8 : 3;
    if (e.type === 'reduceStress') v += t ? (t.stress >= 50 ? t.stress * 0.4 : -2) : 0;
    if (e.type === 'applyStatus') v += 2;
    if (e.type === 'revive') v += t?.downed ? 30 : -50;
    if (e.type === 'draw') v += 3 * e.amount;
    if (e.type === 'convertStatus') v += (owner.statuses[e.status] ?? 0) * e.perStack * 0.4;
  }
  return v / Math.max(1, cost + 0.5);
}

/** Bebe una poción curativa si alguien está por debajo del 40 % y usa hierro en el más débil; la brujería se usa al empezar. */
function usePotions(s: CombatState): void {
  s.belt.forEach((p, slot) => {
    if (!p || p.spent) return;
    const hurt = living(s, 'ally').filter((a) => a.hp < a.maxHp * 0.4).sort((a, b) => a.hp - b.hp)[0];
    const info = POTIONS[p.id];
    if (info.healing && hurt && whyCannotUse(s.belt, slot, hurt) === null) usePotion(s, slot, hurt.id);
    else if (p.id === 'iron' && hurt && whyCannotUse(s.belt, slot, hurt) === null) usePotion(s, slot, hurt.id);
    else if (p.id === 'sorcery' && s.turn === 1) usePotion(s, slot);
  });
}

export function playTurn(s: CombatState, rng: Rng): void {
  usePotions(s);
  for (let guard = 0; guard < 20 && s.outcome === 'ongoing'; guard++) {
    const options: Option[] = [];
    for (const inst of s.hand) {
      const card = cardOf(s, inst);
      const targets: (Unit | undefined)[] =
        card.target === 'enemy' ? living(s, 'enemy') : card.target === 'ally' ? s.units.filter((u) => u.side === 'ally') : [undefined];
      for (const t of targets) {
        const forced = forcedTarget(s, card);
        if (whyCannotPlay(s, card, forced ?? t) === null && (card.cost > 0 || cardCost(s, card) >= 0))
          options.push({ uid: inst.uid, target: t?.id, score: score(s, card, forced ?? t, rng) });
      }
    }
    if (!options.length) return;
    options.sort((a, b) => b.score - a.score);
    if (options[0].score < 1.2) return;
    playCard(s, options[0].uid, options[0].target);
  }
}

/** Juega un combate entero. Devuelve el resultado y los turnos usados. */
export function fight(s: CombatState, rng: Rng, maxTurns = 40): { outcome: CombatState['outcome']; turns: number } {
  while (s.outcome === 'ongoing' && s.turn <= maxTurns) {
    playTurn(s, rng);
    if (s.outcome === 'ongoing') endTeamTurn(s);
  }
  if (s.outcome === 'ongoing') s.outcome = 'lost'; // tablas: se da por perdido para que finishCombat pueda cerrarlo
  return { outcome: s.outcome, turns: s.turn };
}

export interface RunReport {
  status: Expedition['status'];
  floorReached: number;
  fights: { kind: string; won: boolean; turns: number }[];
}

/** Juega una expedición entera con el bot: elige nodos al azar, descansa curando o calmando, coge una carta al azar. */
export function playExpedition(e: Expedition, seed: number): RunReport {
  const rng = new Rng(seed);
  const report: RunReport = { status: 'active', floorReached: 0, fights: [] };
  while (e.status === 'active') {
    const options = availableNodes(e);
    if (!options.length) break;
    const node = rng.pick(options);
    enterNode(e, node.id);
    report.floorReached = e.act * 15 + node.floor;
    const kind = encounterKind(node.type);
    drinkOnMap(e);
    if (kind) {
      const s = combatFromExpedition(e, kind);
      const r = fight(s, rng);
      report.fights.push({ kind, won: r.outcome === 'won', turns: r.turns });
      const rewards = finishCombat(e, s, kind);
      if (rewards) {
        claimRewards(e, rewards);
        claimCard(e, rng.next() < 0.7 ? rng.pick(rewards.cards) : null);
        if (rewards.potion) claimPotion(e, rewards.potion);
        if (rewards.gear) {
          claimGear(e, bestGear(e, rewards.gear));
          equipBest(e);
        }
        if (rewards.bossRelics?.length) claimBossRelic(e, rewards.bossRelics, rng.pick(rewards.bossRelics));
        if (e.actCleared) advanceAct(e);
      }
    } else if (node.type === 'shop') {
      visitShop(e, rng);
    } else if (node.type === 'chest') {
      openChest(e);
      takeChestOffer(e, 0);
    } else if (node.type === 'event' || node.type === 'shrine') {
      const ev = pickEvent(e, node.type);
      const ok = ev.choices.map((c, i) => ({ c, i })).filter(({ c }) => !choiceBlocked(e, c));
      resolveChoice(e, ev, rng.pick(ok).i);
    } else if (node.type === 'rest') {
      const hurt = e.run.champions.some((c) => c.hp < c.maxHp * 0.7 || c.downed);
      const wounded = livingWounds(e) > 0;
      if (hurt) rest(e, 'heal');
      else if (e.run.champions.some((c) => c.stress >= 40)) rest(e, 'calm');
      else if (wounded) rest(e, 'treat');
      else {
        const options = e.deck.map((id, i) => ({ id, i })).filter((x) => !x.id.endsWith('+'));
        if (options.length) rest(e, 'upgrade', rng.pick(options).i);
        else rest(e, 'heal');
      }
    }
  }
  report.status = e.status;
  return report;
}

/** Lo que le importa a cada campeón: pesos por estadística para decidir quién se queda con un objeto. */
const WEIGHTS: Record<ChampionId, Record<string, number>> = {
  leona: { hp: 0.5, armor: 1, mr: 0.8, ad: 0.5 },
  yasuo: { ad: 1, critChance: 60, critDamage: 30, penetration: 0.6, hp: 0.2 },
  lux: { ap: 1, hp: 0.2, mr: 0.3 },
  soraka: { ap: 0.7, hp: 0.4, mr: 0.4 },
  lulu: { ap: 0.8, hp: 0.3, mr: 0.4 },
  janna: { ap: 0.7, hp: 0.4, mr: 0.4 },
  nami: { ap: 0.8, hp: 0.3, mr: 0.4 },
  sona: { ap: 0.7, hp: 0.4, mr: 0.4 },
  thresh: { ad: 0.3, ap: 0.3, armor: 0.8, mr: 0.6, hp: 0.5 },
  alistar: { hp: 0.5, armor: 1, mr: 0.8, ad: 0.4 },
  bard: { ap: 0.7, hp: 0.4, mr: 0.4 },
  blitzcrank: { ad: 0.8, hp: 0.4, armor: 0.7, mr: 0.5 },
  braum: { hp: 0.5, armor: 1, mr: 0.8, ad: 0.4 },
  karma: { ap: 0.7, hp: 0.4, mr: 0.4 },
  milio: { ap: 0.7, hp: 0.4, mr: 0.4 },
  nautilus: { hp: 0.5, armor: 1, mr: 0.8, ad: 0.4 },
  pyke: { ad: 1, critChance: 60, critDamage: 30, penetration: 0.6, hp: 0.2 },
  rakan: { ap: 0.8, hp: 0.4, mr: 0.4 },
  rell: { hp: 0.5, armor: 1, mr: 0.8, ad: 0.4 },
  renata: { ap: 0.7, hp: 0.4, mr: 0.4 },
  senna: { ad: 1, critChance: 60, critDamage: 30, penetration: 0.6, hp: 0.2 },
  seraphine: { ap: 0.7, hp: 0.4, mr: 0.4 },
  taric: { ap: 0.4, armor: 0.8, mr: 0.6, hp: 0.5 },
  yuumi: { ap: 0.7, hp: 0.4, mr: 0.4 },
  zilean: { ap: 1, hp: 0.2, mr: 0.3 },
  zyra: { ap: 1, hp: 0.2, mr: 0.3 },
  morgana: { ap: 0.7, hp: 0.4, mr: 0.4 },
};

function gearScore(e: Expedition, champ: ChampionId, gearId: string): number {
  const d = compareGear(e, champ, gearId);
  const w = WEIGHTS[champ];
  return Object.entries({ ...d.stats, hp: d.hp }).reduce((a, [k, v]) => a + (w[k] ?? 0) * (v as number), 0);
}

const aliveIds = (e: Expedition): ChampionId[] => e.run.champions.map((c) => c.id);

/** Equipa cada objeto del inventario en quien más gane con él (si alguien gana). */
function equipBest(e: Expedition): void {
  for (const id of [...e.inventory]) {
    const best = aliveIds(e).map((c) => ({ c, s: gearScore(e, c, id) })).sort((a, b) => b.s - a.s)[0];
    if (!best || best.s <= 0) continue;
    try {
      equip(e, best.c, id);
    } catch {
      /* quitarle vida lo dejaría a 0: lo equipa más tarde */
    }
  }
}

/** Mejor opción de un botín de gear (la que más sube a su mejor destinatario). */
function bestGear(e: Expedition, options: string[]): string {
  const best = (id: string) => Math.max(...aliveIds(e).map((c) => gearScore(e, c, id)));
  return [...options].sort((a, b) => best(b) - best(a))[0];
}

/** Antes de cada nodo bebe pociones curativas si alguien está por debajo del 50 %. */
function drinkOnMap(e: Expedition): void {
  e.run.belt.forEach((p, slot) => {
    if (!p || p.spent || !POTIONS[p.id].healing) return;
    const hurt = e.run.champions.filter((c) => !c.downed && c.hp < c.maxHp * 0.5).sort((a, b) => a.hp - b.hp)[0];
    if (hurt) usePotionOnMap(e.run.belt, slot, hurt);
  });
}

/** Compra alguna reliquia, pociones curativas y, con lo que sobre, cartas (nunca deja el oro por debajo de 0). */
function visitShop(e: Expedition, rng: Rng): void {
  const shop = openShop(e);
  const tryBuy = (fn: () => void) => {
    try {
      fn();
    } catch {
      /* sin oro o sin hueco: el bot simplemente no compra */
    }
  };
  shop.relics.forEach((_, i) => rng.next() < 0.5 && tryBuy(() => buyRelic(e, i)));
  shop.potions.forEach((p, i) => POTIONS[p.id].healing && !p.sold && tryBuy(() => buyPotion(e, i)));
  rng.shuffle(shop.cards.map((_, i) => i)).forEach((i) => rng.next() < 0.7 && tryBuy(() => buyCard(e, i)));
}

export const cardName = (id: string) => CARDS[id].name;
