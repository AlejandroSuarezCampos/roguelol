import { describe, expect, it } from 'vitest';
import { PERKS } from '../../src/data/perks';
import { createExpedition } from '../../src/engine/expedition';
import { playExpedition, type RunReport } from './bot';

/**
 * Guardarraíl de equilibrio con un bot mediocre (no es un jugador experto). Cotas anchas a propósito:
 * solo detectan que un cambio de datos deja el juego trivial o imposible. Para ver cifras: `npm run balance`.
 */
const reports: RunReport[] = [];
for (let i = 0; i < 80; i++) reports.push(playExpedition(createExpedition(1000 + i), 7 * i + 1));
const normalWinRate = reports.filter((r) => r.status === 'victory').length / reports.length;

describe('equilibrio con bot', () => {
  const fights = (kind: string) => reports.flatMap((r) => r.fights.filter((f) => f.kind === kind));
  const rate = (kind: string) => fights(kind).filter((f) => f.won).length / fights(kind).length;

  it('los combates normales se ganan casi siempre, pero no todos los turnos son triviales', () => {
    expect(rate('combat')).toBeGreaterThan(0.85);
    const turns = fights('combat').reduce((a, f) => a + f.turns, 0) / fights('combat').length;
    expect(turns).toBeGreaterThan(3);
  });

  it('las élites y el jefe son una amenaza real', () => {
    expect(rate('elite')).toBeLessThan(0.97);
    expect(rate('boss')).toBeLessThan(0.8);
  });

  it('ganar la expedición es posible pero no automático', () => {
    const wins = reports.filter((r) => r.status === 'victory').length / reports.length;
    expect(wins).toBeGreaterThan(0.08);
    expect(wins).toBeLessThan(0.7);
  });
});

describe('Ascensión 10 con bot', () => {
  const runs = Array.from({ length: 80 }, (_, i) => {
    const e = createExpedition(1000 + i, 10);
    return { e, r: playExpedition(e, 7 * i + 1) };
  });

  it('es claramente más difícil que Normal', () => {
    const hardWins = runs.filter((x) => x.r.status === 'victory').length / runs.length;
    expect(hardWins).toBeLessThan(normalWinRate);
  });

  it('la muerte permanente se nota: de media muere más de un campeón por expedición', () => {
    const deaths = runs.reduce((a, x) => a + x.e.dead.length, 0) / runs.length;
    expect(deaths).toBeGreaterThan(1);
  });

  it('sigue siendo jugable: los combates normales se ganan más de la mitad de las veces', () => {
    const f = runs.flatMap((x) => x.r.fights.filter((y) => y.kind === 'combat'));
    expect(f.filter((y) => y.won).length / f.length).toBeGreaterThan(0.5);
  });
});

describe('mejoras permanentes con bot', () => {
  const maxPerks = { hp: PERKS.vigor.values[2], gold: PERKS.provisions.values[2], potions: PERKS.belt.values[2], upgradedCards: PERKS.mastery.values[2] };
  const maxed = Array.from({ length: 80 }, (_, i) => playExpedition(createExpedition(1000 + i, 0, maxPerks), 7 * i + 1)).filter((r) => r.status === 'victory').length / 80;

  it('con todo al máximo ayudan, pero no hacen trivial la expedición (spec §14)', () => {
    expect(maxed).toBeGreaterThan(normalWinRate);
    expect(maxed).toBeLessThan(0.75);
  });
});
