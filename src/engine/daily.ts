import { CHAMPION_IDS, PARTY_SIZE } from '../data/champions';
import { GEAR_LIST } from '../data/gear';
import { RELIC_LIST } from '../data/relics';
import { ASCENSION_LEVELS } from '../data/ascension';
import { OPEN_SETUP } from '../data/unlocks';
import { createExpedition, floorReached, type Expedition } from './expedition';
import { equip } from './gear';
import { addPotion } from './potions';
import { Rng } from './rng';
import type { ChampionId, PotionId } from './types';

export type DailyModifierId = 'rich' | 'kitted' | 'relic' | 'potions' | 'bare';

export interface DailyModifier {
  id: DailyModifierId;
  name: string;
  text: string;
}

export const DAILY_MODIFIERS: DailyModifier[] = [
  { id: 'rich', name: 'Bolsa llena', text: 'Empiezas con 150 de oro.' },
  { id: 'kitted', name: 'Equipados', text: 'Cada campeón empieza con un objeto inicial.' },
  { id: 'relic', name: 'Don de la Niebla', text: 'Empiezas con una reliquia al azar.' },
  { id: 'potions', name: 'Alquimista', text: 'Empiezas con el cinturón de pociones lleno.' },
  { id: 'bare', name: 'Sin red', text: 'Sin ventajas: solo vuestra habilidad.' },
];

/** Marca de un reto del modo diario / semilla propia dentro de la expedición. */
export interface DailyInfo {
  /** `YYYY-MM-DD` (reto del día) o `seed:texto` (semilla propia). */
  key: string;
  modifier: DailyModifierId;
}

/** Hash de texto a semilla de 31 bits (FNV-1a). Nunca 0. */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return ((h >>> 0) & 0x7fffffff) || 1;
}

export const dateKey = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const isDateKey = (k: string) => /^\d{4}-\d{2}-\d{2}$/.test(k);
export const customKey = (text: string) => `seed:${text.trim().slice(0, 24)}`;

/** Todo lo que fija un reto, derivado solo de su clave: equipo, Ascensión y modificador. */
export function dailyPlan(key: string): { seed: number; party: ChampionId[]; ascension: number; modifier: DailyModifier } {
  const seed = hashSeed(`shattered-runeterra:${key}`);
  const rng = new Rng(seed);
  const party = rng.shuffle(CHAMPION_IDS).slice(0, PARTY_SIZE);
  const ascension = rng.int(Math.min(5, ASCENSION_LEVELS.length + 1));
  const modifier = rng.pick(DAILY_MODIFIERS);
  return { seed, party, ascension, modifier };
}

/** Expedición del reto: todos los campeones y cartas disponibles, equipo y modificador fijos. */
export function createDailyExpedition(key: string): Expedition {
  const { seed, party, ascension, modifier } = dailyPlan(key);
  const e = createExpedition(seed, ascension, { ...OPEN_SETUP, party });
  e.daily = { key, modifier: modifier.id };
  const rng = new Rng(seed ^ 0x5bd1e995);
  if (modifier.id === 'rich') e.run.gold += 150;
  else if (modifier.id === 'kitted') {
    const starters = GEAR_LIST.filter((g) => g.starter);
    for (const c of e.run.champions) {
      const g = rng.pick(starters).id;
      e.inventory.push(g);
      equip(e, c.id, g);
    }
  } else if (modifier.id === 'relic') e.run.relics.push(rng.pick(RELIC_LIST.filter((r) => r.rarity === 'common' || r.rarity === 'rare')).id);
  else if (modifier.id === 'potions') for (const p of ['health', 'iron', 'sorcery'] as PotionId[]) addPotion(e.run.belt, p);
  return e;
}

/** Puntuación de un reto terminado: progreso, élites vencidas, supervivientes y bonus por ganar. */
export function dailyScore(e: Expedition): number {
  return floorReached(e) * 10 + e.stats.elites * 15 + e.run.champions.length * 25 + (e.status === 'victory' ? 200 : 0);
}
