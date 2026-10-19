import type { CardDef, Effect } from '../engine/types';

/**
 * 32 cartas provisionales (8 por campeón). Solo usan los efectos que el motor ya resuelve.
 * Números provisionales: se afinan con tests/balance. Los textos deben coincidir con los efectos.
 */
const phys = (amount: number, over: Partial<Extract<Effect, { type: 'damage' }>> = {}): Effect => ({
  type: 'damage', amount, damageType: 'physical', scaling: { stat: 'ad', ratio: 0.1 }, ...over,
});
const magic = (amount: number, over: Partial<Extract<Effect, { type: 'damage' }>> = {}): Effect => ({
  type: 'damage', amount, damageType: 'magic', scaling: { stat: 'ap', ratio: 0.1 }, ...over,
});
const block = (amount: number, on?: 'self'): Effect => ({ type: 'block', amount, on });
const status = (st: 'mark' | 'stun' | 'charge' | 'vulnerable' | 'burn', stacks: number, on?: 'self'): Effect => ({
  type: 'applyStatus', status: st, stacks, on,
});

export const CARD_LIST: CardDef[] = [
  // ——— Leona: tanque, brilla en 1–2 ———
  { id: 'l1', name: 'Escudo del amanecer', owner: 'leona', cost: 1, type: 'attack', target: 'enemy', rarity: 'common', keywords: [],
    text: 'Inflige 6 y aplica Aturdido. Desde 1–2: +3.', effects: [phys(6), status('stun', 1)], idealPositions: [1, 2], positionBonus: [phys(3, { scaling: undefined })] },
  { id: 'l2', name: 'Escudo del Sol', owner: 'leona', cost: 1, type: 'defense', target: 'ally', rarity: 'common', keywords: ['block'],
    text: 'Otorga 8 de bloqueo.', effects: [block(8)] },
  { id: 'l3', name: 'Eclipse', owner: 'leona', cost: 2, type: 'skill', target: 'self', rarity: 'rare', keywords: ['block', 'displacement'],
    text: 'Gana 12 de bloqueo y avanza a la posición 1.', effects: [block(12), { type: 'move', to: 1 }] },
  { id: 'l4', name: 'Hoja del cénit', owner: 'leona', cost: 2, type: 'attack', target: 'enemy', rarity: 'rare', keywords: ['displacement'],
    text: 'Inflige 9 y avanza a la posición 1.', effects: [phys(9), { type: 'move', to: 1, on: 'self' }] },
  { id: 'l5', name: 'Aura solar', owner: 'leona', cost: 1, type: 'support', target: 'allAllies', rarity: 'common', keywords: ['block'],
    text: 'Otorga 4 de bloqueo a todos los aliados.', effects: [block(4)] },
  { id: 'l6', name: 'Baluarte', owner: 'leona', cost: 1, type: 'defense', target: 'self', rarity: 'common', keywords: ['block'],
    text: 'Gana 7 de bloqueo. Desde 1–2: +3.', effects: [block(7)], idealPositions: [1, 2], positionBonus: [block(3)] },
  { id: 'l7', name: 'Embate radiante', owner: 'leona', cost: 2, type: 'attack', target: 'enemy', rarity: 'common', keywords: [],
    text: 'Inflige 12. Desde 1: +4.', effects: [phys(12)], idealPositions: [1], positionBonus: [phys(4, { scaling: undefined })] },
  { id: 'l8', name: 'Llamarada solar', owner: 'leona', cost: 3, type: 'skill', target: 'allEnemies', rarity: 'epic', keywords: [],
    text: 'Inflige 8 y aplica Aturdido a todos los enemigos.', effects: [phys(8), status('stun', 1)] },

  // ——— Yasuo: daño y combos con Carga, brilla en 2–3 ———
  { id: 'y1', name: 'Tempestad de acero', owner: 'yasuo', cost: 1, type: 'attack', target: 'enemy', rarity: 'common', keywords: ['charge'],
    text: 'Inflige 7 y gana 1 Carga. Desde 2–3: +3.', effects: [phys(7), status('charge', 1, 'self')], idealPositions: [2, 3], positionBonus: [phys(3, { scaling: undefined })] },
  { id: 'y2', name: 'Vendaval', owner: 'yasuo', cost: 2, type: 'attack', target: 'enemy', rarity: 'rare', keywords: [],
    text: 'Inflige 12. Puede ser crítico.', effects: [phys(12, { canCrit: true })] },
  { id: 'y3', name: 'Muro de viento', owner: 'yasuo', cost: 1, type: 'defense', target: 'self', rarity: 'common', keywords: ['block'],
    text: 'Gana 7 de bloqueo.', effects: [block(7)] },
  { id: 'y4', name: 'Hoja cortante', owner: 'yasuo', cost: 0, type: 'attack', target: 'enemy', rarity: 'common', keywords: ['displacement'],
    text: 'Inflige 4 y empuja al objetivo una posición.', effects: [phys(4), { type: 'move', by: 1 }] },
  { id: 'y5', name: 'Filo del viento', owner: 'yasuo', cost: 1, type: 'attack', target: 'enemy', rarity: 'common', keywords: [],
    text: 'Inflige 5 dos veces.', effects: [phys(5), phys(5)] },
  { id: 'y6', name: 'Ráfaga cortante', owner: 'yasuo', cost: 1, type: 'attack', target: 'enemy', rarity: 'common', keywords: ['charge'],
    text: 'Inflige 4 y gana 2 Cargas.', effects: [phys(4), status('charge', 2, 'self')] },
  { id: 'y7', name: 'Último aliento', owner: 'yasuo', cost: 2, type: 'attack', target: 'enemy', rarity: 'rare', keywords: ['charge'],
    text: 'Inflige 6 más 5 por cada Carga, que consume.',
    effects: [phys(6, { consumeStatus: { status: 'charge', from: 'self', bonusPerStack: 5 } })] },
  { id: 'y8', name: 'Camino del Errante', owner: 'yasuo', cost: 1, type: 'skill', target: 'self', rarity: 'rare', keywords: ['block', 'charge'],
    text: 'Gana 8 de bloqueo y 1 Carga.', effects: [block(8), status('charge', 1, 'self')] },

  // ——— Lux: magia y Marcas, brilla en 3–4 ———
  { id: 'x1', name: 'Enlace de luz', owner: 'lux', cost: 1, type: 'skill', target: 'enemy', rarity: 'common', keywords: ['mark'],
    text: 'Inflige 5 y aplica 1 Marca. Desde 3–4: +1 Marca.', effects: [magic(5), status('mark', 1)], idealPositions: [3, 4], positionBonus: [status('mark', 1)] },
  { id: 'x2', name: 'Chispa final', owner: 'lux', cost: 2, type: 'skill', target: 'allEnemies', rarity: 'epic', keywords: ['mark'],
    text: 'Inflige 8 a todos, +4 por cada Marca que consume.',
    effects: [magic(8, { consumeStatus: { status: 'mark', from: 'target', bonusPerStack: 4 } })] },
  { id: 'x3', name: 'Barrera prismática', owner: 'lux', cost: 1, type: 'defense', target: 'ally', rarity: 'common', keywords: ['block'],
    text: 'Otorga 6 de bloqueo.', effects: [block(6)] },
  { id: 'x4', name: 'Singularidad brillante', owner: 'lux', cost: 1, type: 'skill', target: 'allEnemies', rarity: 'common', keywords: [],
    text: 'Inflige 4 a todos los enemigos.', effects: [magic(4)] },
  { id: 'x5', name: 'Rayo prismático', owner: 'lux', cost: 1, type: 'attack', target: 'enemy', rarity: 'common', keywords: [],
    text: 'Inflige 8. Desde 3–4: +3.', effects: [magic(8)], idealPositions: [3, 4], positionBonus: [magic(3, { scaling: undefined })] },
  { id: 'x6', name: 'Destello', owner: 'lux', cost: 0, type: 'skill', target: 'allEnemies', rarity: 'rare', keywords: ['mark'],
    text: 'Aplica 1 Marca a todos los enemigos.', effects: [status('mark', 1)] },
  { id: 'x7', name: 'Fulgor final', owner: 'lux', cost: 3, type: 'skill', target: 'allEnemies', rarity: 'epic', keywords: ['mark'],
    text: 'Inflige 6 a todos, +6 por cada Marca que consume.',
    effects: [magic(6, { consumeStatus: { status: 'mark', from: 'target', bonusPerStack: 6 } })] },
  { id: 'x8', name: 'Luz contenida', owner: 'lux', cost: 1, type: 'support', target: 'ally', rarity: 'common', keywords: ['block'],
    text: 'Cura 5 y otorga 3 de bloqueo.', effects: [{ type: 'heal', amount: 5 }, block(3)] },

  // ——— Soraka: curación y apoyo, brilla en 3–4 ———
  { id: 's1', name: 'Toque celestial', owner: 'soraka', cost: 1, type: 'support', target: 'ally', rarity: 'common', keywords: [],
    text: 'Cura 10. Desde 3–4: +3.', effects: [{ type: 'heal', amount: 10 }], idealPositions: [3, 4], positionBonus: [{ type: 'heal', amount: 3 }] },
  { id: 's2', name: 'Calma serena', owner: 'soraka', cost: 1, type: 'support', target: 'ally', rarity: 'common', keywords: [],
    text: 'Reduce 12 de estrés.', effects: [{ type: 'reduceStress', amount: 12 }] },
  { id: 's3', name: 'Plegaria', owner: 'soraka', cost: 2, type: 'support', target: 'allAllies', rarity: 'rare', keywords: [],
    text: 'Cura 6 a todos los aliados.', effects: [{ type: 'heal', amount: 6 }] },
  { id: 's4', name: 'Invocación estelar', owner: 'soraka', cost: 1, type: 'attack', target: 'enemy', rarity: 'common', keywords: [],
    text: 'Inflige 6.', effects: [magic(6)] },
  { id: 's5', name: 'Equinoccio', owner: 'soraka', cost: 2, type: 'control', target: 'allEnemies', rarity: 'rare', keywords: [],
    text: 'Aplica 1 Vulnerable a todos los enemigos.', effects: [status('vulnerable', 1)] },
  { id: 's6', name: 'Inyección astral', owner: 'soraka', cost: 1, type: 'support', target: 'ally', rarity: 'common', keywords: ['block'],
    text: 'Cura 6 y otorga 4 de bloqueo.', effects: [{ type: 'heal', amount: 6 }, block(4)] },
  { id: 's7', name: 'Sacrificio', owner: 'soraka', cost: 0, type: 'support', target: 'ally', rarity: 'common', keywords: [],
    text: 'Reduce 10 de estrés al objetivo. Soraka pierde 4 de vida.',
    effects: [{ type: 'reduceStress', amount: 10 }, { type: 'damage', amount: 4, damageType: 'true', on: 'self' }] },
  { id: 's8', name: 'Renacer', owner: 'soraka', cost: 3, type: 'support', target: 'ally', rarity: 'epic', keywords: [],
    text: 'Reanima a un aliado derribado con 20 de vida.', effects: [{ type: 'revive', hp: 20 }] },
];

export const CARDS: Record<string, CardDef> = Object.fromEntries(CARD_LIST.map((c) => [c.id, c]));

/** Mazo inicial: 5 cartas por campeón (el equipo juega 5 de un mazo de 20). */
export const STARTER_DECK: string[] = [
  'l1', 'l1', 'l2', 'l6', 'l4',
  'y1', 'y1', 'y3', 'y4', 'y2',
  'x1', 'x1', 'x3', 'x5', 'x4',
  's1', 's1', 's2', 's4', 's6',
];
