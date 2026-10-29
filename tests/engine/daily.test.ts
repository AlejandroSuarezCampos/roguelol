import { describe, expect, it } from 'vitest';
import { createDailyExpedition, dailyPlan, dailyScore, dateKey, hashSeed, DAILY_MODIFIERS } from '../../src/engine/daily';
import { createGameStore } from '../../src/state/gameStore';
import { createDailyManager, recordDaily, streakOf, DAILY_KEY, type DailyRecords } from '../../src/save/dailyManager';
import { availableNodes } from '../../src/engine/expedition';

const mem = (init: Record<string, string> = {}) => {
  const m = { ...init };
  return { getItem: (k: string) => m[k] ?? null, setItem: (k: string, v: string) => void (m[k] = v), removeItem: (k: string) => void delete m[k], m };
};

describe('reto diario', () => {
  it('la misma clave da siempre el mismo reto', () => {
    expect(dailyPlan('2026-01-01')).toEqual(dailyPlan('2026-01-01'));
    const a = createDailyExpedition('2026-01-01');
    const b = createDailyExpedition('2026-01-01');
    expect(a.party).toEqual(b.party);
    expect(a.map).toEqual(b.map);
    expect(a.seed).toBe(hashSeed('shattered-runeterra:2026-01-01'));
  });

  it('el equipo siempre tiene 4 campeones distintos y la mezcla de días varía', () => {
    const plans = Array.from({ length: 60 }, (_, i) => dailyPlan(`2026-02-${String(i + 1).padStart(2, '0')}`));
    for (const p of plans) expect(new Set(p.party).size).toBe(4);
    expect(new Set(plans.map((p) => p.party.join())).size).toBeGreaterThan(50);
    expect(new Set(plans.map((p) => p.modifier.id)).size).toBe(DAILY_MODIFIERS.length);
  });

  it('cada modificador se aplica y la expedición es válida', () => {
    const seen = new Set<string>();
    for (let i = 1; i < 200 && seen.size < DAILY_MODIFIERS.length; i++) {
      const e = createDailyExpedition(`seed:t${i}`);
      seen.add(e.daily!.modifier);
      if (e.daily!.modifier === 'rich') expect(e.run.gold).toBe(150);
      if (e.daily!.modifier === 'relic') expect(e.run.relics).toHaveLength(1);
      if (e.daily!.modifier === 'potions') expect(e.run.belt.filter(Boolean).length).toBeGreaterThanOrEqual(3);
      if (e.daily!.modifier === 'kitted') expect(Object.values(e.gear).flat().filter(Boolean)).toHaveLength(4);
      expect(e.run.champions).toHaveLength(4);
    }
    expect(seen.size).toBe(DAILY_MODIFIERS.length);
  });

  it('dateKey usa la fecha local', () => expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05'));

  it('la puntuación premia ganar', () => {
    const e = createDailyExpedition('2026-03-03');
    const base = dailyScore(e);
    e.status = 'victory';
    expect(dailyScore(e)).toBe(base + 200);
  });
});

describe('guardado de retos', () => {
  it('conserva la mejor puntuación y que se ganó alguna vez', () => {
    const r: DailyRecords = {};
    recordDaily(r, '2026-03-03', 100, true, 1);
    recordDaily(r, '2026-03-03', 50, false, 2);
    expect(r['2026-03-03']).toEqual({ best: 100, won: true, attempts: 2, last: 2 });
  });

  it('calcula la racha con hoy o ayer y se corta con un día sin ganar', () => {
    const r: DailyRecords = {};
    for (const d of ['2026-03-01', '2026-03-02', '2026-03-03']) recordDaily(r, d, 10, true);
    expect(streakOf(r, '2026-03-03')).toBe(3);
    expect(streakOf(r, '2026-03-04')).toBe(3); // hoy aún sin jugar
    expect(streakOf(r, '2026-03-05')).toBe(0);
    recordDaily(r, '2026-03-02', 10, false);
    r['2026-03-02'].won = false;
    expect(streakOf(r, '2026-03-03')).toBe(1);
  });

  it('guarda y recarga; datos dañados se ignoran sin lanzar', () => {
    const s = mem();
    const m = createDailyManager(s);
    const r: DailyRecords = {};
    recordDaily(r, '2026-03-03', 70, false);
    m.save(r);
    expect(m.load()).toEqual(r);
    expect(createDailyManager(mem({ [DAILY_KEY]: '{no json' })).load()).toEqual({});
    expect(createDailyManager(mem({ [DAILY_KEY]: JSON.stringify({ version: 1, records: { a: { best: 'x' } } }) })).load()).toEqual({});
    expect(createDailyManager(null).load()).toEqual({});
  });

  it('recorta el historial a las entradas más recientes', () => {
    const s = mem();
    const r: DailyRecords = {};
    for (let i = 0; i < 100; i++) recordDaily(r, `seed:${i}`, 1, false, i);
    createDailyManager(s).save(r);
    const back = createDailyManager(s).load();
    expect(Object.keys(back)).toHaveLength(80);
    expect(back['seed:99']).toBeDefined();
    expect(back['seed:0']).toBeUndefined();
  });
});

describe('reto en el flujo de juego', () => {
  it('equipo y Ascensión quedan fijos en la preparación', () => {
    const g = createGameStore();
    g.startDaily('2026-04-04');
    const party = [...g.getState().expedition!.party];
    const asc = g.getState().expedition!.ascension;
    g.setParty(['leona', 'yasuo', 'lux', 'soraka']);
    g.setAscension(asc === 0 ? 1 : 0);
    expect(g.getState().expedition!.party).toEqual(party);
    expect(g.getState().expedition!.ascension).toBe(asc);
  });

  it('al perder se guarda la puntuación, la Ascensión máxima no cambia y se recarga', () => {
    const store = mem();
    const g = createGameStore({ daily: createDailyManager(store) });
    g.startDaily('2026-04-04');
    g.startExpedition();
    g.chooseNode(availableNodes(g.getState().expedition!)[0].id);
    const s = g.getState().combat!;
    for (const u of s.units) if (u.side === 'ally') { u.hp = 0; u.downed = true; }
    s.outcome = 'lost';
    g.concludeCombat();
    const st = g.getState();
    expect(st.screen).toBe('result');
    expect(st.lastDaily).toMatchObject({ won: false });
    expect(st.daily['2026-04-04'].attempts).toBe(1);
    expect(st.meta.maxAscension).toBe(0);
    expect(createDailyManager(store).load()['2026-04-04'].attempts).toBe(1);
    expect(createGameStore({ daily: createDailyManager(store) }).getState().daily['2026-04-04']).toBeDefined();
  });

  it('una expedición normal no deja rastro en los retos', () => {
    const g = createGameStore();
    g.newExpedition(3);
    g.startExpedition();
    g.retreat();
    expect(g.getState().lastDaily).toBeNull();
    expect(g.getState().daily).toEqual({});
  });
});
