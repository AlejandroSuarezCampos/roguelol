import { describe, expect, it } from 'vitest';
import { CARD_LIST, CARDS, STARTER_DECK } from '../../src/data/cards';
import { CHAMPION_IDS, CHAMPIONS } from '../../src/data/champions';
import { ENCOUNTERS, ENEMIES } from '../../src/data/enemies';

describe('cartas', () => {
  it('hay 8 cartas por campeón con ids únicos', () => {
    expect(CARD_LIST).toHaveLength(8 * CHAMPION_IDS.length);
    expect(new Set(CARD_LIST.map((c) => c.id)).size).toBe(CARD_LIST.length);
    for (const id of CHAMPION_IDS) expect(CARD_LIST.filter((c) => c.owner === id)).toHaveLength(8);
  });

  it('cada carta tiene efectos, coste válido y un objetivo coherente con sus efectos', () => {
    for (const c of CARD_LIST) {
      expect(c.effects.length, c.id).toBeGreaterThan(0);
      expect(c.cost, c.id).toBeGreaterThanOrEqual(0);
      expect(c.cost, c.id).toBeLessThanOrEqual(3);
      expect(c.text.length, c.id).toBeGreaterThan(0);
      if (c.positionBonus) expect(c.idealPositions?.length, c.id).toBeGreaterThan(0);
      if (c.effects.some((e) => e.type === 'revive')) expect(c.target, c.id).toBe('ally');
    }
  });

  it('cada campeón puede hacer algo útil: ataque, defensa o apoyo', () => {
    for (const id of CHAMPION_IDS) {
      const own = CARD_LIST.filter((c) => c.owner === id);
      expect(own.some((c) => c.type === 'attack' || c.type === 'skill'), id).toBe(true);
      expect(own.some((c) => c.type === 'defense' || c.type === 'support'), id).toBe(true);
    }
  });
});

describe('mazo inicial', () => {
  it('son 5 cartas por campeón y todas existen', () => {
    expect(STARTER_DECK).toHaveLength(5 * CHAMPION_IDS.length);
    for (const id of STARTER_DECK) expect(CARDS[id], id).toBeDefined();
    for (const champ of CHAMPION_IDS) expect(STARTER_DECK.filter((id) => CARDS[id].owner === champ)).toHaveLength(5);
  });
});

describe('campeones y enemigos', () => {
  it('los campeones tienen vida, color y crisis', () => {
    for (const id of CHAMPION_IDS) {
      const c = CHAMPIONS[id];
      expect(c.maxHp).toBeGreaterThan(0);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.color).toMatch(/^#/);
    }
  });

  it('el punto fuerte de cada campeón coincide con las posiciones ideales de sus cartas', () => {
    for (const id of CHAMPION_IDS) {
      const ideal = new Set(CARD_LIST.filter((c) => c.owner === id).flatMap((c) => c.idealPositions ?? []));
      for (const p of CHAMPIONS[id].sweetSpot) expect(ideal.has(p), `${id} ${p}`).toBe(true);
    }
  });

  it('cada encuentro usa enemigos definidos, en posiciones válidas y sin repetir', () => {
    for (const [kind, list] of Object.entries(ENCOUNTERS)) {
      expect(list.length, kind).toBeGreaterThan(0);
      for (const enc of list) {
        const pos = enc.map((e) => e.pos);
        expect(new Set(pos).size, kind).toBe(pos.length);
        for (const e of enc) {
          expect(ENEMIES[e.defId], e.defId).toBeDefined();
          expect([1, 2, 3, 4]).toContain(e.pos);
        }
      }
    }
  });

  it('las intenciones apuntan a posiciones 1–4 y los guiones no están vacíos', () => {
    for (const d of Object.values(ENEMIES)) {
      expect(d.script.length, d.id).toBeGreaterThan(0);
      for (const i of d.script) if ('target' in i) expect([1, 2, 3, 4]).toContain(i.target);
    }
  });
});
