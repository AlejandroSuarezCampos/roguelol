import type { ChampionId, CrisisKind, Pos, StatBlock } from '../engine/types';

/** Crisis fija y visible de cada campeón (spec de reglas núcleo §3). */
export const CRISIS: Record<ChampionId, CrisisKind> = {
  leona: 'rage',
  yasuo: 'selfish',
  lux: 'panic',
  soraka: 'despair',
  lulu: 'panic',
};

/** Todos los campeones del juego. Una expedición lleva 4 (`Expedition.party`). */
export const CHAMPION_IDS: ChampionId[] = ['leona', 'yasuo', 'lux', 'soraka', 'lulu'];
/** Equipo por defecto (los 4 disponibles desde el principio). Lulu se desbloquea con Esquirlas. */
export const DEFAULT_PARTY: ChampionId[] = ['leona', 'yasuo', 'lux', 'soraka'];
export const PARTY_SIZE = 4;

export interface ChampionDef {
  id: ChampionId;
  name: string;
  role: string;
  traits: string[];
  maxHp: number;
  /** Posición de partida: Leona al frente, Soraka al fondo. */
  startPos: Pos;
  /** Posiciones donde sus cartas ganan el bonus (se muestra en la preparación). */
  sweetSpot: Pos[];
  /** Color principal y de fondo para el monograma de respaldo. */
  color: string;
  bg: string;
  stats: Partial<StatBlock>;
  /** Nombre en Data Dragon para el retrato (arte de Riot, solo enlazado). */
  ddragon: string;
}

/** Datos provisionales de la fase 1; el gear (fase 3) se sumará a `stats`. */
export const CHAMPIONS: Record<ChampionId, ChampionDef> = {
  leona: { id: 'leona', name: 'Leona', role: 'Tanque / Control', traits: ['Protección', 'Aturdimientos'], maxHp: 70, startPos: 1, sweetSpot: [1, 2],
    color: '#f0b64e', bg: '#6b3a12', stats: { ad: 20, armor: 30, mr: 20 }, ddragon: 'Leona' },
  yasuo: { id: 'yasuo', name: 'Yasuo', role: 'Daño / Combos', traits: ['Cargas', 'Crítico', 'Desplazamiento'], maxHp: 55, startPos: 2, sweetSpot: [2, 3],
    color: '#6fd0c4', bg: '#16414a', stats: { ad: 60, critChance: 0.2, armor: 10 }, ddragon: 'Yasuo' },
  lux: { id: 'lux', name: 'Lux', role: 'Daño mágico / Control', traits: ['Marcas', 'Área'], maxHp: 45, startPos: 3, sweetSpot: [3, 4],
    color: '#f4e58a', bg: '#4a3a9c', stats: { ap: 70, mr: 15 }, ddragon: 'Lux' },
  soraka: { id: 'soraka', name: 'Soraka', role: 'Curación / Apoyo', traits: ['Curación', 'Estrés'], maxHp: 50, startPos: 4, sweetSpot: [3, 4],
    color: '#c9a3ff', bg: '#2c2a6e', stats: { ap: 50, mr: 20 }, ddragon: 'Soraka' },
  lulu: { id: 'lulu', name: 'Lulu', role: 'Apoyo / Control', traits: ['Vulnerable', 'Protección', 'Robo de cartas'], maxHp: 48, startPos: 3, sweetSpot: [3, 4],
    color: '#d9a6ff', bg: '#4a2a6e', stats: { ap: 60, mr: 15 }, ddragon: 'Lulu' },
};

