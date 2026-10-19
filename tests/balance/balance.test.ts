import { describe, expect, it } from 'vitest';
import { createExpedition } from '../../src/engine/expedition';
import { playExpedition, type RunReport } from './bot';

/**
 * Guardarraíl de equilibrio con un bot mediocre (no es un jugador experto). Cotas anchas a propósito:
 * solo detectan que un cambio de datos deja el juego trivial o imposible. Para ver cifras: `npm run balance`.
 */
describe('equilibrio con bot', () => {
  const reports: RunReport[] = [];
  for (let i = 0; i < 80; i++) reports.push(playExpedition(createExpedition(1000 + i), 7 * i + 1));
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
