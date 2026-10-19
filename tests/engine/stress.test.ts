import { describe, expect, it } from 'vitest';
import { addStress, stressTier } from '../../src/engine/stress';
import { SeqRng, makeState, u } from './fixtures';

describe('addStress', () => {
  it('se limita a 0–100', () => {
    const s = makeState();
    const l = u(s, 'leona');
    addStress(s, l, -5);
    expect(l.stress).toBe(0);
    addStress(s, l, 50);
    expect(l.stress).toBe(50);
  });

  it('no afecta a enemigos', () => {
    const s = makeState();
    addStress(s, u(s, 'e1'), 20);
    expect(u(s, 'e1').stress).toBe(0);
  });

  it('al llegar a 100 con tirada < 0,25 da virtud y baja a 50', () => {
    const s = makeState({ rng: new SeqRng([0.1]) });
    const l = u(s, 'leona');
    l.stress = 95;
    addStress(s, l, 10);
    expect(l.stress).toBe(50);
    expect(l.virtueActive).toBe(true);
    expect(l.crisisActive).toBe(false);
  });

  it('al llegar a 100 con tirada ≥ 0,25 entra en crisis y se queda en 100', () => {
    const s = makeState({ rng: new SeqRng([0.6]) });
    const l = u(s, 'leona');
    l.stress = 95;
    addStress(s, l, 10);
    expect(l.stress).toBe(100);
    expect(l.crisisActive).toBe(true);
  });

  it('la crisis termina en cuanto baja de 100', () => {
    const s = makeState();
    const l = u(s, 'leona');
    l.stress = 100;
    l.crisisActive = true;
    addStress(s, l, -1);
    expect(l.crisisActive).toBe(false);
  });

  it('ya en crisis no vuelve a tirar', () => {
    const s = makeState({ rng: new SeqRng([0.1]) });
    const l = u(s, 'leona');
    l.stress = 100;
    l.crisisActive = true;
    addStress(s, l, 5);
    expect(l.crisisActive).toBe(true);
    expect(l.virtueActive).toBe(false);
  });
});

describe('stressTier', () => {
  it('usa los umbrales de §10.1', () => {
    expect(stressTier(24)).toBe('calm');
    expect(stressTier(25)).toBe('uneasy');
    expect(stressTier(50)).toBe('overwhelmed');
    expect(stressTier(75)).toBe('edge');
    expect(stressTier(100)).toBe('crisis');
  });
});
