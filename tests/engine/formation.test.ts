import { describe, expect, it } from 'vitest';
import { canSwap, moveUnit, swapAllies, unitAt } from '../../src/engine/formation';
import { makeState, u } from './fixtures';

describe('moveUnit', () => {
  it('a una posición ocupada intercambia', () => {
    const s = makeState();
    expect(moveUnit(s, u(s, 'lux'), 1)).toBe(true);
    expect(u(s, 'lux').pos).toBe(1);
    expect(u(s, 'leona').pos).toBe(3);
  });

  it('fuera de 1–4 no hace nada', () => {
    const s = makeState();
    expect(moveUnit(s, u(s, 'soraka'), 5)).toBe(false);
    expect(moveUnit(s, u(s, 'leona'), 0)).toBe(false);
    expect(u(s, 'soraka').pos).toBe(4);
    expect(u(s, 'leona').pos).toBe(1);
  });

  it('a una posición libre solo se mueve', () => {
    const s = makeState();
    expect(moveUnit(s, u(s, 'e2'), 4)).toBe(true);
    expect(u(s, 'e2').pos).toBe(4);
    expect(unitAt(s, 'enemy', 2)).toBeUndefined();
  });
});

describe('intercambio de aliados', () => {
  it('cuesta 1 de energía y solo una vez por turno', () => {
    const s = makeState();
    swapAllies(s, 1, 2);
    expect(u(s, 'yasuo').pos).toBe(1);
    expect(u(s, 'leona').pos).toBe(2);
    expect(s.energy).toBe(2);
    expect(canSwap(s, 2, 3)).toBe('Ya intercambiaste este turno');
  });

  it('exige adyacencia y energía', () => {
    const s = makeState();
    expect(canSwap(s, 1, 3)).toBe('No son adyacentes');
    s.energy = 0;
    expect(canSwap(s, 1, 2)).toBe('Energía insuficiente');
    expect(() => swapAllies(s, 1, 2)).toThrow('Energía insuficiente');
  });

  it('un derribado conserva su posición y se puede intercambiar', () => {
    const s = makeState();
    u(s, 'leona').downed = true;
    swapAllies(s, 1, 2);
    expect(u(s, 'leona').pos).toBe(2);
  });
});
