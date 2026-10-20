import { describe, expect, it } from 'vitest';
import { RELIC_LIST } from '../../src/data/relics';
import { CONFIG } from '../../src/engine/config';
import { createExpedition, generateMap } from '../../src/engine/expedition';
import { openChest, takeChestOffer } from '../../src/engine/chest';
import { Rng } from '../../src/engine/rng';

describe('mapa con tesoro y santuario', () => {
  it('el piso del tesoro (a mitad de mapa) es entero de cofres y no hay otros; santuarios raros fuera de ese piso', () => {
    const mid = CONFIG.expedition.chestFloor;
    let shrines = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const m = generateMap(new Rng(seed));
      expect(m.nodes.filter((n) => n.floor === mid).every((n) => n.type === 'chest'), `tesoro ${seed}`).toBe(true);
      expect(m.nodes.filter((n) => n.type === 'chest').every((n) => n.floor === mid)).toBe(true);
      const s = m.nodes.filter((n) => n.type === 'shrine');
      expect(s.length, `santuarios ${seed}`).toBeLessThanOrEqual(2);
      for (const n of s) expect(n.floor).toBeGreaterThanOrEqual(2), expect(n.floor).toBeLessThanOrEqual(12);
      shrines += s.length;
    }
    expect(shrines).toBeGreaterThan(60);
    expect(shrines).toBeLessThan(450);
  });

  it('siguen garantizados el comerciante y el evento', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const m = generateMap(new Rng(seed));
      expect(m.nodes.some((n) => n.type === 'shop')).toBe(true);
      expect(m.nodes.some((n) => n.type === 'event')).toBe(true);
    }
  });
});

describe('contenido del tesoro', () => {
  it('trae una sola reliquia que aún no se tiene', () => {
    const e = createExpedition(4);
    e.run.relics.push(RELIC_LIST[0].id);
    const chest = openChest(e);
    expect(chest.offers).toHaveLength(1);
    const o = chest.offers[0];
    expect(o.kind).toBe('relic');
    expect(o.kind === 'relic' && o.id).not.toBe(RELIC_LIST[0].id);
  });

  it('abrirlo otra vez no lo regenera y es reproducible con la semilla', () => {
    const e = createExpedition(4);
    const a = openChest(e);
    expect(openChest(e)).toBe(a);
    expect(openChest(createExpedition(4)).offers).toEqual(a.offers);
  });

  it('si ya se tienen todas las reliquias, trae oro', () => {
    const e = createExpedition(4);
    e.run.relics = RELIC_LIST.map((r) => r.id);
    expect(openChest(e).offers).toEqual([{ kind: 'gold', amount: CONFIG.chest.fallbackGold }]);
  });
});

describe('coger el contenido', () => {
  it('la reliquia se añade a la expedición y el oro se suma', () => {
    const e = createExpedition(4);
    const o = openChest(e).offers[0];
    takeChestOffer(e, 0);
    expect(e.run.relics).toContain(o.kind === 'relic' ? o.id : '');
    const f = createExpedition(4);
    f.run.relics = RELIC_LIST.map((r) => r.id);
    openChest(f);
    takeChestOffer(f, 0);
    expect(f.run.gold).toBe(CONFIG.chest.fallbackGold);
  });

  it('solo se coge una vez y fuera de un tesoro no se puede', () => {
    const e = createExpedition(4);
    openChest(e);
    expect(() => takeChestOffer(e, 7)).toThrow(/oferta/i);
    takeChestOffer(e, 0);
    expect(() => takeChestOffer(e, 0)).toThrow(/cerrado/i);
    expect(() => takeChestOffer(createExpedition(4), 0)).toThrow(/tesoro/i);
  });
});
