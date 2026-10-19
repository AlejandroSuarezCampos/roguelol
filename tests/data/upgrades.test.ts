import { describe, expect, it } from 'vitest';
import { CARD_LIST, CARDS, applyUpgrade, baseCardId, isUpgradedId, upgradedId } from '../../src/data/cards';
import type { Effect } from '../../src/engine/types';

/** Suma de todos los números de un efecto (para comprobar que mejorar nunca empeora una carta). */
const power = (effects: Effect[]) =>
  effects.reduce((a, e) => {
    const n = 'amount' in e ? e.amount : 'stacks' in e ? e.stacks : 'hp' in e ? e.hp : 0;
    const bonus = e.type === 'damage' && e.consumeStatus ? e.consumeStatus.bonusPerStack : 0;
    return a + (e.type === 'damage' && e.on === 'self' ? -n : n) + bonus;
  }, 0);

describe('ids de mazo', () => {
  it('el sufijo + marca una carta mejorada', () => {
    expect(isUpgradedId('l1')).toBe(false);
    expect(isUpgradedId('l1+')).toBe(true);
    expect(baseCardId('l1+')).toBe('l1');
    expect(baseCardId('l1')).toBe('l1');
    expect(upgradedId('l1')).toBe('l1+');
    expect(upgradedId('l1+')).toBe('l1+');
  });
});

describe('mejoras de cartas', () => {
  it('las 32 cartas tienen mejora con texto propio y sin cambiar de dueño, objetivo ni tipo', () => {
    for (const c of CARD_LIST) {
      expect(c.upgrade, c.id).toBeDefined();
      const up = applyUpgrade(c);
      expect(up.text, c.id).not.toBe(c.text);
      expect(up.owner).toBe(c.owner);
      expect(up.target).toBe(c.target);
      expect(up.type).toBe(c.type);
    }
  });

  it('mejorar no empeora: o cuesta menos, o sus efectos suman más', () => {
    for (const c of CARD_LIST) {
      const up = applyUpgrade(c);
      const better = up.cost < c.cost || power(up.effects) > power(c.effects) || power(up.positionBonus ?? []) > power(c.positionBonus ?? []);
      expect(better, c.id).toBe(true);
      expect(up.cost, c.id).toBeLessThanOrEqual(c.cost);
    }
  });

  it('conserva la forma de los efectos (mismos tipos en el mismo orden) para no romper la carta', () => {
    for (const c of CARD_LIST) {
      const up = applyUpgrade(c);
      expect(up.effects.map((e) => e.type), c.id).toEqual(c.effects.map((e) => e.type));
    }
  });

  it('los números del texto mejorado salen de los efectos mejorados (daño, bloqueo, curación, estrés)', () => {
    const nums = (s: string) => (s.match(/\d+/g) ?? []).map(Number);
    for (const c of CARD_LIST) {
      const up = applyUpgrade(c);
      const wanted = up.effects.flatMap((e) => ('amount' in e ? [e.amount] : 'hp' in e ? [e.hp] : []));
      const inText = nums(up.text);
      for (const w of wanted) expect(inText, `${c.id}: ${up.text}`).toContain(w);
    }
  });

  it('applyUpgrade de una carta sin mejora la devuelve igual', () => {
    const c = { ...CARDS.l1, upgrade: undefined };
    expect(applyUpgrade(c)).toEqual(c);
  });
});
