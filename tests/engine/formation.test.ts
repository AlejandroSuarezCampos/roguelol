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

describe('huecos tras una muerte permanente', () => {
  const withGap = () => {
    const s = makeState();
    s.units = s.units.filter((x) => x.id !== 'leona'); // la posición 1 queda vacía
    return s;
  };

  it('un aliado puede avanzar a una posición vacía adyacente (cuesta energía y cuenta como el intercambio del turno)', () => {
    const s = withGap();
    expect(canSwap(s, 1, 2)).toBeNull();
    swapAllies(s, 1, 2);
    expect(u(s, 'yasuo').pos).toBe(1);
    expect(unitAt(s, 'ally', 2)).toBeUndefined();
    expect(s.energy).toBe(2);
    expect(canSwap(s, 2, 3)).toMatch(/intercambiaste/);
  });

  it('dos posiciones vacías no se pueden intercambiar, y seguirían sin ser adyacentes si no lo son', () => {
    const s = makeState();
    s.units = s.units.filter((x) => x.id !== 'leona' && x.id !== 'yasuo'); // 1 y 2 vacías
    expect(canSwap(s, 1, 2)).toBe('Posición vacía');
    s.units = s.units.filter((x) => x.id !== 'lux');
    expect(canSwap(s, 1, 3)).toBe('No son adyacentes');
  });
});

describe('posiciones fuera de rango', () => {
  it('nunca se sale del 1–4, ni siquiera hacia un hueco', () => {
    const s = makeState();
    expect(canSwap(s, 4, 5 as never)).toBe('Posición no válida');
    expect(canSwap(s, 0 as never, 1)).toBe('Posición no válida');
    expect(() => swapAllies(s, 4, 5 as never)).toThrow(/no válida/);
    expect(u(s, 'soraka').pos).toBe(4);
  });
});
