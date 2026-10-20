import { describe, expect, it } from 'vitest';
import { GEAR } from '../../src/data/gear';
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

describe('ofertas del tesoro', () => {
  it('son tres, distintas y visibles: oro, una reliquia y un objeto raro o legendario', () => {
    const e = createExpedition(4);
    const chest = openChest(e);
    expect(chest.offers.map((o) => o.kind).sort()).toEqual(['gear', 'gold', 'relic']);
    const gold = chest.offers.find((o) => o.kind === 'gold')!;
    expect(gold.kind === 'gold' && gold.amount).toBe(CONFIG.chest.gold);
    const relic = chest.offers.find((o) => o.kind === 'relic')!;
    expect(RELIC_LIST.map((r) => r.id)).toContain(relic.kind === 'relic' ? relic.id : '');
    const gear = chest.offers.find((o) => o.kind === 'gear')!;
    expect(gear.kind === 'gear' && GEAR[gear.id].rarity).not.toBe('common');
  });

  it('abrirlo otra vez no regenera las ofertas y es reproducible con la semilla', () => {
    const e = createExpedition(4);
    const a = openChest(e);
    expect(openChest(e)).toBe(a);
    const f = createExpedition(4);
    expect(openChest(f).offers).toEqual(a.offers);
  });

  it('si ya se tienen todas las reliquias, la oferta de reliquia se cambia por más oro', () => {
    const e = createExpedition(4);
    e.run.relics = RELIC_LIST.map((r) => r.id);
    const chest = openChest(e);
    expect(chest.offers.every((o) => o.kind !== 'relic')).toBe(true);
    expect(chest.offers).toHaveLength(3);
    expect(chest.offers.filter((o) => o.kind === 'gold')).toHaveLength(2);
  });
});

describe('elegir una oferta', () => {
  it('el oro se suma', () => {
    const e = createExpedition(4);
    const chest = openChest(e);
    takeChestOffer(e, chest.offers.findIndex((o) => o.kind === 'gold'));
    expect(e.run.gold).toBe(CONFIG.chest.gold);
  });

  it('la reliquia se añade a la expedición y el objeto, al inventario', () => {
    const e = createExpedition(4);
    const chest = openChest(e);
    const r = chest.offers.find((o) => o.kind === 'relic')!;
    takeChestOffer(e, chest.offers.indexOf(r));
    expect(e.run.relics).toContain(r.kind === 'relic' ? r.id : '');
    const f = createExpedition(4);
    const c2 = openChest(f);
    const g = c2.offers.find((o) => o.kind === 'gear')!;
    takeChestOffer(f, c2.offers.indexOf(g));
    expect(f.inventory).toEqual([g.kind === 'gear' ? g.id : '']);
  });

  it('solo se elige una vez y el índice debe ser válido', () => {
    const e = createExpedition(4);
    openChest(e);
    expect(() => takeChestOffer(e, 7)).toThrow(/oferta/i);
    takeChestOffer(e, 0);
    expect(() => takeChestOffer(e, 1)).toThrow(/cerrado/i);
    expect(() => takeChestOffer(createExpedition(4), 0)).toThrow(/tesoro/i);
  });
});
