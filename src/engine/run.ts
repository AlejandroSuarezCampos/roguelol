import { CONFIG } from './config';
import { mistGain, mistTier, type MistTier, type NodeType } from './mist';
import { emptyBelt } from './potions';
import { relicChanceFor } from './rewards';
import { Rng } from './rng';
import type { BeltSlot, ChampionId, Omen, Pos } from './types';

export interface RunChampion {
  id: ChampionId;
  name: string;
  pos: Pos;
  hp: number;
  maxHp: number;
  stress: number;
  downed: boolean;
}

export interface RunState {
  rng: Rng;
  omen: Omen;
  mist: number;
  gold: number;
  /** Sin límite: se conservan todas las reliquias de la run. */
  relics: string[];
  belt: BeltSlot[];
  champions: RunChampion[];
}

export const OMENS: readonly Omen[] = ['lament', 'weight', 'drift', 'bleed'];

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/** Crea la run y sortea su Presagio de los caídos con la semilla (fijo para toda la run). */
export function createRun(seed: number, champions: RunChampion[]): RunState {
  const rng = new Rng(seed);
  return { rng, omen: rng.pick(OMENS), mist: 0, gold: 0, relics: [], belt: emptyBelt(), champions };
}

export function enterNode(run: RunState, type: NodeType): void {
  run.mist = clamp(run.mist + mistGain(type));
}

/** «Avivar la hoguera»: acción adicional del campamento. Solo toca la niebla, no la elección del descanso. */
export function stokeFire(run: RunState): void {
  run.mist = clamp(run.mist + CONFIG.mist.stoke);
}

/** Vista previa de un nodo disponible: niebla resultante, tramo y probabilidad de reliquia. */
export function previewNode(run: RunState, type: NodeType): { mistAfter: number; tier: MistTier; relicChance: number } {
  const mistAfter = clamp(run.mist + mistGain(type));
  return { mistAfter, tier: mistTier(mistAfter), relicChance: relicChanceFor(type, mistAfter) };
}

/** Reordenación libre fuera de combate (intercambia con quien ocupe `to`). */
export function reorder(run: RunState, id: ChampionId, to: Pos): void {
  const c = run.champions.find((x) => x.id === id)!;
  const other = run.champions.find((x) => x.pos === to);
  if (other) other.pos = c.pos;
  c.pos = to;
}

export function addRelic(run: RunState, relicId: string): void {
  run.relics.push(relicId);
}
