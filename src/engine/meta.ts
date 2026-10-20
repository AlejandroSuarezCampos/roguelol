import { PERKS, PERK_IDS, type PerkId } from '../data/perks';
import type { Expedition } from './expedition';
import { CONFIG } from './config';
import { MAX_ASCENSION } from '../data/ascension';

/** Ventajas que se aplican al crear una expedición (salen de los niveles de las mejoras). */
export interface Perks {
  hp: number;
  gold: number;
  potions: number;
  upgradedCards: number;
}
export const NO_PERKS: Perks = { hp: 0, gold: 0, potions: 0, upgradedCards: 0 };

export interface MetaHistory {
  runs: number;
  victories: number;
  defeats: number;
  retreats: number;
  bestFloor: number;
  combatsWon: number;
  /** Campeones muertos para siempre (Ascensión 10). */
  deaths: number;
}

/** Progreso que persiste entre expediciones. */
export interface MetaState {
  shards: number;
  /** Nivel de Ascensión más alto desbloqueado (se desbloquea el siguiente al ganar en el más alto). */
  maxAscension: number;
  perks: Record<PerkId, number>;
  bestiary: Record<string, { seen: number; defeated: number }>;
  history: MetaHistory;
}

export const newMeta = (): MetaState => ({
  shards: 0,
  maxAscension: 0,
  perks: { vigor: 0, provisions: 0, belt: 0, mastery: 0 },
  bestiary: {},
  history: { runs: 0, victories: 0, defeats: 0, retreats: 0, bestFloor: 0, combatsWon: 0, deaths: 0 },
});

const M = CONFIG.meta;

/**
 * Esquirlas de una expedición: pisos, combates, élites y victoria (+10 % por nivel de Ascensión), mínimo 5. Retirarse no penaliza, salvo si no
 * se ganó ni un combate: entrar y retirarse al instante no da nada (si no, se podrían sacar Esquirlas sin jugar).
 */
export function shardsFor(e: Expedition): number {
  if (e.status === 'retreat' && e.stats.combats === 0) return 0;
  const base = M.perFloor * e.visited.length + M.perCombat * e.stats.combats + M.perElite * e.stats.elites + (e.status === 'victory' ? M.victoryBonus : 0);
  const mult = 1 + M.perAscension * e.ascension;
  return Math.max(M.minShards, Math.round(base * mult));
}

/** Suma al progreso lo que dejó la expedición. Solo cuenta una vez por expedición (`e.recorded`). Devuelve las Esquirlas ganadas. */
export function recordRun(meta: MetaState, e: Expedition): { shards: number } {
  if (e.recorded || e.status === 'active') return { shards: 0 };
  e.recorded = true;
  const shards = shardsFor(e);
  meta.shards += shards;
  const h = meta.history;
  h.runs++;
  if (e.status === 'victory') h.victories++;
  else if (e.status === 'defeat') h.defeats++;
  else h.retreats++;
  h.combatsWon += e.stats.combats;
  h.deaths += e.dead.length;
  if (e.status === 'victory' && e.ascension >= meta.maxAscension && meta.maxAscension < MAX_ASCENSION) meta.maxAscension = e.ascension + 1;
  const floors = e.visited.map((id) => e.map.nodes.find((n) => n.id === id)!.floor + 1);
  h.bestFloor = Math.max(h.bestFloor, ...floors, 0);
  for (const [id, c] of Object.entries(e.encounters)) {
    const b = (meta.bestiary[id] ??= { seen: 0, defeated: 0 });
    b.seen += c.seen;
    b.defeated += c.defeated;
  }
  return { shards };
}

export const perkCost = (meta: MetaState, id: PerkId): number | null => (meta.perks[id] >= 3 ? null : PERKS[id].costs[meta.perks[id]]);

/** Compra el siguiente nivel de una mejora. Lanza un error con el motivo si no se puede. */
export function buyPerk(meta: MetaState, id: PerkId): void {
  const cost = perkCost(meta, id);
  if (cost === null) throw new Error('Ya está al nivel máximo');
  if (meta.shards < cost) throw new Error(`Esquirlas insuficientes (faltan ${cost - meta.shards})`);
  meta.shards -= cost;
  meta.perks[id]++;
}

const val = (meta: MetaState, id: PerkId): number => (meta.perks[id] ? PERKS[id].values[meta.perks[id] - 1] : 0);

export function perksFor(meta: MetaState): Perks {
  return { hp: val(meta, 'vigor'), gold: val(meta, 'provisions'), potions: val(meta, 'belt'), upgradedCards: val(meta, 'mastery') };
}

export { PERK_IDS };
