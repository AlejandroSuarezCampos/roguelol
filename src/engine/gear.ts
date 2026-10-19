import { GEAR, type GearSlot } from '../data/gear';
import { CHAMPIONS } from '../data/champions';
import { CONFIG } from './config';
import type { Expedition } from './expedition';
import { getFinalStats } from './stats';
import type { ChampionId, StatBlock } from './types';

export type ChampionGear = Record<GearSlot, string | null>;

export const emptyGear = (): Record<ChampionId, ChampionGear> => ({
  leona: { weapon: null, armor: null },
  yasuo: { weapon: null, armor: null },
  lux: { weapon: null, armor: null },
  soraka: { weapon: null, armor: null },
});

const equipped = (e: Expedition, id: ChampionId) => Object.values(e.gear[id]).filter((g): g is string => !!g).map((g) => GEAR[g]);

/** Estadísticas finales de un campeón (spec §6.3): base + gear plano. La UI y el combate usan este mismo resultado. */
export function finalStatsFor(e: Expedition, id: ChampionId): StatBlock {
  return getFinalStats(CHAMPIONS[id].stats, equipped(e, id).map((g) => g.stats));
}

/** Vida máxima: base × (1 − 10 % por herida) + vida del gear. */
export function maxHpFor(e: Expedition, id: ChampionId): number {
  const gearHp = equipped(e, id).reduce((a, g) => a + (g.hp ?? 0), 0);
  return Math.round(CHAMPIONS[id].maxHp * (1 - CONFIG.expedition.wound.maxHpLoss * e.wounds[id])) + gearHp + e.perks.hp;
}

/** Recalcula `maxHp` del campeón y recorta la vida actual si se pasa (nunca deja a uno vivo en 0). */
export function syncMaxHp(e: Expedition, c: Expedition['run']['champions'][number]): void {
  c.maxHp = maxHpFor(e, c.id);
  if (!c.downed) c.hp = Math.max(1, Math.min(c.hp, c.maxHp));
}

function assertFree(e: Expedition): void {
  if (e.inCombat) throw new Error('No se puede cambiar el equipo en combate');
}

/** Equipa un objeto del inventario en su slot; el que hubiera vuelve al inventario. Equipar vida sube también la vida actual. */
export function equip(e: Expedition, id: ChampionId, gearId: string): void {
  assertFree(e);
  const def = GEAR[gearId];
  const at = e.inventory.indexOf(gearId);
  if (!def || at < 0) throw new Error('Ese objeto no está en el inventario');
  const champ = e.run.champions.find((c) => c.id === id);
  if (!champ) throw new Error('Ese campeón ha muerto');
  const before = champ.maxHp;
  e.inventory.splice(at, 1);
  const old = e.gear[id][def.slot];
  if (old) e.inventory.push(old);
  e.gear[id][def.slot] = gearId;
  champ.maxHp = maxHpFor(e, id);
  if (!champ.downed && champ.maxHp > before) champ.hp += champ.maxHp - before;
  syncMaxHp(e, champ);
}

export function unequip(e: Expedition, id: ChampionId, slot: GearSlot): void {
  assertFree(e);
  const old = e.gear[id][slot];
  if (!old) throw new Error('No hay nada equipado en ese slot');
  e.gear[id][slot] = null;
  e.inventory.push(old);
  syncMaxHp(e, e.run.champions.find((c) => c.id === id)!);
}

/** Diferencia de estadísticas y vida si `gearId` sustituyera a lo que lleva el campeón en ese slot (para la comparación). */
export function compareGear(e: Expedition, id: ChampionId, gearId: string): { stats: Partial<StatBlock>; hp: number } {
  const def = GEAR[gearId];
  const cur = e.gear[id][def.slot] ? GEAR[e.gear[id][def.slot]!] : null;
  const stats: Partial<StatBlock> = {};
  for (const k of new Set([...Object.keys(def.stats), ...Object.keys(cur?.stats ?? {})]) as Set<keyof StatBlock>) {
    const d = (def.stats[k] ?? 0) - (cur?.stats[k] ?? 0);
    if (d) stats[k] = Math.round(d * 100) / 100;
  }
  return { stats, hp: (def.hp ?? 0) - (cur?.hp ?? 0) };
}
