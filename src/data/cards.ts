import type { CardDef, CardUpgrade, Effect } from '../engine/types';

/**
 * Cartas provisionales (8 por campeón).
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

const BASE_CARDS: CardDef[] = [
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
    text: 'Gana 4 de bloqueo y convierte cada Carga en 4 de bloqueo.', effects: [block(4), { type: 'convertStatus', status: 'charge', perStack: 4, into: 'block' }] },

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
    text: 'Aplica 1 Marca a todos los enemigos. Roba 1 carta.', effects: [status('mark', 1), { type: 'draw', amount: 1 }] },
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
  { id: 's7', name: 'Sacrificio', owner: 'soraka', cost: 0, type: 'support', target: 'self', rarity: 'common', keywords: [],
    text: 'Soraka pierde 4 de vida. Roba 2 cartas.',
    effects: [{ type: 'damage', amount: 4, damageType: 'true', on: 'self' }, { type: 'draw', amount: 2 }] },
  { id: 's8', name: 'Renacer', owner: 'soraka', cost: 3, type: 'support', target: 'ally', rarity: 'epic', keywords: [],
    text: 'Reanima a un aliado derribado con 20 de vida.', effects: [{ type: 'revive', hp: 20 }] },

  // ——— Lulu: apoyo y control con Pix, brilla en 3–4 ———
  { id: 'u1', name: 'Lanza brillante', owner: 'lulu', cost: 1, type: 'attack', target: 'enemy', rarity: 'common', keywords: [],
    text: 'Inflige 5. Desde 3–4: aplica 1 Vulnerable.', effects: [magic(5)], idealPositions: [3, 4], positionBonus: [status('vulnerable', 1)] },
  { id: 'u2', name: '¡Ayuda, Pix!', owner: 'lulu', cost: 1, type: 'defense', target: 'ally', rarity: 'common', keywords: ['block'],
    text: 'Otorga 6 de bloqueo.', effects: [block(6)] },
  { id: 'u3', name: 'Capricho', owner: 'lulu', cost: 2, type: 'control', target: 'enemy', rarity: 'rare', keywords: [],
    text: 'Transforma al objetivo: Aturdido y 1 Vulnerable.', effects: [status('stun', 1), status('vulnerable', 1)] },
  { id: 'u4', name: 'Capricho veloz', owner: 'lulu', cost: 1, type: 'support', target: 'ally', rarity: 'common', keywords: ['block'],
    text: 'Otorga 4 de bloqueo. Roba 1 carta.', effects: [block(4), { type: 'draw', amount: 1 }] },
  { id: 'u5', name: 'Pix, compañero hada', owner: 'lulu', cost: 0, type: 'attack', target: 'enemy', rarity: 'common', keywords: [],
    text: 'Inflige 4.', effects: [magic(4)] },
  { id: 'u6', name: 'Crecimiento salvaje', owner: 'lulu', cost: 3, type: 'support', target: 'ally', rarity: 'epic', keywords: ['block'],
    text: 'Cura 15 y otorga 12 de bloqueo.', effects: [{ type: 'heal', amount: 15 }, block(12)] },
  { id: 'u7', name: 'Polvo de hadas', owner: 'lulu', cost: 1, type: 'support', target: 'allAllies', rarity: 'common', keywords: [],
    text: 'Reduce 6 de estrés a todos los aliados.', effects: [{ type: 'reduceStress', amount: 6 }] },
  { id: 'u8', name: 'Revoloteo de Pix', owner: 'lulu', cost: 1, type: 'skill', target: 'allEnemies', rarity: 'rare', keywords: [],
    text: 'Inflige 3 a todos los enemigos. Roba 1 carta.', effects: [magic(3), { type: 'draw', amount: 1 }] },
];

const up = (text: string, extra: Partial<CardUpgrade> = {}): CardUpgrade => ({ text, ...extra });

/** Mejora de cada carta: nunca peor que la base, con los mismos tipos de efecto (solo cambian números o coste). */
const UPGRADES: Record<string, CardUpgrade> = {
  l1: up('Inflige 9 y aplica Aturdido. Desde 1–2: +3.', { effects: [phys(9), status('stun', 1)] }),
  l2: up('Otorga 11 de bloqueo.', { effects: [block(11)] }),
  l3: up('Gana 16 de bloqueo y avanza a la posición 1.', { effects: [block(16), { type: 'move', to: 1 }] }),
  l4: up('Inflige 13 y avanza a la posición 1.', { effects: [phys(13), { type: 'move', to: 1, on: 'self' }] }),
  l5: up('Otorga 6 de bloqueo a todos los aliados.', { effects: [block(6)] }),
  l6: up('Gana 10 de bloqueo. Desde 1–2: +3.', { effects: [block(10)] }),
  l7: up('Inflige 16. Desde 1: +4.', { effects: [phys(16)] }),
  l8: up('Inflige 8 y aplica Aturdido a todos los enemigos. Cuesta 2.', { cost: 2 }),
  y1: up('Inflige 10 y gana 1 Carga. Desde 2–3: +3.', { effects: [phys(10), status('charge', 1, 'self')] }),
  y2: up('Inflige 16. Puede ser crítico.', { effects: [phys(16, { canCrit: true })] }),
  y3: up('Gana 10 de bloqueo.', { effects: [block(10)] }),
  y4: up('Inflige 7 y empuja al objetivo una posición.', { effects: [phys(7), { type: 'move', by: 1 }] }),
  y5: up('Inflige 7 dos veces.', { effects: [phys(7), phys(7)] }),
  y6: up('Inflige 6 y gana 2 Cargas.', { effects: [phys(6), status('charge', 2, 'self')] }),
  y7: up('Inflige 6 más 7 por cada Carga, que consume.', { effects: [phys(6, { consumeStatus: { status: 'charge', from: 'self', bonusPerStack: 7 } })] }),
  y8: up('Gana 6 de bloqueo y convierte cada Carga en 6 de bloqueo.', { effects: [block(6), { type: 'convertStatus', status: 'charge', perStack: 6, into: 'block' }] }),
  x1: up('Inflige 8 y aplica 1 Marca. Desde 3–4: +1 Marca.', { effects: [magic(8), status('mark', 1)] }),
  x2: up('Inflige 8 a todos, +6 por cada Marca que consume.', { effects: [magic(8, { consumeStatus: { status: 'mark', from: 'target', bonusPerStack: 6 } })] }),
  x3: up('Otorga 9 de bloqueo.', { effects: [block(9)] }),
  x4: up('Inflige 6 a todos los enemigos.', { effects: [magic(6)] }),
  x5: up('Inflige 11. Desde 3–4: +3.', { effects: [magic(11)] }),
  x6: up('Aplica 2 Marcas a todos los enemigos. Roba 1 carta.', { effects: [status('mark', 2), { type: 'draw', amount: 1 }] }),
  x7: up('Inflige 6 a todos, +6 por cada Marca que consume. Cuesta 2.', { cost: 2 }),
  x8: up('Cura 8 y otorga 5 de bloqueo.', { effects: [{ type: 'heal', amount: 8 }, block(5)] }),
  s1: up('Cura 14. Desde 3–4: +3.', { effects: [{ type: 'heal', amount: 14 }] }),
  s2: up('Reduce 18 de estrés.', { effects: [{ type: 'reduceStress', amount: 18 }] }),
  s3: up('Cura 9 a todos los aliados.', { effects: [{ type: 'heal', amount: 9 }] }),
  s4: up('Inflige 9.', { effects: [magic(9)] }),
  s5: up('Aplica 2 Vulnerable a todos los enemigos.', { effects: [status('vulnerable', 2)] }),
  s6: up('Cura 9 y otorga 6 de bloqueo.', { effects: [{ type: 'heal', amount: 9 }, block(6)] }),
  s7: up('Soraka pierde 2 de vida. Roba 2 cartas.', { effects: [{ type: 'damage', amount: 2, damageType: 'true', on: 'self' }, { type: 'draw', amount: 2 }] }),
  s8: up('Reanima a un aliado derribado con 30 de vida.', { effects: [{ type: 'revive', hp: 30 }] }),
  u1: up('Inflige 8. Desde 3–4: aplica 1 Vulnerable.', { effects: [magic(8)] }),
  u2: up('Otorga 9 de bloqueo.', { effects: [block(9)] }),
  u3: up('Transforma al objetivo: Aturdido y 1 Vulnerable. Cuesta 1.', { cost: 1 }),
  u4: up('Otorga 6 de bloqueo. Roba 1 carta.', { effects: [block(6), { type: 'draw', amount: 1 }] }),
  u5: up('Inflige 6.', { effects: [magic(6)] }),
  u6: up('Cura 15 y otorga 12 de bloqueo. Cuesta 2.', { cost: 2 }),
  u7: up('Reduce 9 de estrés a todos los aliados.', { effects: [{ type: 'reduceStress', amount: 9 }] }),
  u8: up('Inflige 5 a todos los enemigos. Roba 1 carta.', { effects: [magic(5), { type: 'draw', amount: 1 }] }),
};

export const CARD_LIST: CardDef[] = BASE_CARDS.map((c) => ({ ...c, upgrade: UPGRADES[c.id] }));

export const CARDS: Record<string, CardDef> = Object.fromEntries(CARD_LIST.map((c) => [c.id, c]));

/** Una carta mejorada se guarda en el mazo como su id con un `+` al final. */
export const baseCardId = (id: string): string => (id.endsWith('+') ? id.slice(0, -1) : id);
export const isUpgradedId = (id: string): boolean => id.endsWith('+');
export const upgradedId = (id: string): string => `${baseCardId(id)}+`;
/** La definición base de una entrada del mazo (con o sin `+`). */
export const deckCardDef = (id: string): CardDef => CARDS[baseCardId(id)];

/** La carta con su mejora aplicada (si no tiene mejora, igual). */
export function applyUpgrade(def: CardDef): CardDef {
  const u = def.upgrade;
  if (!u) return def;
  return { ...def, cost: u.cost ?? def.cost, effects: u.effects ?? def.effects, positionBonus: u.positionBonus ?? def.positionBonus, text: u.text };
}

/** Mazo inicial: 5 cartas por campeón; una expedición lleva las de sus 4 campeones (20 cartas). */
export const STARTER_DECK: string[] = [
  'l1', 'l1', 'l2', 'l6', 'l4',
  'y1', 'y1', 'y3', 'y4', 'y2',
  'x1', 'x1', 'x3', 'x5', 'x4',
  's1', 's1', 's2', 's4', 's6',
  'u1', 'u1', 'u2', 'u5', 'u4',
];
