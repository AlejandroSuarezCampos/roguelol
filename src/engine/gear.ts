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

/**
 * Cambia el gear de un campeón y mueve su vida actual lo mismo que su vida máxima: el equipo ni crea ni destruye vida, así que equipar y
 * quitar en bucle no cura gratis. Si el cambio lo dejaría sin vida, se rechaza (hay que curarlo antes) y no se toca nada.
 */
function changeGear(e: Expedition, id: ChampionId, mutate: () => void, undo: () => void): void {
  const c = e.run.champions.find((x) => x.id === id);
  if (!c) throw new Error('Ese campeón ha muerto');
  mutate();
  const next = maxHpFor(e, id);
  const delta = next - c.maxHp;
  if (!c.downed && c.hp + delta < 1) {
    undo();
    throw new Error(`Cambiarlo dejaría a ${c.name} sin vida: cúrala antes`);
  }
  c.maxHp = next;
  if (!c.downed) c.hp = Math.min(next, c.hp + delta);
}

/** Equipa un objeto del inventario en su slot; el que hubiera vuelve al inventario. Equipar vida sube también la vida actual. */
export function equip(e: Expedition, id: ChampionId, gearId: string): void {
  assertFree(e);
  const def = GEAR[gearId];
  const at = e.inventory.indexOf(gearId);
  if (!def || at < 0) throw new Error('Ese objeto no está en el inventario');
  const old = e.gear[id][def.slot];
  changeGear(
    e,
    id,
    () => {
      e.inventory.splice(at, 1);
      if (old) e.inventory.push(old);
      e.gear[id][def.slot] = gearId;
    },
    () => {
      if (old) e.inventory.pop();
      e.inventory.splice(at, 0, gearId);
      e.gear[id][def.slot] = old;
    },
  );
}

export function unequip(e: Expedition, id: ChampionId, slot: GearSlot): void {
  assertFree(e);
  const old = e.gear[id][slot];
  if (!old) throw new Error('No hay nada equipado en ese slot');
  changeGear(
    e,
    id,
    () => {
      e.gear[id][slot] = null;
      e.inventory.push(old);
    },
    () => {
      e.inventory.pop();
      e.gear[id][slot] = old;
    },
  );
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
