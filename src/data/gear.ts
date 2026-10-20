import type { RelicEvent, StatBlock } from '../engine/types';
import type { RelicDef, RelicEffect } from './relics';

export type GearRarity = 'common' | 'rare' | 'legendary';

/**
 * Pasiva (o desventaja) de un objeto: un disparador como los de las reliquias, ligado a quien lo lleva. Solo reacciona a eventos cuyo
 * protagonista es el portador (sus cartas, sus críticos, los golpes que recibe, su caída). `combatEndHeal`: cura al portador al ganar.
 */
export interface GearTrigger {
  text: string;
  on?: RelicEvent['type'];
  when?: RelicDef['when'];
  effects?: RelicEffect[];
  limit?: 'turn' | 'combat' | 'expedition';
  combatEndHeal?: number;
}

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
  passive?: GearTrigger;
  /** Desventaja: se enseña siempre, en rojo (spec §7). */
  drawback?: GearTrigger;
}

export const GEAR_RARITY_LABEL: Record<GearRarity, string> = { common: 'Común', rare: 'Raro', legendary: 'Legendario' };

/**
 * Objetos provisionales del LoL. Cualquier objeto va en cualquiera de los 6 huecos; los raros y legendarios tienen pasiva (ver
 * `TRIGGERS`). La penetración del motor vale contra armadura y resistencia mágica a la vez.
 */
export const GEAR_LIST: GearDef[] = [
  // Iniciales
  { id: 'blade', name: 'Hoja de Doran', rarity: 'common', stats: { ad: 5 }, starter: true, itemId: 1055 },
  { id: 'ring', name: 'Anillo de Doran', rarity: 'common', stats: { ap: 8 }, starter: true, itemId: 1056 },
  { id: 'doranshield', name: 'Escudo de Doran', rarity: 'common', stats: { armor: 6 }, hp: 2, starter: true, itemId: 1054 },
  { id: 'atlas', name: 'Atlas mundial', rarity: 'common', stats: { mr: 5, armor: 3 }, hp: 2, starter: true, itemId: 3865 },
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
  { id: 'infinity', name: 'Filo infinito', rarity: 'legendary', stats: { ad: 25, critChance: 0.2, critDamage: 0.5, armor: -10 }, itemId: 3031 },
  { id: 'rabadon', name: 'Sombrero mortal de Rabadon', rarity: 'legendary', stats: { ap: 45 }, itemId: 3089 },
  { id: 'warmog', name: 'Armadura de Warmog', rarity: 'legendary', stats: { armor: 8 }, hp: 60, itemId: 3083 },
  { id: 'guardian', name: 'Ángel de la guarda', rarity: 'legendary', stats: { ad: 15, armor: 15 }, hp: 20, itemId: 3026 },
  { id: 'liandry', name: 'Tormento de Liandry', rarity: 'legendary', stats: { ap: 30 }, hp: 20, itemId: 6653 },
  { id: 'dominik', name: 'Recuerdos de Lord Dominik', rarity: 'legendary', stats: { ad: 20, penetration: 15, critChance: 0.1 }, itemId: 3036 },
];

const firstTurn = (st: { turn: number }) => st.turn === 1;
const isAttack = (_s: unknown, ev: RelicEvent) => ev.type === 'cardPlayed' && ev.cardType === 'attack';

/** Pasivas y desventajas provisionales, inspiradas en las del LoL. */
const TRIGGERS: Record<string, Pick<GearDef, 'passive' | 'drawback'>> = {
  titanic: { passive: { text: 'Al jugar un ataque, inflige 3 de daño verdadero a todos los enemigos (una vez por turno).', on: 'cardPlayed', when: isAttack, limit: 'turn', effects: [{ type: 'damage', amount: 3, to: 'allEnemies' }] } },
  redemption: { passive: { text: 'Al empezar el combate, todos los aliados recuperan 6 de vida.', on: 'turnStart', when: firstTurn, limit: 'combat', effects: [{ type: 'heal', amount: 6, to: 'allies' }] } },
  guinsoo: { passive: { text: 'Cada ataque de su portador le da 1 Carga.', on: 'cardPlayed', when: isAttack, effects: [{ type: 'status', status: 'charge', stacks: 1, to: 'wearer' }] } },
  cleaver: { passive: { text: 'Sus críticos aplican 1 Vulnerable al objetivo.', on: 'criticalHit', effects: [{ type: 'status', status: 'vulnerable', stacks: 1, to: 'target' }] } },
  voidstaff: { passive: { text: 'Al consumir Marcas o Cargas, +1 de energía (una vez por turno).', on: 'statusConsumed', limit: 'turn', effects: [{ type: 'energy', amount: 1 }] } },
  zhonya: { passive: { text: 'Una vez por combate, si recibe un golpe con menos de la mitad de vida, gana 20 de bloqueo.', on: 'allyHit', limit: 'combat', when: (_s, _ev, w) => !!w && !w.downed && w.hp < w.maxHp / 2, effects: [{ type: 'block', amount: 20, to: 'wearer' }] } },
  visage: { passive: { text: 'Al empezar cada turno, recupera 3 de vida.', on: 'turnStart', effects: [{ type: 'heal', amount: 3, to: 'wearer' }] } },
  randuin: { passive: { text: 'Al recibir un golpe crítico, gana 10 de bloqueo.', on: 'allyHit', when: (_s, ev) => ev.type === 'allyHit' && ev.crit, effects: [{ type: 'block', amount: 10, to: 'wearer' }] } },
  thornmail: { passive: { text: 'Al recibir un golpe, inflige 4 de daño verdadero al atacante.', on: 'allyHit', effects: [{ type: 'damage', amount: 4, to: 'attacker' }] } },
  banshee: { passive: { text: 'Empieza cada combate con 12 de bloqueo.', on: 'turnStart', when: firstTurn, limit: 'combat', effects: [{ type: 'block', amount: 12, to: 'wearer' }] } },
  bloodthirster: { passive: { text: 'Al hacer crítico, recupera 5 de vida.', on: 'criticalHit', effects: [{ type: 'heal', amount: 5, to: 'wearer' }] } },
  infinity: {
    passive: { text: 'Al hacer crítico, gana 1 Carga.', on: 'criticalHit', effects: [{ type: 'status', status: 'charge', stacks: 1, to: 'wearer' }] },
    drawback: { text: '−10 de armadura (ya descontada).' },
  },
  rabadon: { drawback: { text: 'Cada carta de su portador le da +2 de estrés.', on: 'cardPlayed', effects: [{ type: 'stress', amount: 2, to: 'wearer' }] } },
  warmog: { passive: { text: 'Al ganar un combate, su portador recupera 12 de vida.', combatEndHeal: 12 } },
  guardian: { passive: { text: 'Una vez por expedición, al caer, se levanta con el 30 % de su vida.', on: 'championDowned', limit: 'expedition', effects: [{ type: 'revive', fraction: 0.3 }] } },
  liandry: { passive: { text: 'Cada carta de su portador aplica 1 Quemadura al enemigo con menos vida.', on: 'cardPlayed', effects: [{ type: 'status', status: 'burn', stacks: 1, to: 'weakestEnemy' }] } },
  dominik: {
    passive: { text: 'Sus críticos infligen 6 de daño verdadero extra al objetivo.', on: 'criticalHit', effects: [{ type: 'damage', amount: 6, to: 'target' }] },
    drawback: { text: 'Cada crítico le da +3 de estrés.', on: 'criticalHit', effects: [{ type: 'stress', amount: 3, to: 'wearer' }] },
  },
};
for (const g of GEAR_LIST) Object.assign(g, TRIGGERS[g.id]);

export const GEAR: Record<string, GearDef> = Object.fromEntries(GEAR_LIST.map((g) => [g.id, g]));

export const gearIcon = (g: GearDef) => `https://ddragon.leagueoflegends.com/cdn/16.20.1/img/item/${g.itemId}.png`;
