import type { ChampionId, CrisisKind, Pos, StatBlock } from '../engine/types';

/** Crisis fija y visible de cada campeón (spec de reglas núcleo §3). */
export const CRISIS: Record<ChampionId, CrisisKind> = {
  leona: 'rage',
  yasuo: 'selfish',
  lux: 'panic',
  soraka: 'despair',
  lulu: 'panic',
  janna: 'despair',
  nami: 'selfish',
  sona: 'panic',
  thresh: 'rage',
  alistar: 'selfish',
  bard: 'panic',
  blitzcrank: 'rage',
  braum: 'despair',
  karma: 'selfish',
  milio: 'panic',
  nautilus: 'rage',
  pyke: 'selfish',
  rakan: 'selfish',
  rell: 'rage',
  renata: 'despair',
  senna: 'selfish',
  seraphine: 'panic',
  taric: 'despair',
  yuumi: 'despair',
  zilean: 'selfish',
  zyra: 'selfish',
  morgana: 'despair',
};

/** Todos los campeones del juego. Una expedición lleva 4 (`Expedition.party`). */
export const CHAMPION_IDS: ChampionId[] = ['leona', 'yasuo', 'lux', 'soraka', 'lulu', 'janna', 'nami', 'sona', 'thresh',
  'alistar', 'bard', 'blitzcrank', 'braum', 'karma', 'milio', 'nautilus', 'pyke', 'rakan', 'rell', 'renata', 'senna', 'seraphine', 'taric', 'yuumi', 'zilean', 'zyra', 'morgana',
];
/** Equipo por defecto (los 4 disponibles desde el principio). Lulu, Janna, Nami, Sona y Thresh se desbloquean con Esquirlas. */
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
  janna: { id: 'janna', name: 'Janna', role: 'Apoyo / Protección', traits: ['Protección', 'Desplazamiento', 'Estrés'], maxHp: 46, startPos: 4, sweetSpot: [3, 4],
    color: '#9fe3ff', bg: '#1d4a6b', stats: { ap: 55, mr: 20 }, ddragon: 'Janna' },
  nami: { id: 'nami', name: 'Nami', role: 'Apoyo / Curación', traits: ['Curación', 'Marcas', 'Control'], maxHp: 48, startPos: 3, sweetSpot: [3, 4],
    color: '#6fe0d2', bg: '#14485c', stats: { ap: 60, mr: 15 }, ddragon: 'Nami' },
  sona: { id: 'sona', name: 'Sona', role: 'Apoyo / Acordes', traits: ['Robo de cartas', 'Curación', 'Aturdimientos'], maxHp: 45, startPos: 4, sweetSpot: [3, 4],
    color: '#8fb8ff', bg: '#2a3a7a', stats: { ap: 55, mr: 15 }, ddragon: 'Sona' },
  thresh: { id: 'thresh', name: 'Thresh', role: 'Apoyo / Control', traits: ['Atracción', 'Cargas', 'Protección'], maxHp: 66, startPos: 1, sweetSpot: [1, 2],
    color: '#7be08e', bg: '#12392a', stats: { ad: 25, ap: 30, armor: 25, mr: 20 }, ddragon: 'Thresh' },
  alistar: { id: 'alistar', name: 'Alistar', role: 'Tanque / Control', traits: ['Desplazamiento', 'Aturdimientos', 'Protección'], maxHp: 68, startPos: 1, sweetSpot: [1, 2],
    color: '#c98a4a', bg: '#4a2f1a', stats: { ad: 15, ap: 20, armor: 30, mr: 20 }, ddragon: 'Alistar' },
  bard: { id: 'bard', name: 'Bard', role: 'Apoyo / Cuidador', traits: ['Cargas', 'Robo de cartas', 'Aturdimientos'], maxHp: 48, startPos: 3, sweetSpot: [3, 4],
    color: '#e8c26a', bg: '#4a3a1a', stats: { ap: 55, mr: 15 }, ddragon: 'Bard' },
  blitzcrank: { id: 'blitzcrank', name: 'Blitzcrank', role: 'Control / Gancho', traits: ['Atracción', 'Cargas', 'Aturdimientos'], maxHp: 62, startPos: 2, sweetSpot: [1, 2],
    color: '#e0b04a', bg: '#3a3a2a', stats: { ad: 30, armor: 20, mr: 15 }, ddragon: 'Blitzcrank' },
  braum: { id: 'braum', name: 'Braum', role: 'Tanque / Protector', traits: ['Protección', 'Marcas', 'Estrés'], maxHp: 70, startPos: 1, sweetSpot: [1, 2],
    color: '#8fd0ff', bg: '#1a3a5a', stats: { ad: 20, armor: 30, mr: 25 }, ddragon: 'Braum' },
  karma: { id: 'karma', name: 'Karma', role: 'Apoyo / Mantras', traits: ['Quemadura', 'Cargas', 'Protección'], maxHp: 46, startPos: 4, sweetSpot: [3, 4],
    color: '#f0a85a', bg: '#4a2a1a', stats: { ap: 65, mr: 20 }, ddragon: 'Karma' },
  milio: { id: 'milio', name: 'Milio', role: 'Apoyo / Fuego cálido', traits: ['Quemadura', 'Estrés', 'Curación'], maxHp: 46, startPos: 4, sweetSpot: [3, 4],
    color: '#ffb36b', bg: '#5a2a1a', stats: { ap: 55, mr: 20 }, ddragon: 'Milio' },
  nautilus: { id: 'nautilus', name: 'Nautilus', role: 'Tanque / Gancho', traits: ['Atracción', 'Aturdimientos', 'Protección'], maxHp: 68, startPos: 1, sweetSpot: [1, 2],
    color: '#7fb0c8', bg: '#14303a', stats: { ad: 25, armor: 28, mr: 20 }, ddragon: 'Nautilus' },
  pyke: { id: 'pyke', name: 'Pyke', role: 'Asesino / Cazador', traits: ['Crítico', 'Cargas', 'Atracción'], maxHp: 52, startPos: 2, sweetSpot: [1, 2],
    color: '#6fe0b0', bg: '#12352a', stats: { ad: 45, critChance: 0.1, armor: 10 }, ddragon: 'Pyke' },
  rakan: { id: 'rakan', name: 'Rakan', role: 'Apoyo / Iniciador', traits: ['Desplazamiento', 'Cargas', 'Curación'], maxHp: 50, startPos: 2, sweetSpot: [2, 3],
    color: '#ff9ac8', bg: '#5a1a3a', stats: { ap: 50, mr: 15 }, ddragon: 'Rakan' },
  rell: { id: 'rell', name: 'Rell', role: 'Tanque / Jinete', traits: ['Atracción', 'Aturdimientos', 'Protección'], maxHp: 68, startPos: 1, sweetSpot: [1, 2],
    color: '#b0b8c8', bg: '#2a2f3a', stats: { ad: 25, armor: 30, mr: 25 }, ddragon: 'Rell' },
  renata: { id: 'renata', name: 'Renata Glasc', role: 'Apoyo / Magnate', traits: ['Protección', 'Estrés', 'Control'], maxHp: 46, startPos: 4, sweetSpot: [3, 4],
    color: '#e07a9a', bg: '#4a1a2a', stats: { ap: 55, mr: 20 }, ddragon: 'Renata' },
  senna: { id: 'senna', name: 'Senna', role: 'Tirador / Apoyo', traits: ['Crítico', 'Cargas', 'Curación'], maxHp: 50, startPos: 3, sweetSpot: [3, 4],
    color: '#8fe0e8', bg: '#14363a', stats: { ad: 45, critChance: 0.15, mr: 10 }, ddragon: 'Senna' },
  seraphine: { id: 'seraphine', name: 'Seraphine', role: 'Apoyo / Cantante', traits: ['Robo de cartas', 'Aturdimientos', 'Curación'], maxHp: 45, startPos: 4, sweetSpot: [3, 4],
    color: '#ff8ad0', bg: '#4a1a4a', stats: { ap: 65, mr: 15 }, ddragon: 'Seraphine' },
  taric: { id: 'taric', name: 'Taric', role: 'Apoyo / Guardián', traits: ['Curación', 'Aturdimientos', 'Protección'], maxHp: 66, startPos: 1, sweetSpot: [1, 2],
    color: '#e8a0e8', bg: '#3a1a4a', stats: { ad: 15, ap: 25, armor: 28, mr: 22 }, ddragon: 'Taric' },
  yuumi: { id: 'yuumi', name: 'Yuumi', role: 'Apoyo / Compañera', traits: ['Curación', 'Marcas', 'Estrés'], maxHp: 40, startPos: 4, sweetSpot: [3, 4],
    color: '#c8a8ff', bg: '#2a1a5a', stats: { ap: 65, mr: 15 }, ddragon: 'Yuumi' },
  zilean: { id: 'zilean', name: 'Zilean', role: 'Apoyo / Cronomante', traits: ['Quemadura', 'Robo de cartas', 'Reanimar'], maxHp: 46, startPos: 4, sweetSpot: [3, 4],
    color: '#ffd98a', bg: '#4a3a1a', stats: { ap: 65, mr: 20 }, ddragon: 'Zilean' },
  zyra: { id: 'zyra', name: 'Zyra', role: 'Mago / Apoyo', traits: ['Quemadura', 'Marcas', 'Área'], maxHp: 46, startPos: 3, sweetSpot: [3, 4],
    color: '#8fe05a', bg: '#1a3a14', stats: { ap: 70, mr: 15 }, ddragon: 'Zyra' },
  morgana: { id: 'morgana', name: 'Morgana', role: 'Apoyo / Maga oscura', traits: ['Marcas', 'Quemadura', 'Protección'], maxHp: 48, startPos: 3, sweetSpot: [3, 4],
    color: '#b87aff', bg: '#2a1a4a', stats: { ap: 65, mr: 25 }, ddragon: 'Morgana' },
};

