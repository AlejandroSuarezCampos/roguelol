import type { StatBlock } from '../engine/types';

export type GearSlot = 'weapon' | 'armor';
export type GearRarity = 'common' | 'rare' | 'legendary';

export interface GearDef {
  id: string;
  name: string;
  slot: GearSlot;
  rarity: GearRarity;
  /** Bonos planos a las estadísticas del motor. El daño crítico se suma al multiplicador base (1,5). */
  stats: Partial<StatBlock>;
  /** Vida máxima extra (vive en la run, no en `StatBlock`). */
  hp?: number;
  /** Id del objeto en Data Dragon para el icono (arte de Riot, solo enlazado). */
  itemId: number;
}

export const SLOT_LABEL: Record<GearSlot, string> = { weapon: 'Arma', armor: 'Armadura' };
export const GEAR_RARITY_LABEL: Record<GearRarity, string> = { common: 'Común', rare: 'Raro', legendary: 'Legendario' };

/** 12 objetos provisionales (nombres del prototipo). Sin pasivas todavía: llegan con el sistema de triggers de las reliquias. */
export const GEAR_LIST: GearDef[] = [
  { id: 'blade', name: 'Hoja de Doran', slot: 'weapon', rarity: 'common', stats: { ad: 8 }, hp: 15, itemId: 1055 },
  { id: 'ring', name: 'Anillo de Doran', slot: 'weapon', rarity: 'common', stats: { ap: 12 }, hp: 10, itemId: 1056 },
  { id: 'titanic', name: 'Hidra titánica', slot: 'weapon', rarity: 'rare', stats: { ad: 12 }, hp: 30, itemId: 3748 },
  { id: 'redemption', name: 'Redención', slot: 'weapon', rarity: 'rare', stats: { ap: 22 }, hp: 15, itemId: 3107 },
  { id: 'guinsoo', name: 'Hoja de furia de Guinsoo', slot: 'weapon', rarity: 'rare', stats: { ad: 18, penetration: 8 }, itemId: 3124 },
  { id: 'infinity', name: 'Filo infinito', slot: 'weapon', rarity: 'legendary', stats: { ad: 25, critChance: 0.2, critDamage: 0.5 }, itemId: 3031 },
  { id: 'rabadon', name: 'Sombrero mortal de Rabadon', slot: 'weapon', rarity: 'legendary', stats: { ap: 45 }, itemId: 3089 },
  { id: 'doranshield', name: 'Escudo de Doran', slot: 'armor', rarity: 'common', stats: { armor: 10 }, hp: 15, itemId: 1054 },
  { id: 'solari', name: 'Medallón de los Solari de Hierro', slot: 'armor', rarity: 'common', stats: { mr: 12 }, hp: 25, itemId: 3190 },
  { id: 'thornmail', name: 'Malla de espinas', slot: 'armor', rarity: 'rare', stats: { armor: 25 }, hp: 15, itemId: 3075 },
  { id: 'banshee', name: 'Velo del hada de la muerte', slot: 'armor', rarity: 'rare', stats: { mr: 25 }, hp: 10, itemId: 3102 },
  { id: 'warmog', name: 'Armadura de Warmog', slot: 'armor', rarity: 'legendary', stats: { armor: 8 }, hp: 60, itemId: 3083 },
];

export const GEAR: Record<string, GearDef> = Object.fromEntries(GEAR_LIST.map((g) => [g.id, g]));

export const gearIcon = (g: GearDef) => `https://ddragon.leagueoflegends.com/cdn/16.20.1/img/item/${g.itemId}.png`;
