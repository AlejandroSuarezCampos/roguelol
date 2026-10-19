import { CARD_LIST, CARDS, STARTER_DECK } from '../data/cards';
import { CHAMPION_IDS, CHAMPIONS, CRISIS } from '../data/champions';
import { BASE_GOLD, ENCOUNTERS, ENEMIES, type EncounterKind } from '../data/enemies';
import { alliesAfter, startCombat } from './combat';
import { CONFIG } from './config';
import { combatMods, type NodeType } from './mist';
import { rollRewards, type Rewards } from './rewards';
import { createRun, enterNode as runEnterNode, stokeFire, type RunChampion, type RunState } from './run';
import { Rng } from './rng';
import { addPotion, POTIONS, resolveFullBelt } from './potions';
import type { ShopState } from './shop';
import type { ChampionId, CombatState, PotionId } from './types';

export interface MapNode {
  id: string;
  floor: number;
  /** Posición horizontal 0–1 dentro del piso (para dibujar). */
  x: number;
  type: NodeType;
  next: string[];
}

export interface ExpeditionMap {
  nodes: MapNode[];
}

export type ExpeditionStatus = 'active' | 'victory' | 'defeat' | 'retreat';

export interface Expedition {
  run: RunState;
  /** Ids de CardDef del mazo combinado del equipo. */
  deck: string[];
  map: ExpeditionMap;
  /** Nodo en el que está el equipo; null antes de entrar en el primer piso. */
  currentId: string | null;
  visited: string[];
  status: ExpeditionStatus;
  /** Heridas graves por campeón (Normal, §12). */
  wounds: Record<ChampionId, number>;
  restUsed: boolean;
  stoked: boolean;
  /** Stock del comerciante del nodo actual (null fuera de una tienda). */
  shop: ShopState | null;
  /** Cartas eliminadas en tiendas: cada una encarece la siguiente. */
  removals: number;
  /** Ids de eventos ya vistos esta expedición. */
  seenEvents: string[];
  stats: { combats: number; elites: number };
}

export interface ExpeditionRewards extends Rewards {
  /** Ids de las cartas ofrecidas (`cardOptions` distintas). */
  cards: string[];
  /** Poción que suelta el combate, si hay (ver `CONFIG.potions.drop`). */
  potion?: PotionId;
}

export type RestAction = 'heal' | 'calm' | 'treat' | 'stoke';

const F = CONFIG.expedition;

/**
 * Mapa de 8 pisos de 2–3 nodos: combates; élites desde el piso 2; descansos entre 2 y 4; comerciantes en 2–5 (uno por piso como
 * mucho); eventos en 1–5; descanso previo al jefe. Siempre hay al menos un comerciante (2–4) y un evento (1–4).
 */
export function generateMap(rng: Rng): ExpeditionMap {
  const nodes: MapNode[] = [];
  const byFloor: MapNode[][] = [];
  for (let f = 0; f < F.floors; f++) {
    const count = f === F.floors - 1 ? 1 : 2 + rng.int(2);
    const row: MapNode[] = [];
    for (let i = 0; i < count; i++) {
      const type = pickType(rng, f, row.some((n) => n.type === 'shop'));
      row.push({ id: `n${f}-${i}`, floor: f, x: (i + 0.5) / count, type, next: [] });
    }
    byFloor.push(row);
    nodes.push(...row);
  }
  for (let f = 0; f < F.floors - 1; f++) {
    const here = byFloor[f];
    const up = byFloor[f + 1];
    const near = (x: number) => [...up].sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x));
    for (const n of here) {
      const [a, b] = near(n.x);
      n.next.push(a.id);
      if (b && Math.abs(b.x - n.x) < 0.4 && rng.next() < 0.5) n.next.push(b.id);
    }
    for (const t of up) {
      if (here.some((n) => n.next.includes(t.id))) continue;
      const src = [...here].sort((a, b) => Math.abs(a.x - t.x) - Math.abs(b.x - t.x))[0];
      src.next.push(t.id);
    }
  }
  ensureType(nodes, rng, 'shop', 2, 4);
  ensureType(nodes, rng, 'event', 1, 4);
  return { nodes };
}

/** Si el mapa no tiene ningún nodo de ese tipo en los pisos dados, convierte un combate al azar. */
function ensureType(nodes: MapNode[], rng: Rng, type: NodeType, from: number, to: number): void {
  const inRange = nodes.filter((n) => n.floor >= from && n.floor <= to);
  if (inRange.some((n) => n.type === type)) return;
  const candidates = inRange.filter((n) => n.type === 'combat');
  if (candidates.length) rng.pick(candidates).type = type;
}

function pickType(rng: Rng, floor: number, shopInFloor: boolean): NodeType {
  if (floor === F.floors - 1) return 'boss';
  if (floor === F.floors - 2) return 'rest';
  if (floor === 0) return 'combat';
  const r = rng.next();
  if (floor >= 2 && r < 0.14) return 'elite';
  if (floor >= 2 && floor <= F.floors - 4 && r < 0.32) return 'rest';
  if (floor >= 2 && floor <= F.floors - 3 && !shopInFloor && r < 0.44) return 'shop';
  if (floor <= F.floors - 3 && r < 0.6) return 'event';
  return 'combat';
}

export function createExpedition(seed: number): Expedition {
  const champions: RunChampion[] = CHAMPION_IDS.map((id) => ({
    id, name: CHAMPIONS[id].name, pos: CHAMPIONS[id].startPos, hp: CHAMPIONS[id].maxHp, maxHp: CHAMPIONS[id].maxHp, stress: 0, downed: false,
  }));
  const run = createRun(seed, champions);
  // El mapa sale de una semilla derivada para que no consuma tiradas de la run.
  const map = generateMap(new Rng(seed ^ 0x9e3779b9));
  return {
    run, deck: [...STARTER_DECK], map, currentId: null, visited: [], status: 'active',
    wounds: { leona: 0, yasuo: 0, lux: 0, soraka: 0 }, restUsed: false, stoked: false, shop: null, removals: 0, seenEvents: [], stats: { combats: 0, elites: 0 },
  };
}

export const nodeById = (e: Expedition, id: string): MapNode => {
  const n = e.map.nodes.find((x) => x.id === id);
  if (!n) throw new Error(`Nodo desconocido: ${id}`);
  return n;
};

/** Nodos en los que se puede entrar ahora: el primer piso al empezar; después, los conectados al actual. */
export function availableNodes(e: Expedition): MapNode[] {
  if (e.status !== 'active') return [];
  if (!e.currentId) return e.map.nodes.filter((n) => n.floor === 0);
  return nodeById(e, e.currentId).next.map((id) => nodeById(e, id));
}

export function enterNode(e: Expedition, id: string): MapNode {
  const n = availableNodes(e).find((x) => x.id === id);
  if (!n) throw new Error('Nodo no accesible');
  runEnterNode(e.run, n.type);
  e.currentId = n.id;
  e.visited.push(n.id);
  e.restUsed = false;
  e.stoked = false;
  e.shop = null;
  return n;
}

export const encounterKind = (type: NodeType): EncounterKind | null =>
  type === 'combat' || type === 'elite' || type === 'boss' ? type : null;

/** Crea el combate con el equipo, el mazo, la niebla, el Presagio y el cinturón de la run. */
export function combatFromExpedition(e: Expedition, kind: EncounterKind): CombatState {
  const { run } = e;
  const encounter = run.rng.pick(ENCOUNTERS[kind]);
  return startCombat({
    seed: 1 + run.rng.int(2 ** 31 - 1),
    allies: run.champions.map((c) => ({
      id: c.id, name: c.name, pos: c.pos, hp: c.hp, maxHp: c.maxHp, stress: c.stress, crisis: CRISIS[c.id], stats: CHAMPIONS[c.id].stats,
    })),
    enemies: encounter.map((en, i) => ({ uid: `e${i + 1}`, defId: en.defId, pos: en.pos, boss: kind === 'boss' && i === 0 })),
    deck: e.deck,
    cards: CARDS,
    enemyDefs: ENEMIES,
    omen: run.omen,
    mods: combatMods(run.mist, kind === 'boss'),
    belt: run.belt,
  });
}

function applyWound(e: Expedition, c: RunChampion): void {
  e.wounds[c.id] = Math.min(F.wound.cap, e.wounds[c.id] + 1);
  c.maxHp = maxHpWith(c.id, e.wounds[c.id]);
  c.hp = Math.ceil(c.maxHp * F.wound.recoverHpFraction);
  c.downed = false;
}

const maxHpWith = (id: ChampionId, wounds: number): number => Math.round(CHAMPIONS[id].maxHp * (1 - F.wound.maxHpLoss * wounds));

/**
 * Cierra el combate: vuelca el estado de los aliados en la run. Derrota → fin de la expedición (devuelve null).
 * Victoria → botín; los derribados sobreviven con una herida grave; vencer al jefe gana la expedición.
 */
export function finishCombat(e: Expedition, s: CombatState, kind: EncounterKind): ExpeditionRewards | null {
  if (s.outcome === 'ongoing') throw new Error('El combate no ha terminado');
  for (const a of alliesAfter(s)) {
    const c = e.run.champions.find((x) => x.id === a.id)!;
    c.hp = a.hp;
    c.stress = a.stress;
    c.downed = a.downed;
  }
  if (s.outcome === 'lost') {
    e.status = 'defeat';
    return null;
  }
  for (const c of e.run.champions) if (c.downed) applyWound(e, c);
  e.stats.combats++;
  if (kind === 'elite') e.stats.elites++;
  if (kind === 'boss') e.status = 'victory';
  const base = rollRewards(e.run, kind, BASE_GOLD[kind]);
  const pool = e.run.rng.shuffle(CARD_LIST.map((c) => c.id));
  const potion = e.run.rng.next() < CONFIG.potions.drop[kind] ? e.run.rng.pick(Object.keys(POTIONS) as PotionId[]) : undefined;
  return { ...base, cards: pool.slice(0, base.cardOptions), potion };
}

/** Recoge la poción del botín. Con el cinturón lleno hay que decir qué hueco sustituir (o `'new'` para descartarla). */
export function claimPotion(e: Expedition, id: PotionId, slot?: number | 'new'): 'added' | 'replaced' | 'discarded' | 'full' {
  if (addPotion(e.run.belt, id)) return 'added';
  if (slot === undefined) return 'full';
  resolveFullBelt(e.run.belt, id, slot);
  return slot === 'new' ? 'discarded' : 'replaced';
}

export function claimRewards(e: Expedition, r: Rewards): void {
  e.run.gold += r.gold;
}

/** Elige una carta del botín (`null` = omitir). */
export function claimCard(e: Expedition, defId: string | null): void {
  if (defId === null) return;
  if (!CARDS[defId]) throw new Error(`Carta desconocida: ${defId}`);
  e.deck.push(defId);
}

/** Una acción de descanso por parada (curar, calmar o tratar una herida) y, aparte, avivar la hoguera. */
export function rest(e: Expedition, action: RestAction): void {
  if (action === 'stoke') {
    if (e.stoked) throw new Error('La hoguera ya está avivada');
    stokeFire(e.run);
    e.stoked = true;
    return;
  }
  if (e.restUsed) throw new Error('Ya descansaste en esta parada');
  if (action === 'heal') {
    for (const c of e.run.champions)
      if (!c.downed) c.hp = Math.min(c.maxHp, c.hp + Math.floor(c.maxHp * F.rest.healFraction));
  } else if (action === 'calm') {
    for (const c of e.run.champions) c.stress = Math.max(0, c.stress - F.rest.stressRelief);
  } else {
    const worst = [...e.run.champions].sort((a, b) => e.wounds[b.id] - e.wounds[a.id])[0];
    if (!e.wounds[worst.id]) throw new Error('Nadie tiene heridas');
    e.wounds[worst.id]--;
    worst.maxHp = maxHpWith(worst.id, e.wounds[worst.id]);
  }
  e.restUsed = true;
}

/** Retirada: acaba la expedición y conserva solo parte del oro. */
export function retreat(e: Expedition): void {
  e.run.gold = Math.floor(e.run.gold * CONFIG.expedition.retreatGoldKept);
  e.status = 'retreat';
}
