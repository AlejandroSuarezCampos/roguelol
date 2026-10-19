import type { CombatState, RelicEvent } from '../engine/types';

export type RelicRarity = 'common' | 'rare' | 'legendary';

/** A quién afecta un efecto. `owner`: el protagonista del evento (quien juega la carta, consume el estado o cae). */
export type AllyTarget = 'allies' | 'owner' | 'others';
export type RelicEffect =
  | { type: 'block'; amount: number; to: AllyTarget }
  | { type: 'stress'; amount: number; to: AllyTarget }
  /** Daño verdadero; con `perStack`, por cada acumulación consumida (evento `statusConsumed`). */
  | { type: 'damage'; amount: number; to: 'allEnemies' | 'weakestEnemy'; perStack?: boolean }
  | { type: 'energy'; amount: number }
  /** Genera un evento nuevo para las reliquias. Solo cuenta si la reliquia declara `chains: true`; el tope por vaciado lo acota. */
  | { type: 'emit'; event: RelicEvent };

export interface RelicDef {
  id: string;
  name: string;
  rarity: RelicRarity;
  text: string;
  /** Evento de combate que la dispara. Excluyente con `run`. */
  on?: RelicEvent['type'];
  /** Condición extra, evaluada con el estado ya actualizado por el evento. */
  when?: (s: CombatState, ev: RelicEvent) => boolean;
  effects?: RelicEffect[];
  /** Máximo de activaciones: una por turno o una por combate. */
  limit?: 'turn' | 'combat';
  /** Si es true, los efectos de esta reliquia pueden generar nuevos eventos para las reliquias (siempre con el tope por vaciado). */
  chains?: boolean;
  /** Efecto de expedición (fuera del combate): al ganar un combate o al entrar en un nodo. */
  run?: { on: 'combatEnd' | 'nodeEntered'; healAll?: number; mist?: number };
}

const firstTurn = (s: CombatState) => s.turn === 1;

/** 9 reliquias provisionales. Las 4 primeras vienen de la spec y del prototipo. */
export const RELIC_LIST: RelicDef[] = [
  { id: 'heart', name: 'Corazón incandescente', rarity: 'common', text: 'Al ganar un combate, cada campeón en pie recupera 6 de vida.', run: { on: 'combatEnd', healAll: 6 } },
  { id: 'emblem', name: 'Emblema del asalto', rarity: 'rare', text: 'Al jugar tu tercer ataque del turno, inflige 5 de daño verdadero a todos los enemigos.',
    on: 'cardPlayed', limit: 'turn', when: (s) => s.relicState.attacksThisTurn === 3, effects: [{ type: 'damage', amount: 5, to: 'allEnemies' }] },
  { id: 'voidshard', name: 'Fragmento del Vacío', rarity: 'legendary', text: 'Al consumir Marcas o Cargas, inflige 3 de daño verdadero por cada una al enemigo más débil, a cambio de +4 de estrés al campeón.',
    on: 'statusConsumed', effects: [{ type: 'damage', amount: 3, to: 'weakestEnemy', perStack: true }, { type: 'stress', amount: 4, to: 'owner' }] },
  { id: 'banner', name: 'Estandarte de la compañía', rarity: 'rare', text: 'Al jugar cartas de 3 campeones distintos en un turno, el último gana 6 de bloqueo.',
    on: 'cardPlayed', limit: 'turn', when: (s) => s.relicState.ownersThisTurn.length === 3, effects: [{ type: 'block', amount: 6, to: 'owner' }] },
  { id: 'stone', name: 'Talismán de piedra', rarity: 'common', text: 'Al empezar el combate, todos los aliados ganan 5 de bloqueo.',
    on: 'turnStart', limit: 'combat', when: firstTurn, effects: [{ type: 'block', amount: 5, to: 'allies' }] },
  { id: 'clock', name: 'Reloj roto', rarity: 'rare', text: 'Empiezas cada combate con 1 de energía extra en el primer turno.',
    on: 'turnStart', limit: 'combat', when: firstTurn, effects: [{ type: 'energy', amount: 1 }] },
  { id: 'bowl', name: 'Cuenco de plata', rarity: 'rare', text: 'Al empezar tu turno, si algún campeón está al límite (75 de estrés o más), todos pierden 5 de estrés.',
    on: 'turnStart', limit: 'turn', when: (s) => s.units.some((u) => u.side === 'ally' && !u.downed && u.stress >= 75), effects: [{ type: 'stress', amount: -5, to: 'allies' }] },
  { id: 'fang', name: 'Colmillo del lobo', rarity: 'common', text: 'Cuando un aliado cae, los demás ganan 8 de bloqueo (una vez por turno).',
    on: 'championDowned', limit: 'turn', effects: [{ type: 'block', amount: 8, to: 'others' }] },
  { id: 'lamp', name: 'Lámpara de la Niebla', rarity: 'common', text: 'Al entrar en un nodo, la Niebla sube 3 menos.', run: { on: 'nodeEntered', mist: -3 } },
];

export const RELICS: Record<string, RelicDef> = Object.fromEntries(RELIC_LIST.map((r) => [r.id, r]));

export const RELIC_RARITY_LABEL: Record<RelicRarity, string> = { common: 'Común', rare: 'Rara', legendary: 'Legendaria' };
