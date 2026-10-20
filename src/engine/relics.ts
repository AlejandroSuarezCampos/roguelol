import { GEAR, type GearTrigger } from '../data/gear';
import { RELICS, type AllyTarget, type EnemyTarget, type RelicDef, type RelicEffect } from '../data/relics';
import { CONFIG } from './config';
import type { Expedition } from './expedition';
import { byPos, living } from './formation';
import { drawCards } from './cards';
import { addStress } from './stress';
import { applyDamage, gainBlock, heal, revive } from './units';
import type { ChampionId, CombatState, RelicEvent, RelicState, Unit } from './types';

export const newRelicState = (): RelicState => ({ attacksThisTurn: 0, ownersThisTurn: [], turnUses: {}, combatUses: {} });

/** Quién protagoniza el evento (para los efectos con `to: 'owner' | 'others'`). */
function protagonist(ev: RelicEvent): string | undefined {
  switch (ev.type) {
    case 'cardPlayed':
    case 'statusConsumed':
    case 'criticalHit':
      return ev.owner;
    case 'championDowned':
    case 'allyHit':
    case 'stressThreshold':
      return ev.unit;
    default:
      return undefined;
  }
}

function ownerOf(s: CombatState, ev: RelicEvent): Unit | undefined {
  const id = protagonist(ev);
  return id ? s.units.find((u) => u.id === id) : undefined;
}

function allies(s: CombatState, to: AllyTarget, owner?: Unit, wearer?: Unit): Unit[] {
  const alive = living(s, 'ally');
  if (to === 'allies') return alive;
  if (to === 'owner') return owner && !owner.downed ? [owner] : [];
  if (to === 'wearer') return wearer && !wearer.downed ? [wearer] : [];
  return alive.filter((u) => u !== owner);
}

function enemies(s: CombatState, to: EnemyTarget, ev: RelicEvent): Unit[] {
  const foes = byPos(living(s, 'enemy'));
  if (to === 'allEnemies') return foes;
  if (to === 'weakestEnemy') return foes.length ? [[...foes].sort((a, b) => a.hp - b.hp || a.pos - b.pos)[0]] : [];
  const id = to === 'target' && ev.type === 'criticalHit' ? ev.target : to === 'attacker' && ev.type === 'allyHit' ? ev.attacker : undefined;
  return foes.filter((u) => u.id === id);
}

function apply(s: CombatState, fx: RelicEffect, ev: RelicEvent, wearer?: Unit): void {
  const owner = ownerOf(s, ev);
  switch (fx.type) {
    case 'block':
      for (const u of allies(s, fx.to, owner, wearer)) gainBlock(u, fx.amount);
      break;
    case 'stress':
      for (const u of allies(s, fx.to, owner, wearer)) addStress(s, u, fx.amount);
      break;
    case 'heal':
      for (const u of allies(s, fx.to, owner, wearer)) heal(u, fx.amount);
      break;
    case 'damage': {
      const amount = fx.amount * (fx.perStack && ev.type === 'statusConsumed' ? ev.stacks : 1);
      for (const u of enemies(s, fx.to, ev)) applyDamage(s, u, amount);
      break;
    }
    case 'status': {
      const targets = fx.to === 'wearer' ? (wearer && !wearer.downed ? [wearer] : []) : enemies(s, fx.to, ev);
      for (const u of targets) u.statuses[fx.status] = (u.statuses[fx.status] ?? 0) + fx.stacks;
      break;
    }
    case 'revive':
      if (wearer) revive(wearer, Math.ceil(wearer.maxHp * fx.fraction));
      break;
    case 'energy':
      s.energy += fx.amount;
      break;
    case 'draw':
      drawCards(s, fx.amount);
      break;
    case 'emit':
      s.relicQueue.push(fx.event);
      break;
  }
}

/** Algo que reacciona a eventos: una reliquia del equipo, o la pasiva/desventaja de un objeto equipado (con su portador). */
interface Source {
  key: string;
  def: RelicDef | GearTrigger;
  wearer?: Unit;
  isRelic: boolean;
}

function sources(s: CombatState): Source[] {
  const out: Source[] = s.relics.filter((id) => RELICS[id]).map((id) => ({ key: id, def: RELICS[id], isRelic: true }));
  for (const { wearer, gearId } of s.gear) {
    const unit = s.units.find((u) => u.id === wearer);
    const g = GEAR[gearId];
    if (!unit || !g) continue;
    for (const [suffix, t] of [['p', g.passive], ['d', g.drawback]] as const) if (t?.on) out.push({ key: `${wearer}:${gearId}:${suffix}`, def: t, wearer: unit, isRelic: false });
  }
  return out;
}

/**
 * Vacía la cola de eventos de reliquias y de las pasivas del gear. Cada fuente escucha su evento, comprueba su condición y su
 * límite y aplica sus efectos por las rutas del motor (las del gear, solo si el protagonista del evento es su portador). Los
 * efectos no generan eventos nuevos salvo reliquias con `chains: true`, y en cualquier caso hay un tope de activaciones por
 * vaciado para que ningún bucle pueda colgar el juego.
 */
export function processRelics(s: CombatState): void {
  let budget = CONFIG.relics.maxActivationsPerDrain;
  while (s.relicQueue.length && budget > 0) {
    const ev = s.relicQueue.shift()!;
    for (const src of sources(s)) {
      const { key, def, wearer } = src;
      if (def.on !== ev.type || !def.effects) continue;
      const who = protagonist(ev);
      if (wearer && who !== undefined && who !== wearer.id) continue;
      if (def.limit === 'turn' && (s.relicState.turnUses[key] ?? 0) >= 1) continue;
      if (def.limit === 'combat' && (s.relicState.combatUses[key] ?? 0) >= 1) continue;
      if (def.limit === 'expedition' && s.spentGear.includes(key)) continue;
      if (def.when && !def.when(s, ev, wearer)) continue;
      if (budget-- <= 0) break;
      s.relicState.turnUses[key] = (s.relicState.turnUses[key] ?? 0) + 1;
      s.relicState.combatUses[key] = (s.relicState.combatUses[key] ?? 0) + 1;
      if (def.limit === 'expedition') s.spentGear.push(key);
      if (src.isRelic) s.relicLog.push({ relic: key, turn: s.turn });
      const before = s.relicQueue.length;
      for (const fx of def.effects) apply(s, fx, ev, wearer);
      if (!('chains' in def && def.chains)) s.relicQueue.length = before; // sus efectos no encadenan: se descartan los eventos que hayan generado
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
  // Pasivas de gear al ganar (Warmog): curan solo a su portador si sigue en pie.
  for (const c of e.run.champions) {
    for (const gearId of e.gear[c.id] ?? []) {
      const heal = gearId ? GEAR[gearId]?.passive?.combatEndHeal : undefined;
      if (!heal || c.downed) continue;
      c.hp = Math.min(c.maxHp, c.hp + heal);
      notes.push(`${GEAR[gearId!].name}: +${heal} de vida a ${c.name}`);
    }
  }
  return notes;
}

export type { ChampionId };
