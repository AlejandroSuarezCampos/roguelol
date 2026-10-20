import { CARD_LIST, CARDS, STARTER_DECK, baseCardId, deckCardDef, isUpgradedId, upgradedId } from '../data/cards';
import { GEAR, GEAR_LIST } from '../data/gear';
import { ascensionMods, type AscensionMods } from '../data/ascension';
import { CHAMPION_IDS, CHAMPIONS, CRISIS } from '../data/champions';
import { BASE_GOLD, ENCOUNTERS, ENEMIES, type EncounterKind } from '../data/enemies';
import { alliesAfter, startCombat } from './combat';
import { CONFIG } from './config';
import { emptyGear, equip, finalStatsFor, freeSlot, syncMaxHp, type ChampionGear } from './gear';
import { combatMods, type NodeType } from './mist';
import { rollRewards, type Rewards } from './rewards';
import { RELIC_LIST } from '../data/relics';
import { combatEndNotes } from './relics';
import { NO_PERKS, type Perks } from './meta';
import { createRun, enterNode as runEnterNode, stokeFire, type RunChampion, type RunState } from './run';
import { Rng } from './rng';
import { addPotion, POTIONS, resolveFullBelt } from './potions';
import type { ChestState } from './chest';
import type { ShopState } from './shop';
import type { ChampionId, CombatState, EnemyDef, PotionId } from './types';

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
  /** Ventajas de las mejoras permanentes aplicadas al empezar. */
  perks: Perks;
  /** Ya se sumó al progreso permanente (las Esquirlas se ganan una sola vez). */
  recorded: boolean;
  /** Enemigos vistos y derrotados en esta expedición (alimenta el bestiario). */
  encounters: Record<string, { seen: number; defeated: number }>;
  /** Semilla con la que se creó (para recrear la preparación al cambiar de Ascensión). */
  seed: number;
  /** Nivel de Ascensión (0 = sin Ascensión). Sus modificadores salen de `modsOf`. */
  ascension: number;
  /** Campeones muertos para siempre (Ascensión 10). Ya no están en `run.champions`. */
  dead: ChampionId[];
  run: RunState;
  /** Ids de CardDef del mazo combinado del equipo. */
  deck: string[];
  map: ExpeditionMap;
  /** Nodo en el que está el equipo; null antes de entrar en el primer piso. */
  currentId: string | null;
  visited: string[];
  status: ExpeditionStatus;
  /** Gear equipado por campeón y objetos sin equipar (sin límite). */
  gear: Record<ChampionId, ChampionGear>;
  inventory: string[];
  /** Hay un combate en curso: no se puede cambiar el equipo. */
  inCombat: boolean;
  /** Heridas graves por campeón (Normal, §12). */
  wounds: Record<ChampionId, number>;
  restUsed: boolean;
  stoked: boolean;
  /** Stock del comerciante del nodo actual (null fuera de una tienda). */
  shop: ShopState | null;
  /** Ofertas del tesoro del nodo actual (null fuera de un tesoro). */
  chest: ChestState | null;
  /** Cartas eliminadas en tiendas: cada una encarece la siguiente. */
  removals: number;
  /** Lo que costó retirarse (para mostrarlo en el resultado). */
  retreat?: { before: number; kept: number };
  /** Ids de eventos ya vistos esta expedición. */
  seenEvents: string[];
  stats: { combats: number; elites: number };
}

export interface ExpeditionRewards extends Rewards {
  /** Ids de las cartas ofrecidas (`cardOptions` distintas). */
  cards: string[];
  /** Ids de gear ofrecido (elige 1 o ninguno), si el combate suelta. */
  gear?: string[];
  /** Reliquias nuevas (no repetidas) que ha soltado el combate; `claimRewards` las añade a la run. */
  relicIds?: string[];
  /** Lo que han hecho las reliquias de expedición al terminar el combate. */
  relicNotes?: string[];
  /** Poción que suelta el combate, si hay (ver `CONFIG.potions.drop`). */
  potion?: PotionId;
}

export type RestAction = 'heal' | 'calm' | 'treat' | 'upgrade' | 'stoke';

const F = CONFIG.expedition;

/**
 * Mapa de 15 pisos de 2–4 nodos (como un acto de Slay the Spire): el primero de combates, el del medio entero de tesoros, el
 * penúltimo de descanso y el último, el jefe. Élites desde el piso 4; descansos, comerciantes (uno por piso como mucho), eventos y
 * santuarios repartidos por el resto. Siempre hay un comerciante en 2–6, otro en 8–12 y un evento en 1–6.
 */
export function generateMap(rng: Rng, restWeight = 1, eliteWeight = 1): ExpeditionMap {
  const nodes: MapNode[] = [];
  const byFloor: MapNode[][] = [];
  let shrines = 0;
  for (let f = 0; f < F.floors; f++) {
    const count = f === F.floors - 1 ? 1 : 2 + rng.int(3);
    const row: MapNode[] = [];
    for (let i = 0; i < count; i++) {
      const type = pickType(rng, f, row.some((n) => n.type === 'shop'), restWeight, eliteWeight, shrines < F.maxShrines);
      if (type === 'shrine') shrines++;
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
  ensureType(nodes, rng, 'shop', 2, 6);
  ensureType(nodes, rng, 'shop', 8, 12);
  ensureType(nodes, rng, 'event', 1, 6);
  return { nodes };
}

/** Si el mapa no tiene ningún nodo de ese tipo en los pisos dados, convierte un combate al azar (sin dejar dos tiendas en un piso). */
function ensureType(nodes: MapNode[], rng: Rng, type: NodeType, from: number, to: number): void {
  const inRange = nodes.filter((n) => n.floor >= from && n.floor <= to);
  if (inRange.some((n) => n.type === type)) return;
  const candidates = inRange.filter((n) => n.type === 'combat');
  if (candidates.length) rng.pick(candidates).type = type;
}

function pickType(rng: Rng, floor: number, shopInFloor: boolean, restWeight: number, eliteWeight: number, shrineLeft: boolean): NodeType {
  if (floor === F.floors - 1) return 'boss';
  if (floor === F.floors - 2) return 'rest';
  if (floor === F.chestFloor) return 'chest';
  if (floor === 0) return 'combat';
  const late = floor <= F.floors - 3; // nada especial justo antes del descanso final
  const r = rng.next();
  const elite = 0.13 * eliteWeight;
  if (floor >= 4 && r < elite) return 'elite';
  if (floor >= 4 && late && r < elite + 0.13 * restWeight) return 'rest';
  if (floor >= 2 && late && !shopInFloor && r < 0.34) return 'shop';
  if (late && r < 0.56) return 'event';
  if (floor >= 2 && late && shrineLeft && r < 0.6) return 'shrine';
  return 'combat';
}

/** Modificadores de la Ascensión de la expedición. */
export const modsOf = (e: Pick<Expedition, 'ascension'>): AscensionMods => ascensionMods(e.ascension);

export function createExpedition(seed: number, ascension = 0, perks: Perks = NO_PERKS): Expedition {
  const mods = ascensionMods(ascension);
  const champions: RunChampion[] = CHAMPION_IDS.map((id) => ({
    id, name: CHAMPIONS[id].name, pos: CHAMPIONS[id].startPos, hp: CHAMPIONS[id].maxHp + perks.hp, maxHp: CHAMPIONS[id].maxHp + perks.hp, stress: mods.startStress, downed: false,
  }));
  const run = createRun(seed, champions);
  run.gold = perks.gold;
  for (let i = 0; i < perks.potions; i++) addPotion(run.belt, 'health');
  const deck = [...STARTER_DECK];
  // Maestría: cartas del mazo inicial ya mejoradas, elegidas con una semilla aparte para no tocar el RNG de la run.
  const picks = new Rng(seed ^ 0x5bd1e995).shuffle(deck.map((_, i) => i)).slice(0, perks.upgradedCards);
  for (const i of picks) deck[i] = upgradedId(deck[i]);
  // El mapa sale de una semilla derivada para que no consuma tiradas de la run.
  const map = generateMap(new Rng(seed ^ 0x9e3779b9), mods.restWeight, mods.eliteWeight);
  return {
    perks: { ...perks }, recorded: false, encounters: {}, seed, ascension, dead: [], run, deck, map, currentId: null, visited: [], status: 'active',
    gear: emptyGear(), inventory: [], inCombat: false,
    wounds: { leona: 0, yasuo: 0, lux: 0, soraka: 0 }, restUsed: false, stoked: false, shop: null, chest: null, removals: 0, seenEvents: [], stats: { combats: 0, elites: 0 },
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
  e.chest = null;
  return n;
}

/** Copia de los enemigos con el ataque y el bloqueo de sus intenciones multiplicados (no toca los datos originales). */
function scaleEnemies(defs: Record<string, EnemyDef>, factor: number): Record<string, EnemyDef> {
  if (factor === 1) return defs;
  return Object.fromEntries(
    Object.entries(defs).map(([id, d]) => [
      id,
      { ...d, script: d.script.map((i) => (i.kind === 'attack' || i.kind === 'block' ? { ...i, amount: Math.round(i.amount * factor) } : i)) },
    ]),
  );
}

export const encounterKind = (type: NodeType): EncounterKind | null =>
  type === 'combat' || type === 'elite' || type === 'boss' ? type : null;

/** Crea el combate con el equipo, el mazo, la niebla, el Presagio y el cinturón de la run. */
export function combatFromExpedition(e: Expedition, kind: EncounterKind): CombatState {
  const { run } = e;
  e.inCombat = true;
  const encounter = run.rng.pick(ENCOUNTERS[kind]);
  const diff = modsOf(e);
  const mods = combatMods(run.mist, kind === 'boss');
  for (const en of encounter) (e.encounters[en.defId] ??= { seen: 0, defeated: 0 }).seen++;
  return startCombat({
    seed: 1 + run.rng.int(2 ** 31 - 1),
    allies: run.champions.map((c) => ({
      id: c.id, name: c.name, pos: c.pos, hp: c.hp, maxHp: c.maxHp, stress: c.stress, crisis: CRISIS[c.id], stats: finalStatsFor(e, c.id),
    })),
    enemies: encounter.map((en, i) => ({ uid: `e${i + 1}`, defId: en.defId, pos: en.pos, boss: kind === 'boss' && i === 0 })),
    deck: e.deck,
    cards: CARDS,
    enemyDefs: scaleEnemies(ENEMIES, diff.enemyAttack[kind]),
    omen: run.omen,
    mods: { ...mods, hpMultiplier: mods.hpMultiplier * diff.enemyHp[kind] },
    belt: run.belt,
    relics: run.relics,
  });
}

/** Herida grave: −10 % de vida máxima (con tope). `recover`: el derribado vuelve en pie con una parte de su vida. */
function applyWound(e: Expedition, c: RunChampion, recover: boolean): void {
  e.wounds[c.id] = Math.min(F.wound.cap, e.wounds[c.id] + 1);
  syncMaxHp(e, c);
  if (recover) {
    c.hp = Math.ceil(c.maxHp * F.wound.recoverHpFraction);
    c.downed = false;
  }
}

/** Muerte permanente (Ascensión 10): sale del equipo, su gear vuelve al inventario y sus cartas salen del mazo. */
function killChampion(e: Expedition, c: RunChampion): void {
  e.run.champions = e.run.champions.filter((x) => x !== c);
  e.dead.push(c.id);
  e.inventory.push(...e.gear[c.id].filter((g): g is string => !!g));
  e.gear[c.id] = e.gear[c.id].map(() => null);
  e.deck = e.deck.filter((id) => deckCardDef(id).owner !== c.id);
}

/**
 * Cierra el combate: vuelca el estado de los aliados en la run. Derrota → fin de la expedición (devuelve null).
 * Victoria → botín; los derribados sobreviven con una herida grave; vencer al jefe gana la expedición.
 */
export function finishCombat(e: Expedition, s: CombatState, kind: EncounterKind): ExpeditionRewards | null {
  if (s.outcome === 'ongoing') throw new Error('El combate no ha terminado');
  e.inCombat = false;
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
  const diff = modsOf(e);
  const relicNotes = combatEndNotes(e); // antes de las heridas: los derribados no se curan
  for (const c of [...e.run.champions]) {
    if (c.downed) diff.permadeath ? killChampion(e, c) : applyWound(e, c, true);
    else if (diff.permadeath && s.fallen.includes(c.id)) applyWound(e, c, false); // reanimado: sobrevive, pero herido
  }
  if (!e.run.champions.length) {
    e.status = 'defeat';
    return null;
  }
  for (const defId of Object.values(s.enemyOf)) (e.encounters[defId] ??= { seen: 0, defeated: 0 }).defeated++;
  e.stats.combats++;
  if (kind === 'elite') e.stats.elites++;
  if (kind === 'boss') e.status = 'victory';
  const base = rollRewards(e.run, kind, BASE_GOLD[kind]);
  base.gold = Math.round(base.gold * diff.gold);
  const pool = e.run.rng.shuffle(cardPool(e).map((c) => c.id));
  const potion = e.run.rng.next() < CONFIG.potions.drop[kind] * diff.potionDrop ? e.run.rng.pick(Object.keys(POTIONS) as PotionId[]) : undefined;
  const gear = e.run.rng.next() < CONFIG.gear.dropChance[kind] ? pickGear(e.run.rng, CONFIG.gear.rarityWeights[kind], CONFIG.gear.options) : undefined;
  const fresh = e.run.rng.shuffle(RELIC_LIST.map((r) => r.id).filter((id) => !e.run.relics.includes(id)));
  const relicIds = fresh.slice(0, base.relics);
  return { ...base, cards: pool.slice(0, base.cardOptions), potion, gear, relicIds, relicNotes };
}

/** `count` objetos distintos con probabilidad ponderada por rareza (sin reposición). */
export function pickGear(rng: Rng, weights: Record<'common' | 'rare' | 'legendary', number>, count: number): string[] {
  const pool = GEAR_LIST.filter((g) => weights[g.rarity] > 0);
  const out: string[] = [];
  while (out.length < count && pool.length) {
    const total = pool.reduce((a, g) => a + weights[g.rarity], 0);
    let r = rng.next() * total;
    const i = pool.findIndex((g) => (r -= weights[g.rarity]) < 0);
    out.push(pool.splice(i < 0 ? pool.length - 1 : i, 1)[0].id);
  }
  return out;
}

/**
 * Recoge un objeto del botín (`null` = omitir): va al inventario y, con `equipOn`, se equipa enseguida.
 * Atómico: si no se puede equipar (campeón muerto, en combate…) no se recoge nada.
 */
export function claimGear(e: Expedition, gearId: string | null, equipOn?: ChampionId): void {
  if (gearId === null) return;
  if (!GEAR[gearId]) throw new Error(`Objeto desconocido: ${gearId}`);
  if (equipOn && !e.run.champions.some((c) => c.id === equipOn)) throw new Error('Ese campeón ha muerto');
  if (equipOn && e.inCombat) throw new Error('No se puede cambiar el equipo en combate');
  if (equipOn && freeSlot(e, equipOn) === null) throw new Error('Sin huecos libres: equípalo desde Equipo');
  e.inventory.push(gearId);
  if (equipOn) equip(e, equipOn, gearId);
}

/** Recoge la poción del botín. Con el cinturón lleno hay que decir qué hueco sustituir (o `'new'` para descartarla). */
export function claimPotion(e: Expedition, id: PotionId, slot?: number | 'new'): 'added' | 'replaced' | 'discarded' | 'full' {
  if (addPotion(e.run.belt, id)) return 'added';
  if (slot === undefined) return 'full';
  resolveFullBelt(e.run.belt, id, slot);
  return slot === 'new' ? 'discarded' : 'replaced';
}

/** Cartas que pueden salir como botín, en tienda o en eventos: solo las de campeones que siguen vivos. */
export const cardPool = (e: Expedition) => CARD_LIST.filter((c) => e.run.champions.some((ch) => ch.id === c.owner));

export function claimRewards(e: Expedition, r: Rewards & { relicIds?: string[] }): void {
  e.run.gold += r.gold;
  for (const id of r.relicIds ?? []) if (!e.run.relics.includes(id)) e.run.relics.push(id);
}

/** Elige una carta del botín (`null` = omitir). */
export function claimCard(e: Expedition, defId: string | null): void {
  if (defId === null) return;
  if (!CARDS[defId]) throw new Error(`Carta desconocida: ${defId}`);
  if (!e.run.champions.some((c) => c.id === CARDS[defId].owner)) throw new Error('Su campeón ha muerto');
  e.deck.push(defId);
}

/** Cura una herida del campeón más herido y le devuelve esa parte de vida máxima. Lanza un error si nadie tiene heridas. */
export function healWound(e: Expedition): void {
  const worst = [...e.run.champions].sort((a, b) => e.wounds[b.id] - e.wounds[a.id])[0];
  if (!worst || !e.wounds[worst.id]) throw new Error('Nadie tiene heridas');
  e.wounds[worst.id]--;
  syncMaxHp(e, worst);
}

/** Heridas de los campeones que siguen vivos (las de un muerto ya no se pueden tratar). */
export const livingWounds = (e: Expedition): number => e.run.champions.reduce((a, c) => a + e.wounds[c.id], 0);

/** Mejora la carta en la posición `deckIndex` del mazo (la marca con «+»). */
export function upgradeCard(e: Expedition, deckIndex: number): void {
  const id = e.deck[deckIndex];
  if (!id || !CARDS[baseCardId(id)]) throw new Error('Esa carta no está en el mazo');
  if (isUpgradedId(id)) throw new Error('Esa carta ya está mejorada');
  if (!CARDS[id].upgrade) throw new Error('Esa carta no tiene mejora');
  e.deck[deckIndex] = upgradedId(id);
}

/** Una acción de descanso por parada (curar, calmar, tratar una herida o forjar una carta) y, aparte, avivar la hoguera. */
export function rest(e: Expedition, action: RestAction, deckIndex?: number): void {
  if (action === 'stoke') {
    if (e.stoked) throw new Error('La hoguera ya está avivada');
    stokeFire(e.run);
    e.stoked = true;
    return;
  }
  if (e.restUsed) throw new Error('Ya descansaste en esta parada');
  if (action === 'heal') {
    for (const c of e.run.champions)
      if (!c.downed) c.hp = Math.min(c.maxHp, c.hp + Math.floor(c.maxHp * modsOf(e).restHeal));
  } else if (action === 'upgrade') {
    if (deckIndex === undefined) throw new Error('Elige una carta');
    upgradeCard(e, deckIndex);
  } else if (action === 'calm') {
    for (const c of e.run.champions) c.stress = Math.max(0, c.stress - F.rest.stressRelief);
  } else {
    healWound(e);
  }
  e.restUsed = true;
}

/** Retirada: acaba la expedición y conserva solo parte del oro. */
export function retreat(e: Expedition): void {
  const before = e.run.gold;
  e.run.gold = Math.floor(before * modsOf(e).retreatGold);
  e.retreat = { before, kept: e.run.gold };
  e.status = 'retreat';
}
