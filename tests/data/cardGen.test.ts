import { describe, expect, it } from 'vitest';
import { buildExtra, describe as text, type ExtraSpec } from '../../src/data/cardGen';
import { CARD_LIST } from '../../src/data/cards';
import extra from '../../src/data/cardsExtra.json';
import { CHAMPIONS } from '../../src/data/champions';

const spec = (over: Partial<ExtraSpec>): ExtraSpec => ({ id: 'x9', owner: 'leona', name: 'Prueba', cost: 1, type: 'attack', target: 'enemy', rarity: 'common', e: [{ k: 'dmg', n: 6, t: 'p' }], ...over });

describe('cartas extra: generador de texto y mejora', () => {
  it('el texto sale de los efectos, con varios golpes, marcas, robo y bono de posición', () => {
    expect(text([{ k: 'dmg', n: 4, t: 'p', times: 3 }, { k: 'st', s: 'mark', n: 2 }, { k: 'draw', n: 1 }], 'enemy', [3, 4], [{ k: 'dmg', n: 3, t: 'p' }])).toBe('Inflige 4 tres veces y aplica 2 Marcas. Roba 1 carta. Desde 3–4: +3.');
    expect(text([{ k: 'dmg', n: 5, t: 'm', cons: ['mark', 'target', 4] }], 'allEnemies')).toBe('Inflige 5 a todos, +4 por cada Marca que consume.');
    expect(text([{ k: 'block', n: 8 }, { k: 'heal', n: 4, self: 1 }], 'self')).toBe('Gana 8 de bloqueo y recupera 4 de vida.');
    expect(text([{ k: 'dmg', n: 9, t: 'p', crit: 1 }, { k: 'selfdmg', n: 3 }], 'enemy')).toBe('Inflige 9 y pierde 3 de vida. Puede ser crítico.');
    expect(text([{ k: 'revive', n: 20 }], 'ally')).toBe('Reanima a un aliado derribado con 20 de vida.');
  });

  it('una carta se construye con sus efectos del motor, palabras clave y mejora', () => {
    const { card, upgrade } = buildExtra(spec({ e: [{ k: 'dmg', n: 5, t: 'm', times: 2 }, { k: 'st', s: 'burn', n: 1 }, { k: 'pullto', to: 1 }] }));
    expect(card.effects).toHaveLength(4); // dos golpes, quemadura y arrastre
    expect(card.keywords).toEqual(['burn', 'displacement']);
    expect(upgrade.text).toBe('Inflige 7 dos veces, aplica 1 Quemadura y arrastra al objetivo a la posición 1.');
  });

  it('sin números que subir la mejora añade un acumulable, y si tampoco hay, quita un punto de coste', () => {
    expect(buildExtra(spec({ type: 'skill', target: 'self', e: [{ k: 'st', s: 'charge', n: 2, self: 1 }] })).upgrade.text).toBe('Gana 3 Cargas.');
    const stun = buildExtra(spec({ cost: 2, type: 'control', e: [{ k: 'st', s: 'stun', n: 1 }] }));
    expect(stun.upgrade.cost).toBe(1);
    expect(stun.upgrade.text).toBe('Aplica Aturdido. Cuesta 1.');
  });

  it('el precio en vida se reduce con la mejora', () => {
    const { upgrade } = buildExtra(spec({ cost: 0, type: 'skill', target: 'self', e: [{ k: 'selfdmg', n: 4 }, { k: 'draw', n: 2 }] }));
    expect(upgrade.text).toBe('Pierde 2 de vida. Roba 2 cartas.');
  });
});

describe('cardsExtra.json', () => {
  const list = extra as ExtraSpec[];

  it('tiene 12 cartas por campeón, con ids correlativos del 9 al 20 y dueños que existen', () => {
    expect(list).toHaveLength(Object.keys(CHAMPIONS).length * 12);
    for (const id of Object.keys(CHAMPIONS)) {
      const own = list.filter((c) => c.owner === id);
      expect(own, id).toHaveLength(12);
      expect(own.map((c) => Number(c.id.match(/\d+$/)![0])), id).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    }
  });

  it('los textos de cada carta citan todos sus números y la mejora lleva números mayores', () => {
    for (const c of CARD_LIST.filter((x) => list.some((l) => l.id === x.id))) {
      for (const e of c.effects) {
        if (e.type === 'damage' || e.type === 'block' || e.type === 'heal' || e.type === 'reduceStress') expect(c.text, c.id).toContain(String(e.amount));
      }
      expect(c.upgrade?.text, c.id).toBeTruthy();
    }
  });
});
