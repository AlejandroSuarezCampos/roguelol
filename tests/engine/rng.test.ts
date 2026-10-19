import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/engine/rng';

describe('Rng', () => {
  it('misma semilla, misma secuencia', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('devuelve valores en [0, 1)', () => {
    const r = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('shuffle es una permutación reproducible que no muta la entrada', () => {
    const x = [1, 2, 3, 4, 5, 6];
    const a = new Rng(3).shuffle(x);
    expect(a).toEqual(new Rng(3).shuffle(x));
    expect([...a].sort()).toEqual(x);
    expect(x).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('su estado es un número que permite continuar la secuencia', () => {
    const r = new Rng(9);
    r.next();
    const copy = new Rng(r.state);
    expect(copy.next()).toBe(r.next());
  });
});
