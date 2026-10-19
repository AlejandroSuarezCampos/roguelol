import { describe, expect, it } from 'vitest';
import { applyDamage, heal, revive } from '../../src/engine/units';
import { makeState, u } from './fixtures';

describe('applyDamage', () => {
  it('el bloqueo absorbe antes que la vida', () => {
    const s = makeState();
    const l = u(s, 'leona');
    l.block = 5;
    expect(applyDamage(s, l, 8)).toBe(3);
    expect(l.block).toBe(0);
    expect(l.hp).toBe(37);
  });

  it('un crítico recibido suma +5 de estrés', () => {
    const s = makeState();
    applyDamage(s, u(s, 'lux'), 4, { crit: true });
    expect(u(s, 'lux').stress).toBe(5);
  });

  it('la caída de un aliado suma +10 a los demás vivos', () => {
    const s = makeState();
    applyDamage(s, u(s, 'leona'), 40);
    expect(u(s, 'leona').downed).toBe(true);
    expect(u(s, 'leona').stress).toBe(0);
    expect(u(s, 'yasuo').stress).toBe(10);
  });

  it('derrotar a un enemigo resta 3 de estrés a los aliados vivos', () => {
    const s = makeState();
    u(s, 'yasuo').stress = 20;
    applyDamage(s, u(s, 'e1'), 30);
    expect(u(s, 'e1').downed).toBe(true);
    expect(u(s, 'yasuo').stress).toBe(17);
  });

  it('marca victoria al derrotar al último enemigo y derrota al caer el último aliado', () => {
    const s = makeState();
    applyDamage(s, u(s, 'e1'), 30);
    applyDamage(s, u(s, 'e2'), 30);
    expect(s.outcome).toBe('won');
    const t = makeState();
    for (const id of ['leona', 'yasuo', 'lux', 'soraka']) applyDamage(t, u(t, id), 40);
    expect(t.outcome).toBe('lost');
  });
});

describe('curación y reanimación', () => {
  it('curar no supera la vida máxima ni afecta a derribados', () => {
    const s = makeState();
    const l = u(s, 'leona');
    l.hp = 35;
    expect(heal(l, 10)).toBe(5);
    l.downed = true;
    expect(heal(l, 10)).toBe(0);
  });

  it('revive solo funciona sobre derribados', () => {
    const s = makeState();
    const l = u(s, 'leona');
    expect(revive(l, 20)).toBe(false);
    l.downed = true;
    l.hp = 0;
    expect(revive(l, 20)).toBe(true);
    expect(l.hp).toBe(20);
  });
});
