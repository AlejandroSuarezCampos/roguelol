import type { CombatState, RelicEvent, StatusId, Unit } from '../engine/types';

/** `boss`: solo se eligen tras vencer a un jefe (1 de 3), nunca salen en botín, tienda ni tesoros. */
export type RelicRarity = 'common' | 'rare' | 'legendary' | 'boss';

/**
 * A quién afecta un efecto. `owner`: el protagonista del evento (quien juega la carta, consume el estado, cae o recibe el golpe).
 * `wearer`: quien lleva el objeto (solo pasivas de gear).
 */
export type AllyTarget = 'allies' | 'owner' | 'others' | 'wearer';
/** Enemigo afectado: todos, el de menos vida, el objetivo del crítico o quien acaba de golpear. */
export type EnemyTarget = 'allEnemies' | 'weakestEnemy' | 'target' | 'attacker';
export type RelicEffect =
  | { type: 'block'; amount: number; to: AllyTarget }
  | { type: 'stress'; amount: number; to: AllyTarget }
  | { type: 'heal'; amount: number; to: AllyTarget }
  /** Daño verdadero; con `perStack`, por cada acumulación consumida (evento `statusConsumed`). */
  | { type: 'damage'; amount: number; to: EnemyTarget; perStack?: boolean }
  | { type: 'status'; status: StatusId; stacks: number; to: 'wearer' | EnemyTarget }
  /** Levanta al portador derribado con esa fracción de su vida máxima. */
  | { type: 'revive'; fraction: number }
  | { type: 'energy'; amount: number }
  | { type: 'draw'; amount: number }
  /** Genera un evento nuevo para las reliquias. Solo cuenta si la reliquia declara `chains: true`; el tope por vaciado lo acota. */
  | { type: 'emit'; event: RelicEvent };

export interface RelicDef {
  id: string;
  name: string;
  rarity: RelicRarity;
  text: string;
  /** Evento de combate que la dispara (puede convivir con `run`, p. ej. una reliquia de jefe con un coste de niebla). */
  on?: RelicEvent['type'];
  /** Condición extra, evaluada con el estado ya actualizado por el evento (`wearer`: portador, en las pasivas de gear). */
  when?: (s: CombatState, ev: RelicEvent, wearer?: Unit) => boolean;
  effects?: RelicEffect[];
  /** Máximo de activaciones: una por turno o una por combate. */
  limit?: 'turn' | 'combat';
  /** Si es true, los efectos de esta reliquia pueden generar nuevos eventos para las reliquias (siempre con el tope por vaciado). */
  chains?: boolean;
  /** Efecto de expedición (fuera del combate): al ganar un combate o al entrar en un nodo. */
  run?: { on: 'combatEnd' | 'nodeEntered'; healAll?: number; mist?: number };
}

const firstTurn = (s: CombatState) => s.turn === 1;

/** Reliquias provisionales. Las 4 primeras vienen de la spec y del prototipo. */
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
  { id: 'lamp', name: 'Lámpara de la Niebla', rarity: 'common', text: 'Al entrar en un nodo, la Niebla sube 2 menos.', run: { on: 'nodeEntered', mist: -2 } },
  // Nuevas: usan los eventos de crítico, golpe recibido y umbral de estrés.
  { id: 'flash', name: 'Destello hextech', rarity: 'rare', text: 'Al empezar el combate, roba 1 carta extra.',
    on: 'turnStart', limit: 'combat', when: firstTurn, effects: [{ type: 'draw', amount: 1 }] },
  { id: 'ward', name: 'Tótem de guardia', rarity: 'common', text: 'Al empezar el combate, aplica 1 Marca a todos los enemigos.',
    on: 'turnStart', limit: 'combat', when: firstTurn, effects: [{ type: 'status', status: 'mark', stacks: 1, to: 'allEnemies' }] },
  { id: 'tear', name: 'Lágrima de la diosa', rarity: 'common', text: 'La primera vez que consumes Marcas o Cargas cada turno, el lanzador gana 5 de bloqueo.',
    on: 'statusConsumed', limit: 'turn', effects: [{ type: 'block', amount: 5, to: 'owner' }] },
  { id: 'quicksilver', name: 'Fajín de mercurio', rarity: 'rare', text: 'Una vez por combate, cuando un campeón llega a «al límite» (75 de estrés), pierde 15.',
    on: 'stressThreshold', limit: 'combat', when: (_s, ev) => ev.type === 'stressThreshold' && ev.tier === 'edge', effects: [{ type: 'stress', amount: -15, to: 'owner' }] },
  { id: 'bramble', name: 'Chaleco de zarzas', rarity: 'common', text: 'Al recibir un golpe crítico, inflige 6 de daño verdadero al atacante.',
    on: 'allyHit', when: (_s, ev) => ev.type === 'allyHit' && ev.crit, effects: [{ type: 'damage', amount: 6, to: 'attacker' }] },
  { id: 'essence', name: 'Segador de esencia', rarity: 'rare', text: 'Al hacer un crítico, +1 de energía (una vez por turno).',
    on: 'criticalHit', limit: 'turn', effects: [{ type: 'energy', amount: 1 }] },
  { id: 'sunfire', name: 'Égida de fuego solar', rarity: 'legendary', text: 'Al empezar cada turno, aplica 1 Quemadura a todos los enemigos.',
    on: 'turnStart', effects: [{ type: 'status', status: 'burn', stacks: 1, to: 'allEnemies' }] },
  // De jefe: se elige una de tres tras vencer a los jefes de los actos 1 y 2. Muy fuertes, casi todas con un coste.
  { id: 'baronhand', name: 'Mano del Barón', rarity: 'boss', text: '+1 de energía cada turno. Coste: al empezar cada turno, todos ganan 2 de estrés.',
    on: 'turnStart', effects: [{ type: 'energy', amount: 1 }, { type: 'stress', amount: 2, to: 'allies' }] },
  { id: 'elderbreath', name: 'Aliento del Anciano', rarity: 'boss', text: 'Al empezar cada turno, inflige 4 de daño verdadero a todos los enemigos. Coste: al empezar cada turno, todos ganan 3 de estrés.',
    on: 'turnStart', effects: [{ type: 'damage', amount: 4, to: 'allEnemies' }, { type: 'stress', amount: 3, to: 'allies' }] },
  { id: 'mistcrown', name: 'Corona de la Niebla', rarity: 'boss', text: '+1 de energía cada turno. Coste: al entrar en un nodo, la Niebla sube 3 más.',
    on: 'turnStart', effects: [{ type: 'energy', amount: 1 }], run: { on: 'nodeEntered', mist: 3 } },
  { id: 'ruinedblade', name: 'Espada del Rey Arruinado', rarity: 'boss', text: 'Al hacer un crítico, inflige 10 de daño verdadero a todos los enemigos (una vez por turno).',
    on: 'criticalHit', limit: 'turn', effects: [{ type: 'damage', amount: 10, to: 'allEnemies' }] },
  { id: 'shadowpact', name: 'Pacto de las Sombras', rarity: 'boss', text: 'Roba 1 carta extra cada turno. Coste: al entrar en un nodo, la Niebla sube 2 más.',
    on: 'turnStart', effects: [{ type: 'draw', amount: 1 }], run: { on: 'nodeEntered', mist: 2 } },
];

export const RELICS: Record<string, RelicDef> = Object.fromEntries(RELIC_LIST.map((r) => [r.id, r]));

export const RELIC_RARITY_LABEL: Record<RelicRarity, string> = { common: 'Común', rare: 'Rara', legendary: 'Legendaria', boss: 'De jefe' };
