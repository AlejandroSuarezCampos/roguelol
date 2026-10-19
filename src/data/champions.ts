import type { ChampionId, CrisisKind, Pos, StatBlock } from '../engine/types';

/** Crisis fija y visible de cada campeón (spec de reglas núcleo §3). */
export const CRISIS: Record<ChampionId, CrisisKind> = {
  leona: 'rage',
  yasuo: 'selfish',
  lux: 'panic',
  soraka: 'despair',
};

export const CHAMPION_IDS: ChampionId[] = ['leona', 'yasuo', 'lux', 'soraka'];

export interface ChampionDef {
  id: ChampionId;
  name: string;
  role: string;
  traits: string[];
  maxHp: number;
  /** Posición de partida: Leona al frente, Soraka al fondo. */
  startPos: Pos;
  /** Color principal y de fondo para el monograma de respaldo. */
  color: string;
  bg: string;
  stats: Partial<StatBlock>;
  /** Nombre en Data Dragon para el retrato (arte de Riot, solo enlazado). */
  ddragon: string;
}

/** Datos provisionales de la fase 1; el gear (fase 3) se sumará a `stats`. */
export const CHAMPIONS: Record<ChampionId, ChampionDef> = {
  leona: { id: 'leona', name: 'Leona', role: 'Tanque / Control', traits: ['Protección', 'Aturdimientos'], maxHp: 70, startPos: 1,
    color: '#f0b64e', bg: '#6b3a12', stats: { ad: 20, armor: 30, mr: 20 }, ddragon: 'Leona' },
  yasuo: { id: 'yasuo', name: 'Yasuo', role: 'Daño / Combos', traits: ['Cargas', 'Crítico', 'Desplazamiento'], maxHp: 55, startPos: 2,
    color: '#6fd0c4', bg: '#16414a', stats: { ad: 60, critChance: 0.2, armor: 10 }, ddragon: 'Yasuo' },
  lux: { id: 'lux', name: 'Lux', role: 'Daño mágico / Control', traits: ['Marcas', 'Área'], maxHp: 45, startPos: 3,
    color: '#f4e58a', bg: '#4a3a9c', stats: { ap: 70, mr: 15 }, ddragon: 'Lux' },
  soraka: { id: 'soraka', name: 'Soraka', role: 'Curación / Apoyo', traits: ['Curación', 'Estrés'], maxHp: 50, startPos: 4,
    color: '#c9a3ff', bg: '#2c2a6e', stats: { ap: 50, mr: 20 }, ddragon: 'Soraka' },
};

export const loadingArt = (c: ChampionDef) => `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${c.ddragon}_0.jpg`;
