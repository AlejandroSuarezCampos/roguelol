import { describe, expect, it } from 'vitest';
import { formatStat, statLines } from '../../src/ui/format';

describe('formatStat', () => {
  it('formatea porcentajes y multiplicadores', () => {
    expect(formatStat('critChance', 0.2)).toEqual({ label: 'Prob. crítico', value: '+20%' });
    expect(formatStat('critDamage', 0.5)).toEqual({ label: 'Daño crítico', value: '+50%' });
    expect(formatStat('ad', 25)).toEqual({ label: 'AD', value: '+25' });
    expect(formatStat('armor', -10)).toEqual({ label: 'Armadura', value: '−10' });
  });
});

describe('statLines', () => {
  it('lista las estadísticas con vida y omite los ceros', () => {
    expect(statLines({ ad: 12, ap: 0 }, 30).map((l) => `${l.label} ${l.value}`)).toEqual(['Vida máx. +30', 'AD +12']);
  });

  it('en modo absoluto no lleva signo', () => {
    expect(statLines({ ad: 12, critChance: 0.2 }, 0, true).map((l) => l.value)).toEqual(['12', '20%']);
  });
});
