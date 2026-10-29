import type { ExtraSpec } from './cardGen';

/**
 * Cartas «extra» (9.ª a 20.ª) escritas a mano para campeones concretos, en el mismo formato compacto que `cardsExtra.json`.
 * `npm run gen:cards` no genera las de estos campeones. Para añadir otro: escribe sus 12 cartas aquí (ids correlativos 9–20,
 * 4 comunes, 5 raras y 3 épicas si sus 8 primeras tienen 5/2/1) y nada más: el texto y la mejora salen de los efectos.
 */
export const MANUAL_SPECS: ExtraSpec[] = [
  // ——— Lulu: hechicera con hada, polimorfo (aturdir + Vulnerable), escudos y crecimiento ———
  { id: 'u9', owner: 'lulu', name: 'Polimorfo general', cost: 3, type: 'control', target: 'allEnemies', rarity: 'epic',
    e: [{ k: 'dmg', n: 4, t: 'm' }, { k: 'st', s: 'stun', n: 1 }, { k: 'st', s: 'vulnerable', n: 1 }] },
  { id: 'u10', owner: 'lulu', name: 'Crecimiento colosal', cost: 3, type: 'support', target: 'allAllies', rarity: 'epic',
    e: [{ k: 'block', n: 10 }, { k: 'heal', n: 6 }] },
  { id: 'u11', owner: 'lulu', name: 'Pix, ¡al ataque!', cost: 3, type: 'attack', target: 'enemy', rarity: 'epic',
    e: [{ k: 'dmg', n: 4, t: 'm', times: 4 }], i: [3, 4], b: [{ k: 'dmg', n: 3, t: 'm' }] },
  { id: 'u12', owner: 'lulu', name: 'Lanza congelante', cost: 2, type: 'attack', target: 'enemy', rarity: 'rare',
    e: [{ k: 'dmg', n: 7, t: 'm' }, { k: 'st', s: 'vulnerable', n: 2 }] },
  { id: 'u13', owner: 'lulu', name: 'Escudo de hada', cost: 2, type: 'defense', target: 'allAllies', rarity: 'rare',
    e: [{ k: 'block', n: 7 }] },
  { id: 'u14', owner: 'lulu', name: 'Bola de pelo', cost: 2, type: 'control', target: 'enemy', rarity: 'rare',
    e: [{ k: 'dmg', n: 4, t: 'm' }, { k: 'st', s: 'stun', n: 1 }] },
  { id: 'u15', owner: 'lulu', name: 'Pix escolta', cost: 2, type: 'defense', target: 'ally', rarity: 'rare',
    e: [{ k: 'block', n: 6 }, { k: 'allyto', to: 4 }] },
  { id: 'u16', owner: 'lulu', name: 'Magia desbordante', cost: 1, type: 'skill', target: 'self', rarity: 'rare',
    e: [{ k: 'draw', n: 2 }, { k: 'block', n: 3, self: 1 }] },
  { id: 'u17', owner: 'lulu', name: 'Chispa de hada', cost: 0, type: 'attack', target: 'enemy', rarity: 'common',
    e: [{ k: 'dmg', n: 3, t: 'm' }, { k: 'st', s: 'mark', n: 1 }] },
  { id: 'u18', owner: 'lulu', name: 'Susurro de Pix', cost: 1, type: 'support', target: 'ally', rarity: 'common',
    e: [{ k: 'heal', n: 6 }, { k: 'stress', n: 4 }] },
  { id: 'u19', owner: 'lulu', name: 'Hada protectora', cost: 1, type: 'defense', target: 'self', rarity: 'common',
    e: [{ k: 'block', n: 7, self: 1 }, { k: 'mv', to: 4 }] },
  { id: 'u20', owner: 'lulu', name: 'Estrella fugaz', cost: 1, type: 'attack', target: 'enemy', rarity: 'common',
    e: [{ k: 'dmg', n: 4, t: 'm', cons: ['mark', 'target', 4] }] },
];
