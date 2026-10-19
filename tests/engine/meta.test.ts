import { describe, expect, it } from 'vitest';
import { PERKS, PERK_IDS } from '../../src/data/perks';
import { CARDS } from '../../src/data/cards';
import { CHAMPIONS } from '../../src/data/champions';
import { availableNodes, combatFromExpedition, createExpedition, enterNode, finishCombat, retreat } from '../../src/engine/expedition';
import { NO_PERKS, buyPerk, newMeta, perksFor, recordRun, shardsFor } from '../../src/engine/meta';
import { maxHpFor } from '../../src/engine/gear';

describe('Esquirlas', () => {
  it('suman pisos, combates, élites y el bonus de victoria, con mínimo 5', () => {
    const e = createExpedition(1);
    expect(shardsFor(e)).toBe(5); // sin avanzar: mínimo
    e.visited = ['a', 'b', 'c', 'd'];
    e.stats = { combats: 3, elites: 1 };
    expect(shardsFor(e)).toBe(3 * 4 + 2 * 3 + 5 * 1);
    e.status = 'victory';
    expect(shardsFor(e)).toBe(3 * 4 + 2 * 3 + 5 + 40);
  });

  it('en Pesadilla se multiplican por 1,5', () => {
    const e = createExpedition(1, 'nightmare');
    e.visited = ['a', 'b'];
    e.stats = { combats: 2, elites: 0 };
    expect(shardsFor(e)).toBe(Math.round((3 * 2 + 2 * 2) * 1.5));
  });

  it('retirarse no penaliza las Esquirlas', () => {
    const a = createExpedition(1);
    a.visited = ['x', 'y'];
    a.stats = { combats: 2, elites: 0 };
    const b = createExpedition(1);
    b.visited = ['x', 'y'];
    b.stats = { combats: 2, elites: 0 };
    retreat(b);
    expect(shardsFor(b)).toBe(shardsFor(a));
  });
});

describe('Esquirlas: nada de granjearlas sin jugar', () => {
  it('retirarse sin haber ganado un combate no da Esquirlas; perder sí (mínimo 5)', () => {
    const r = createExpedition(1);
    r.visited = [r.map.nodes[0].id];
    retreat(r);
    expect(shardsFor(r)).toBe(0);
    const m = newMeta();
    expect(recordRun(m, r).shards).toBe(0);
    expect(m.history.retreats).toBe(1);
    const d = createExpedition(1);
    d.visited = [d.map.nodes[0].id];
    d.status = 'defeat';
    expect(shardsFor(d)).toBe(5);
  });
});

describe('mejoras permanentes', () => {
  it('hay 4 mejoras de 3 niveles con costes crecientes', () => {
    expect(PERK_IDS).toHaveLength(4);
    for (const id of PERK_IDS) {
      expect(PERKS[id].costs).toHaveLength(3);
      expect(PERKS[id].values).toHaveLength(3);
      expect(PERKS[id].costs[0]).toBeLessThan(PERKS[id].costs[1]);
      expect(PERKS[id].costs[1]).toBeLessThan(PERKS[id].costs[2]);
      expect(PERKS[id].values[0]).toBeLessThan(PERKS[id].values[2]);
    }
  });

  it('comprar gasta Esquirlas, sube el nivel y no pasa del 3', () => {
    const m = newMeta();
    m.shards = 1000;
    buyPerk(m, 'vigor');
    expect(m.perks.vigor).toBe(1);
    expect(m.shards).toBe(1000 - PERKS.vigor.costs[0]);
    buyPerk(m, 'vigor');
    buyPerk(m, 'vigor');
    expect(m.perks.vigor).toBe(3);
    expect(() => buyPerk(m, 'vigor')).toThrow(/máximo/i);
  });

  it('sin saldo no compra nada', () => {
    const m = newMeta();
    m.shards = PERKS.vigor.costs[0] - 1;
    expect(() => buyPerk(m, 'vigor')).toThrow(/Esquirlas/);
    expect(m.perks.vigor).toBe(0);
    expect(m.shards).toBe(PERKS.vigor.costs[0] - 1);
  });

  it('perksFor traduce los niveles a ventajas', () => {
    const m = newMeta();
    expect(perksFor(m)).toEqual(NO_PERKS);
    m.perks = { vigor: 2, provisions: 3, belt: 1, mastery: 3 };
    expect(perksFor(m)).toEqual({ hp: PERKS.vigor.values[1], gold: PERKS.provisions.values[2], potions: PERKS.belt.values[0], upgradedCards: PERKS.mastery.values[2] });
  });
});

describe('aplicar las ventajas al empezar', () => {
  it('sin mejoras la expedición es idéntica a la de antes', () => {
    const a = createExpedition(3);
    const b = createExpedition(3, 'normal', NO_PERKS);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('vida máxima, oro, pociones y cartas mejoradas', () => {
    const e = createExpedition(3, 'normal', { hp: 10, gold: 50, potions: 2, upgradedCards: 3 });
    for (const c of e.run.champions) {
      expect(c.maxHp).toBe(CHAMPIONS[c.id].maxHp + 10);
      expect(c.hp).toBe(c.maxHp);
      expect(maxHpFor(e, c.id)).toBe(c.maxHp);
    }
    expect(e.run.gold).toBe(50);
    expect(e.run.belt.filter((p) => p?.id === 'health')).toHaveLength(2);
    expect(e.deck.filter((id) => id.endsWith('+'))).toHaveLength(3);
    expect(e.deck.every((id) => CARDS[id.replace('+', '')])).toBe(true);
  });

  it('la vida extra sigue contando tras una herida', () => {
    const e = createExpedition(3, 'normal', { ...NO_PERKS, hp: 10 });
    e.wounds.lux = 1;
    expect(maxHpFor(e, 'lux')).toBe(Math.round(CHAMPIONS.lux.maxHp * 0.9) + 10);
  });

  it('elegir cartas mejoradas no altera el combate reproducible de la run', () => {
    const plain = createExpedition(3);
    const perked = createExpedition(3, 'normal', { ...NO_PERKS, upgradedCards: 2 });
    const a = combatFromExpedition(plain, 'combat');
    const b = combatFromExpedition(perked, 'combat');
    expect(b.units.filter((u) => u.side === 'enemy').map((u) => u.id)).toEqual(a.units.filter((u) => u.side === 'enemy').map((u) => u.id));
  });

  it('con todo al máximo el bonus es moderado (spec §14)', () => {
    const m = newMeta();
    m.perks = { vigor: 3, provisions: 3, belt: 3, mastery: 3 };
    const p = perksFor(m);
    expect(p.hp / Math.min(...Object.values(CHAMPIONS).map((c) => c.maxHp))).toBeLessThan(0.4);
    expect(p.gold).toBeLessThanOrEqual(100);
    expect(p.potions).toBeLessThanOrEqual(3);
  });
});

describe('recordRun', () => {
  const play = (e: ReturnType<typeof createExpedition>, kind: 'combat' | 'elite' = 'combat') => {
    const s = combatFromExpedition(e, kind);
    for (const u of s.units) if (u.side === 'enemy') { u.hp = 0; u.downed = true; }
    s.outcome = 'won';
    finishCombat(e, s, kind);
  };

  it('añade las Esquirlas, suma el historial y se puede llamar una sola vez por expedición', () => {
    const m = newMeta();
    const e = createExpedition(5);
    enterNode(e, availableNodes(e)[0].id);
    play(e);
    e.status = 'victory';
    const r = recordRun(m, e);
    expect(r.shards).toBe(shardsFor(e));
    expect(m.shards).toBe(r.shards);
    expect(m.history).toMatchObject({ runs: 1, victories: 1, defeats: 0, retreats: 0, combatsWon: 1, bestFloor: 1 });
    expect(recordRun(m, e).shards).toBe(0);
    expect(m.shards).toBe(r.shards);
    expect(m.history.runs).toBe(1);
  });

  it('el bestiario cuenta enemigos vistos y derrotados', () => {
    const m = newMeta();
    const e = createExpedition(5);
    play(e);
    const s = combatFromExpedition(e, 'combat');
    s.outcome = 'lost';
    finishCombat(e, s, 'combat');
    recordRun(m, e);
    const seen = Object.values(m.bestiary).reduce((a, b) => a + b.seen, 0);
    const defeated = Object.values(m.bestiary).reduce((a, b) => a + b.defeated, 0);
    expect(seen).toBeGreaterThan(defeated);
    expect(defeated).toBeGreaterThan(0);
  });

  it('cuenta las muertes de Pesadilla y el resultado', () => {
    const m = newMeta();
    const e = createExpedition(5, 'nightmare');
    e.dead.push('lux', 'soraka');
    e.status = 'defeat';
    recordRun(m, e);
    expect(m.history).toMatchObject({ defeats: 1, nightmareDeaths: 2 });
  });
});
