import { describe, expect, it } from 'vitest';
import { GEAR } from '../../src/data/gear';
import { RELIC_LIST } from '../../src/data/relics';
import { OPEN_SETUP, UNLOCKS } from '../../src/data/unlocks';
import { CARDS } from '../../src/data/cards';
import { CHAMPIONS } from '../../src/data/champions';
import { availableNodes, combatFromExpedition, createExpedition, enterNode, finishCombat, retreat } from '../../src/engine/expedition';
import { buyUnlock, newMeta, recordRun, setStarter, setupFor, shardsFor } from '../../src/engine/meta';
import { openShop } from '../../src/engine/shop';
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

  it('cada nivel de Ascensión suma un 10 %', () => {
    const e = createExpedition(1, 5);
    e.visited = ['a', 'b'];
    e.stats = { combats: 2, elites: 0 };
    expect(shardsFor(e)).toBe(Math.round((3 * 2 + 2 * 2) * 1.5));
  });

  it('ganar en el nivel más alto desbloqueado desbloquea el siguiente (hasta el 10); perder o ganar por debajo, no', () => {
    const m = newMeta();
    const run = (asc: number, status: 'victory' | 'defeat') => {
      const e = createExpedition(1, asc);
      e.stats = { combats: 1, elites: 0 };
      e.status = status;
      recordRun(m, e);
    };
    run(0, 'defeat');
    expect(m.maxAscension).toBe(0);
    run(0, 'victory');
    expect(m.maxAscension).toBe(1);
    run(0, 'victory');
    expect(m.maxAscension).toBe(1);
    m.maxAscension = 10;
    run(10, 'victory');
    expect(m.maxAscension).toBe(10);
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

describe('desbloqueos', () => {
  it('hay objetos iniciales, cartas y reliquias, todos con coste y referencia válida', () => {
    for (const kind of ['starter', 'card', 'relic'] as const) expect(UNLOCKS.filter((u) => u.kind === kind).length, kind).toBeGreaterThan(0);
    expect(new Set(UNLOCKS.map((u) => u.id)).size).toBe(UNLOCKS.length);
    for (const u of UNLOCKS) {
      expect(u.cost).toBeGreaterThan(0);
      if (u.kind === 'starter') expect(GEAR[u.ref]?.starter, u.id).toBe(true);
      if (u.kind === 'card') expect(CARDS[u.ref], u.id).toBeDefined();
      if (u.kind === 'relic') expect(RELIC_LIST.some((r) => r.id === u.ref), u.id).toBe(true);
    }
  });

  it('las cartas bloqueadas no están en el mazo inicial', async () => {
    const { STARTER_DECK } = await import('../../src/data/cards');
    for (const u of UNLOCKS.filter((x) => x.kind === 'card')) expect(STARTER_DECK).not.toContain(u.ref);
  });

  it('comprar gasta Esquirlas y no se compra dos veces ni sin saldo', () => {
    const m = newMeta();
    const u = UNLOCKS[0];
    expect(() => buyUnlock(m, u.id)).toThrow(/Esquirlas/);
    m.shards = u.cost + 5;
    buyUnlock(m, u.id);
    expect(m.shards).toBe(5);
    expect(m.unlocked).toEqual([u.id]);
    expect(() => buyUnlock(m, u.id)).toThrow(/Ya está/);
    expect(() => buyUnlock(m, 'card:nope')).toThrow(/no existe/);
  });

  it('el objeto inicial solo se elige si está desbloqueado y es inicial', () => {
    const m = newMeta();
    expect(() => setStarter(m, 'yasuo', 'blade')).toThrow(/bloqueado/);
    expect(() => setStarter(m, 'yasuo', 'infinity')).toThrow(/inicial/);
    m.unlocked.push('starter:blade');
    setStarter(m, 'yasuo', 'blade');
    expect(m.loadout).toEqual({ yasuo: 'blade' });
    setStarter(m, 'yasuo', null);
    expect(m.loadout).toEqual({});
  });

  it('setupFor bloquea lo no comprado y pasa los objetos iniciales', () => {
    const m = newMeta();
    const fresh = setupFor(m);
    expect(fresh.locked.cards.length).toBe(UNLOCKS.filter((u) => u.kind === 'card').length);
    expect(fresh.locked.relics.length).toBe(UNLOCKS.filter((u) => u.kind === 'relic').length);
    m.unlocked.push('card:l8', 'starter:ring');
    m.loadout.lux = 'ring';
    const s = setupFor(m);
    expect(s.locked.cards).not.toContain('l8');
    expect(s.starters).toEqual({ lux: 'ring' });
  });
});

describe('aplicar el progreso al empezar', () => {
  it('sin progreso que aplicar la expedición es idéntica a la de antes', () => {
    expect(JSON.stringify(createExpedition(3, 0, OPEN_SETUP))).toBe(JSON.stringify(createExpedition(3)));
  });

  it('el objeto inicial empieza equipado y su vida suma a la vida actual', () => {
    const e = createExpedition(3, 0, { ...OPEN_SETUP, starters: { lux: 'atlas' } });
    const lux = e.run.champions.find((c) => c.id === 'lux')!;
    expect(e.gear.lux[0]).toBe('atlas');
    expect(e.inventory).toEqual([]);
    expect(lux.maxHp).toBe(CHAMPIONS.lux.maxHp + GEAR.atlas.hp!);
    expect(lux.hp).toBe(lux.maxHp);
    expect(maxHpFor(e, 'lux')).toBe(lux.maxHp);
    expect(() => createExpedition(3, 0, { ...OPEN_SETUP, starters: { lux: 'rabadon' } })).toThrow(/inicial/);
  });

  it('lo bloqueado no sale en el botín ni en la tienda', () => {
    const locked = { cards: ['l8', 'y8', 'x7', 's5'], relics: RELIC_LIST.slice(0, 7).map((r) => r.id) };
    for (let seed = 1; seed <= 40; seed++) {
      const e = createExpedition(seed, 0, { locked, starters: {} });
      const s = combatFromExpedition(e, 'elite');
      for (const u of s.units) if (u.side === 'enemy') { u.hp = 0; u.downed = true; }
      s.outcome = 'won';
      const r = finishCombat(e, s, 'elite')!;
      for (const id of r.cards) expect(locked.cards).not.toContain(id);
      for (const id of r.relicIds ?? []) expect(locked.relics).not.toContain(id);
      const shop = openShop(e);
      for (const c of shop.cards) expect(locked.cards).not.toContain(c.defId);
      for (const x of shop.relics) expect(locked.relics).not.toContain(x.id);
    }
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

  it('cuenta las muertes permanentes y el resultado', () => {
    const m = newMeta();
    const e = createExpedition(5, 10);
    e.dead.push('lux', 'soraka');
    e.status = 'defeat';
    recordRun(m, e);
    expect(m.history).toMatchObject({ defeats: 1, deaths: 2 });
  });
});
