import { CHAMPION_IDS, DEFAULT_PARTY, PARTY_SIZE } from '../data/champions';
import { GEAR } from '../data/gear';
import { UNLOCKS, UNLOCK_BY_ID, type RunSetup } from '../data/unlocks';
import { floorReached, type Expedition } from './expedition';
import type { ChampionId } from './types';
import { CONFIG } from './config';
import { MAX_ASCENSION } from '../data/ascension';

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
  /** Ids de `UNLOCKS` ya comprados con Esquirlas. */
  unlocked: string[];
  /** Objeto inicial elegido para cada campeón (debe estar desbloqueado). */
  loadout: Partial<Record<ChampionId, string>>;
  /** Último equipo elegido (4 campeones disponibles). */
  party: ChampionId[];
  bestiary: Record<string, { seen: number; defeated: number }>;
  history: MetaHistory;
}

export const newMeta = (): MetaState => ({
  shards: 0,
  maxAscension: 0,
  unlocked: [],
  loadout: {},
  party: [...DEFAULT_PARTY],
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
  if (e.status === 'victory' && !e.daily && e.ascension >= meta.maxAscension && meta.maxAscension < MAX_ASCENSION) meta.maxAscension = e.ascension + 1;
  h.bestFloor = Math.max(h.bestFloor, floorReached(e));
  for (const [id, c] of Object.entries(e.encounters)) {
    const b = (meta.bestiary[id] ??= { seen: 0, defeated: 0 });
    b.seen += c.seen;
    b.defeated += c.defeated;
  }
  return { shards };
}

/** Compra un desbloqueo con Esquirlas. Lanza un error con el motivo si no se puede. */
export function buyUnlock(meta: MetaState, id: string): void {
  const u = UNLOCK_BY_ID[id];
  if (!u) throw new Error('Ese desbloqueo no existe');
  if (meta.unlocked.includes(id)) throw new Error('Ya está desbloqueado');
  if (meta.shards < u.cost) throw new Error(`Esquirlas insuficientes (faltan ${u.cost - meta.shards})`);
  meta.shards -= u.cost;
  meta.unlocked.push(id);
}

/** Elige el objeto inicial de un campeón (`null` = ninguno). Solo objetos iniciales desbloqueados. */
export function setStarter(meta: MetaState, champion: ChampionId, gearId: string | null): void {
  if (gearId === null) {
    delete meta.loadout[champion];
    return;
  }
  if (!GEAR[gearId]?.starter) throw new Error('No es un objeto inicial');
  if (!meta.unlocked.includes(`starter:${gearId}`)) throw new Error('Ese objeto inicial aún está bloqueado');
  meta.loadout[champion] = gearId;
}

/** Un campeón está disponible si no tiene desbloqueo o si ya se compró. */
export const championAvailable = (meta: MetaState, id: ChampionId): boolean => {
  const u = UNLOCKS.find((x) => x.kind === 'champion' && x.ref === id);
  return !u || meta.unlocked.includes(u.id);
};

/** Elige el equipo de la próxima expedición: 4 campeones distintos y disponibles. */
export function setParty(meta: MetaState, party: ChampionId[]): void {
  if (party.length !== PARTY_SIZE || new Set(party).size !== PARTY_SIZE) throw new Error(`Elige ${PARTY_SIZE} campeones distintos`);
  if (!party.every((id) => CHAMPION_IDS.includes(id))) throw new Error('Campeón desconocido');
  const locked = party.find((id) => !championAvailable(meta, id));
  if (locked) throw new Error('Ese campeón aún está bloqueado');
  meta.party = [...party];
}

/** Lo que el progreso aporta a una expedición nueva: equipo, lo que sigue bloqueado y los objetos iniciales elegidos. */
export function setupFor(meta: MetaState): RunSetup {
  const lockedOf = (kind: 'card' | 'relic') => UNLOCKS.filter((u) => u.kind === kind && !meta.unlocked.includes(u.id)).map((u) => u.ref);
  const party = meta.party.length === PARTY_SIZE && meta.party.every((id) => championAvailable(meta, id)) ? meta.party : DEFAULT_PARTY;
  return { locked: { cards: lockedOf('card'), relics: lockedOf('relic') }, starters: { ...meta.loadout }, party: [...party] };
}
