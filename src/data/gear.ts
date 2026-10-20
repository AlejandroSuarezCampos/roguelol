import type { StatBlock } from '../engine/types';

export type GearRarity = 'common' | 'rare' | 'legendary';

export interface GearDef {
  id: string;
  name: string;
  rarity: GearRarity;
  /** Bonos planos a las estadísticas del motor. El daño crítico se suma al multiplicador base (1,5). */
  stats: Partial<StatBlock>;
  /** Vida máxima extra (vive en la run, no en `StatBlock`). */
  hp?: number;
  /** Objeto inicial (como los de Doran): se puede elegir en el menú para empezar la expedición con él. */
  starter?: boolean;
  /** Id del objeto en Data Dragon para el icono (arte de Riot, solo enlazado). */
  itemId: number;
}

export const GEAR_RARITY_LABEL: Record<GearRarity, string> = { common: 'Común', rare: 'Raro', legendary: 'Legendario' };

/**
 * Objetos provisionales del LoL. Cualquier objeto va en cualquiera de los 6 huecos. Sin pasivas todavía: llegan con el sistema de
 * triggers de las reliquias. La penetración del motor vale contra armadura y resistencia mágica a la vez.
 */
export const GEAR_LIST: GearDef[] = [
  // Iniciales
  { id: 'blade', name: 'Hoja de Doran', rarity: 'common', stats: { ad: 8 }, hp: 15, starter: true, itemId: 1055 },
  { id: 'ring', name: 'Anillo de Doran', rarity: 'common', stats: { ap: 12 }, hp: 10, starter: true, itemId: 1056 },
  { id: 'doranshield', name: 'Escudo de Doran', rarity: 'common', stats: { armor: 10 }, hp: 15, starter: true, itemId: 1054 },
  { id: 'atlas', name: 'Atlas mundial', rarity: 'common', stats: { mr: 6, armor: 4 }, hp: 20, starter: true, itemId: 3865 },
  // Componentes
  { id: 'longsword', name: 'Espada larga', rarity: 'common', stats: { ad: 6 }, itemId: 1036 },
  { id: 'tome', name: 'Tomo amplificador', rarity: 'common', stats: { ap: 10 }, itemId: 1052 },
  { id: 'cloth', name: 'Armadura de tela', rarity: 'common', stats: { armor: 8 }, itemId: 1029 },
  { id: 'mantle', name: 'Manto antimagia', rarity: 'common', stats: { mr: 8 }, itemId: 1033 },
  { id: 'ruby', name: 'Cristal de rubí', rarity: 'common', stats: {}, hp: 20, itemId: 1028 },
  { id: 'cloak', name: 'Capa de agilidad', rarity: 'common', stats: { critChance: 0.1 }, itemId: 1018 },
  { id: 'solari', name: 'Medallón de los Solari de Hierro', rarity: 'common', stats: { mr: 12 }, hp: 25, itemId: 3190 },
  // Raros
  { id: 'titanic', name: 'Hidra titánica', rarity: 'rare', stats: { ad: 12 }, hp: 30, itemId: 3748 },
  { id: 'redemption', name: 'Redención', rarity: 'rare', stats: { ap: 22 }, hp: 15, itemId: 3107 },
  { id: 'guinsoo', name: 'Hoja de furia de Guinsoo', rarity: 'rare', stats: { ad: 18, penetration: 8 }, itemId: 3124 },
  { id: 'cleaver', name: 'Cuchilla negra', rarity: 'rare', stats: { ad: 14, penetration: 8 }, hp: 20, itemId: 3071 },
  { id: 'voidstaff', name: 'Bastón del Vacío', rarity: 'rare', stats: { ap: 18, penetration: 10 }, itemId: 3135 },
  { id: 'zhonya', name: 'Reloj de arena de Zhonya', rarity: 'rare', stats: { ap: 20, armor: 15 }, itemId: 3157 },
  { id: 'visage', name: 'Semblante espiritual', rarity: 'rare', stats: { mr: 15 }, hp: 25, itemId: 3065 },
  { id: 'randuin', name: 'Presagio de Randuin', rarity: 'rare', stats: { armor: 20 }, hp: 20, itemId: 3143 },
  { id: 'thornmail', name: 'Malla de espinas', rarity: 'rare', stats: { armor: 25 }, hp: 15, itemId: 3075 },
  { id: 'banshee', name: 'Velo del hada de la muerte', rarity: 'rare', stats: { mr: 25 }, hp: 10, itemId: 3102 },
  { id: 'bloodthirster', name: 'Sanguinaria', rarity: 'rare', stats: { ad: 18, critChance: 0.1 }, itemId: 3072 },
  // Legendarios
  { id: 'infinity', name: 'Filo infinito', rarity: 'legendary', stats: { ad: 25, critChance: 0.2, critDamage: 0.5 }, itemId: 3031 },
  { id: 'rabadon', name: 'Sombrero mortal de Rabadon', rarity: 'legendary', stats: { ap: 45 }, itemId: 3089 },
  { id: 'warmog', name: 'Armadura de Warmog', rarity: 'legendary', stats: { armor: 8 }, hp: 60, itemId: 3083 },
  { id: 'guardian', name: 'Ángel de la guarda', rarity: 'legendary', stats: { ad: 15, armor: 15 }, hp: 20, itemId: 3026 },
  { id: 'liandry', name: 'Tormento de Liandry', rarity: 'legendary', stats: { ap: 30 }, hp: 20, itemId: 6653 },
  { id: 'dominik', name: 'Recuerdos de Lord Dominik', rarity: 'legendary', stats: { ad: 20, penetration: 15, critChance: 0.1 }, itemId: 3036 },
];

export const GEAR: Record<string, GearDef> = Object.fromEntries(GEAR_LIST.map((g) => [g.id, g]));

export const gearIcon = (g: GearDef) => `https://ddragon.leagueoflegends.com/cdn/16.20.1/img/item/${g.itemId}.png`;
