import { describe, expect, it } from 'vitest';
import { combatMods, mistTier } from '../../src/engine/mist';
import { rollRewards } from '../../src/engine/rewards';
import { addRelic, createRun, enterNode, OMENS, previewNode, reorder, stokeFire, type RunChampion } from '../../src/engine/run';
import { SeqRng } from './fixtures';

const team = (): RunChampion[] => [
  { id: 'leona', name: 'Leona', pos: 1, hp: 80, maxHp: 80, stress: 0, downed: false },
  { id: 'yasuo', name: 'Yasuo', pos: 2, hp: 60, maxHp: 60, stress: 0, downed: false },
];

describe('run y Presagio', () => {
  it('sortea un Presagio reproducible con la semilla', () => {
    const a = createRun(5, team());
    expect(OMENS).toContain(a.omen);
    expect(createRun(5, team()).omen).toBe(a.omen);
  });

  it('reordenación libre fuera de combate', () => {
    const run = createRun(1, team());
    reorder(run, 'leona', 2);
    expect(run.champions.map((c) => c.pos)).toEqual([2, 1]);
  });

  it('no hay límite de reliquias', () => {
    const run = createRun(1, team());
    for (let i = 0; i < 9; i++) addRelic(run, `r${i}`);
    expect(run.relics).toHaveLength(9);
  });
});

describe('Niebla Negra', () => {
  it('+5 por nodo, +9 por élite, −10 al avivar la hoguera, limitada a 0–100', () => {
    const run = createRun(1, team());
    enterNode(run, 'combat');
    expect(run.mist).toBe(5);
    enterNode(run, 'elite');
    expect(run.mist).toBe(14);
    stokeFire(run);
    expect(run.mist).toBe(4);
    stokeFire(run);
    expect(run.mist).toBe(0);
    run.mist = 95;
    enterNode(run, 'elite');
    expect(run.mist).toBe(100);
  });

  it('tramos: Bruma, Niebla, Niebla densa, Ruina', () => {
    expect([29, 30, 59, 60, 89, 90].map(mistTier)).toEqual(['haze', 'mist', 'mist', 'dense', 'dense', 'ruin']);
  });

  it('modificadores acumulativos por tramo y jefe con ≥ 60', () => {
    expect(combatMods(10)).toEqual({ intentStressBonus: 0, startShadowMark: false, hpMultiplier: 1, bossExtraIntent: false });
    expect(combatMods(30)).toEqual({ intentStressBonus: 3, startShadowMark: false, hpMultiplier: 1, bossExtraIntent: false });
    expect(combatMods(60, true)).toEqual({ intentStressBonus: 3, startShadowMark: true, hpMultiplier: 1, bossExtraIntent: true });
    expect(combatMods(95)).toEqual({ intentStressBonus: 3, startShadowMark: true, hpMultiplier: 1.2, bossExtraIntent: false });
    expect(combatMods(59, true).bossExtraIntent).toBe(false);
  });

  it('la vista previa de un nodo muestra la niebla resultante y la probabilidad de reliquia', () => {
    const run = createRun(1, team());
    run.mist = 85;
    expect(previewNode(run, 'combat')).toEqual({ mistAfter: 90, tier: 'ruin', relicChance: 0.1 });
    expect(previewNode(run, 'elite').relicChance).toBe(1);
  });
});

describe('botín', () => {
  it('oro +15 % desde Niebla y 4 opciones de carta desde Niebla densa', () => {
    const run = createRun(1, team());
    expect(rollRewards(run, 'combat', 40)).toEqual({ gold: 40, cardOptions: 3, relics: 0 });
    run.mist = 30;
    expect(rollRewards(run, 'combat', 40).gold).toBe(46);
    run.mist = 60;
    expect(rollRewards(run, 'combat', 40).cardOptions).toBe(4);
  });

  it('toda élite da 1 reliquia, 2 en Ruina', () => {
    const run = createRun(1, team());
    expect(rollRewards(run, 'elite', 0).relics).toBe(1);
    run.mist = 90;
    expect(rollRewards(run, 'elite', 0).relics).toBe(2);
  });

  it('combates normales en Ruina: 10 % de reliquia con el RNG de la run', () => {
    const run = createRun(1, team());
    run.mist = 90;
    run.rng = new SeqRng([0.05, 0.5]);
    expect(rollRewards(run, 'combat', 0).relics).toBe(1);
    expect(rollRewards(run, 'combat', 0).relics).toBe(0);
  });
});
