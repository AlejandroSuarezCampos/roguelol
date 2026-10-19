import { RELICS, type AllyTarget, type RelicEffect } from '../data/relics';
import { CONFIG } from './config';
import type { Expedition } from './expedition';
import { byPos, living } from './formation';
import { addStress } from './stress';
import { applyDamage, gainBlock } from './units';
import type { ChampionId, CombatState, RelicEvent, RelicState, Unit } from './types';

export const newRelicState = (): RelicState => ({ attacksThisTurn: 0, ownersThisTurn: [], turnUses: {}, combatUses: {} });

/** Quién protagoniza el evento (para los efectos con `to: 'owner' | 'others'`). */
function ownerOf(s: CombatState, ev: RelicEvent): Unit | undefined {
  const id = ev.type === 'cardPlayed' || ev.type === 'statusConsumed' ? ev.owner : ev.type === 'championDowned' ? ev.unit : undefined;
  return id ? s.units.find((u) => u.id === id) : undefined;
}

function allies(s: CombatState, to: AllyTarget, owner?: Unit): Unit[] {
  const alive = living(s, 'ally');
  if (to === 'allies') return alive;
  if (to === 'owner') return owner && !owner.downed ? [owner] : [];
  return alive.filter((u) => u !== owner);
}

function apply(s: CombatState, fx: RelicEffect, ev: RelicEvent): void {
  const owner = ownerOf(s, ev);
  switch (fx.type) {
    case 'block':
      for (const u of allies(s, fx.to, owner)) gainBlock(u, fx.amount);
      break;
    case 'stress':
      for (const u of allies(s, fx.to, owner)) addStress(s, u, fx.amount);
      break;
    case 'damage': {
      const amount = fx.amount * (fx.perStack && ev.type === 'statusConsumed' ? ev.stacks : 1);
      const foes = byPos(living(s, 'enemy'));
      const targets = fx.to === 'allEnemies' ? foes : foes.length ? [[...foes].sort((a, b) => a.hp - b.hp || a.pos - b.pos)[0]] : [];
      for (const u of targets) applyDamage(s, u, amount);
      break;
    }
    case 'energy':
      s.energy += fx.amount;
      break;
    case 'emit':
      s.relicQueue.push(fx.event);
      break;
  }
}

/**
 * Vacía la cola de eventos de reliquias. Cada reliquia escucha su evento, comprueba su condición y su límite y aplica
 * sus efectos por las rutas del motor. Los efectos no generan eventos nuevos salvo reliquias con `chains: true`, y en
 * cualquier caso hay un tope de activaciones por vaciado para que ningún bucle pueda colgar el juego.
 */
export function processRelics(s: CombatState): void {
  let budget = CONFIG.relics.maxActivationsPerDrain;
  while (s.relicQueue.length && budget > 0) {
    const ev = s.relicQueue.shift()!;
    for (const id of s.relics) {
      const def = RELICS[id];
      if (!def || def.on !== ev.type || !def.effects) continue;
      if (def.limit === 'turn' && (s.relicState.turnUses[id] ?? 0) >= 1) continue;
      if (def.limit === 'combat' && (s.relicState.combatUses[id] ?? 0) >= 1) continue;
      if (def.when && !def.when(s, ev)) continue;
      if (budget-- <= 0) break;
      s.relicState.turnUses[id] = (s.relicState.turnUses[id] ?? 0) + 1;
      s.relicState.combatUses[id] = (s.relicState.combatUses[id] ?? 0) + 1;
      s.relicLog.push({ relic: id, turn: s.turn });
      const before = s.relicQueue.length;
      for (const fx of def.effects) apply(s, fx, ev);
      if (!def.chains) s.relicQueue.length = before; // sus efectos no encadenan: se descartan los eventos que hayan generado
    }
  }
  s.relicQueue.length = 0; // lo que no cupo en el presupuesto se descarta: el tope es duro
}

/**
 * Reliquias de expedición que actúan al ganar un combate (hoy, curar a quien sigue en pie). Devuelve el texto de lo que han hecho para
 * enseñarlo en el botín. (El alivio de niebla de la Lámpara no pasa por aquí: se resta de lo que sube al entrar, ver `mistGainFor`.)
 */
export function combatEndNotes(e: Expedition): string[] {
  const notes: string[] = [];
  for (const id of e.run.relics) {
    const run = RELICS[id]?.run;
    if (run?.on !== 'combatEnd' || !run.healAll) continue;
    for (const c of e.run.champions) if (!c.downed) c.hp = Math.min(c.maxHp, c.hp + run.healAll);
    notes.push(`${RELICS[id].name}: +${run.healAll} de vida a cada campeón en pie`);
  }
  return notes;
}

export type { ChampionId };
