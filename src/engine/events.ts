import { CARD_LIST, CARDS } from '../data/cards';
import { CHAMPIONS } from '../data/champions';
import { EVENTS, type EventChoice, type EventDef, type EventEffect } from '../data/events';
import { CONFIG } from './config';
import { claimPotion, type Expedition } from './expedition';
import { POTIONS } from './potions';
import type { PotionId } from './types';

/** Evento del nodo: al azar con la semilla de la run, sin repetir hasta haberlos visto todos. */
export function pickEvent(e: Expedition): EventDef {
  let pool = EVENTS.filter((x) => !e.seenEvents.includes(x.id));
  if (!pool.length) {
    e.seenEvents = [];
    pool = EVENTS;
  }
  const picked = e.run.rng.pick(pool);
  e.seenEvents.push(picked.id);
  return picked;
}

/** Motivo por el que no se puede elegir la opción (null = se puede). */
export function choiceBlocked(e: Expedition, c: EventChoice): string | null {
  if (c.requiresGold && e.run.gold < c.requiresGold) return `Necesitas ${c.requiresGold} de oro`;
  return null;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function apply(e: Expedition, fx: EventEffect, lines: string[]): void {
  const { run } = e;
  switch (fx.type) {
    case 'gold':
      run.gold = Math.max(0, run.gold + fx.amount);
      lines.push(`${fx.amount > 0 ? '+' : ''}${fx.amount} de oro`);
      break;
    case 'healAll':
      for (const c of run.champions) if (!c.downed) c.hp = Math.min(c.maxHp, c.hp + Math.floor(c.maxHp * fx.fraction));
      lines.push(`El equipo recupera el ${Math.round(fx.fraction * 100)}% de su vida máxima`);
      break;
    case 'damageAll':
      for (const c of run.champions) if (!c.downed) c.hp = Math.max(1, c.hp - fx.amount);
      lines.push(`−${fx.amount} de vida a todos`);
      break;
    case 'stressAll':
      for (const c of run.champions) c.stress = clamp(c.stress + fx.amount, 0, 100);
      lines.push(`${fx.amount > 0 ? '+' : ''}${fx.amount} de estrés a todos`);
      break;
    case 'mist':
      run.mist = clamp(run.mist + fx.amount, 0, 100);
      lines.push(`${fx.amount > 0 ? '+' : ''}${fx.amount} de niebla`);
      break;
    case 'addCard': {
      const pool = CARD_LIST.filter((c) => !fx.rarity || c.rarity === fx.rarity);
      const card = run.rng.pick(pool);
      e.deck.push(card.id);
      lines.push(`Nueva carta: ${CARDS[card.id].name}`);
      break;
    }
    case 'addPotion': {
      const id = run.rng.pick(Object.keys(POTIONS) as PotionId[]);
      lines.push(claimPotion(e, id) === 'added' ? `Nueva poción: ${POTIONS[id].name}` : `Cinturón lleno: pierdes ${POTIONS[id].name}`);
      break;
    }
    case 'wound': {
      const candidates = run.champions.filter((c) => e.wounds[c.id] < CONFIG.expedition.wound.cap);
      if (!candidates.length) {
        lines.push('Todos tienen ya el máximo de heridas');
        break;
      }
      const c = run.rng.pick(candidates);
      e.wounds[c.id]++;
      c.maxHp = Math.round(CHAMPIONS[c.id].maxHp * (1 - CONFIG.expedition.wound.maxHpLoss * e.wounds[c.id]));
      c.hp = Math.min(c.hp, c.maxHp);
      lines.push(`${c.name} sufre una herida grave (vida máxima ${c.maxHp})`);
      break;
    }
  }
}

export interface EventOutcome {
  /** Texto narrativo de la opción. */
  result: string;
  /** Efectos concretos aplicados (lo que de verdad ha pasado). */
  lines: string[];
}

/** Aplica la opción elegida. Lanza un error con el motivo si no se puede. */
export function resolveChoice(e: Expedition, event: EventDef, index: number): EventOutcome {
  const choice = event.choices[index];
  if (!choice) throw new Error('Opción desconocida');
  const why = choiceBlocked(e, choice);
  if (why) throw new Error(why);
  const lines: string[] = [];
  for (const fx of choice.effects) apply(e, fx, lines);
  return { result: choice.result, lines };
}
