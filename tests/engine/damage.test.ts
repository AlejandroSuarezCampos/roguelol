import { describe, expect, it } from 'vitest';
import { computeDamage } from '../../src/engine/damage';
import { getFinalStats } from '../../src/engine/stats';
import { SeqRng, makeState, u } from './fixtures';

describe('getFinalStats', () => {
  it('parte de 0 (crítico ×1,5) y suma los bonos planos', () => {
    expect(getFinalStats()).toEqual({ ad: 0, ap: 0, critChance: 0, critDamage: 1.5, penetration: 0, armor: 0, mr: 0 });
    expect(getFinalStats({ ad: 20 }, [{ ad: 10, armor: 5 }, { armor: 5 }])).toMatchObject({ ad: 30, armor: 10 });
  });
});

describe('computeDamage (§5.4)', () => {
  const hit = (over: Parameters<typeof computeDamage>[3], setup?: (s: ReturnType<typeof makeState>) => void) => {
    const s = makeState();
    setup?.(s);
    return computeDamage(s, u(s, 'yasuo'), u(s, 'e1'), over).amount;
  };

  it('sin defensa, el daño base pasa entero', () => {
    expect(hit({ amount: 6, damageType: 'physical' })).toBe(6);
  });

  it('escala con AD o AP del lanzador', () => {
    expect(hit({ amount: 6, damageType: 'physical', scaling: { stat: 'ad', ratio: 0.5 } }, (s) => (u(s, 'yasuo').stats.ad = 20))).toBe(16);
    expect(hit({ amount: 4, damageType: 'magic', scaling: { stat: 'ap', ratio: 1 } }, (s) => (u(s, 'yasuo').stats.ap = 6))).toBe(10);
  });

  it('la armadura mitiga el físico y la resistencia mágica el mágico', () => {
    expect(hit({ amount: 20, damageType: 'physical' }, (s) => (u(s, 'e1').stats.armor = 50))).toBe(13);
    expect(hit({ amount: 20, damageType: 'magic' }, (s) => (u(s, 'e1').stats.mr = 100))).toBe(10);
    expect(hit({ amount: 20, damageType: 'magic' }, (s) => (u(s, 'e1').stats.armor = 100))).toBe(20);
  });

  it('el daño verdadero ignora la defensa', () => {
    expect(hit({ amount: 20, damageType: 'true' }, (s) => Object.assign(u(s, 'e1').stats, { armor: 100, mr: 100 }))).toBe(20);
  });

  it('la penetración reduce la defensa con mínimo 0', () => {
    expect(hit({ amount: 20, damageType: 'physical' }, (s) => {
      u(s, 'e1').stats.armor = 30;
      u(s, 'yasuo').stats.penetration = 50;
    })).toBe(20);
  });

  it('el crítico multiplica por critDamage (telegrafiado o tirado con el RNG)', () => {
    expect(hit({ amount: 10, damageType: 'physical', crit: 'always' })).toBe(15);
    expect(hit({ amount: 10, damageType: 'physical', crit: 'always' }, (s) => (u(s, 'yasuo').stats.critDamage = 2))).toBe(20);
    expect(hit({ amount: 10, damageType: 'physical', crit: 'roll' }, (s) => {
      s.rng = new SeqRng([0.4]);
      u(s, 'yasuo').stats.critChance = 0.5;
    })).toBe(15);
    expect(hit({ amount: 10, damageType: 'physical', crit: 'roll' }, (s) => {
      s.rng = new SeqRng([0.6]);
      u(s, 'yasuo').stats.critChance = 0.5;
    })).toBe(10);
  });

  it('vulnerable suma +50 % tras la mitigación y se redondea hacia abajo', () => {
    expect(hit({ amount: 10, damageType: 'physical' }, (s) => (u(s, 'e1').statuses.vulnerable = 1))).toBe(15);
    expect(hit({ amount: 10, damageType: 'physical' }, (s) => {
      u(s, 'e1').statuses.vulnerable = 1;
      u(s, 'e1').stats.armor = 100;
    })).toBe(7);
  });

  it('nunca devuelve daño negativo', () => {
    expect(hit({ amount: 2, damageType: 'physical', additive: -5 })).toBe(0);
  });
});
