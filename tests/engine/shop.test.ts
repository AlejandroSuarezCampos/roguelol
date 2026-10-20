import { describe, expect, it } from 'vitest';
import { CARDS } from '../../src/data/cards';
import { CONFIG } from '../../src/engine/config';
import { createExpedition } from '../../src/engine/expedition';
import { RELICS, RELIC_LIST } from '../../src/data/relics';
import { buyCard, buyPotion, buyRelic, openShop, removeCard, removalPrice } from '../../src/engine/shop';

const fresh = (gold = 500) => {
  const e = createExpedition(11);
  e.run.gold = gold;
  openShop(e);
  return e;
};

describe('stock del comerciante', () => {
  it('como en Slay the Spire: 6 cartas, 3 reliquias y 3 pociones distintas con precio, y es reproducible con la semilla', () => {
    const e = fresh();
    expect(e.shop!.cards).toHaveLength(CONFIG.shop.cards);
    expect(new Set(e.shop!.cards.map((c) => c.defId)).size).toBe(CONFIG.shop.cards);
    expect(e.shop!.relics).toHaveLength(3);
    expect(new Set(e.shop!.relics.map((r) => r.id)).size).toBe(3);
    for (const r of e.shop!.relics) expect(r.price).toBe(CONFIG.shop.relicPrice[RELICS[r.id].rarity]);
    expect(e.shop!.potions).toHaveLength(3);
    expect(new Set(e.shop!.potions.map((p) => p.id)).size).toBe(3);
    for (const c of e.shop!.cards) expect(c.price).toBe(CONFIG.shop.cardPrice[CARDS[c.defId].rarity]);
    const again = createExpedition(11);
    openShop(again);
    expect(again.shop!.cards.map((c) => c.defId)).toEqual(e.shop!.cards.map((c) => c.defId));
  });

  it('abrir otra vez la tienda no regenera el stock', () => {
    const e = fresh();
    const first = e.shop;
    openShop(e);
    expect(e.shop).toBe(first);
  });
});

describe('compras', () => {
  it('comprar una carta gasta oro, la añade al mazo y la marca como vendida', () => {
    const e = fresh(500);
    const item = e.shop!.cards[0];
    buyCard(e, 0);
    expect(e.run.gold).toBe(500 - item.price);
    expect(e.deck.at(-1)).toBe(item.defId);
    expect(item.sold).toBe(true);
    expect(() => buyCard(e, 0)).toThrow(/vendid/i);
  });

  it('sin oro suficiente no compra nada', () => {
    const e = fresh(10);
    expect(() => buyCard(e, 0)).toThrow(/oro/i);
    expect(e.run.gold).toBe(10);
    expect(e.deck).toHaveLength(20);
  });

  it('una poción va al primer hueco; con el cinturón lleno pide hueco', () => {
    const e = fresh(500);
    const first = e.shop!.potions[0];
    buyPotion(e, 0);
    expect(e.run.belt[0]!.id).toBe(first.id);
    buyPotion(e, 1);
    buyPotion(e, 2);
    expect(e.run.belt.every(Boolean)).toBe(true);
    e.shop!.potions[0].sold = false;
    expect(() => buyPotion(e, 0)).toThrow(/cintur/i);
    const gold = e.run.gold;
    buyPotion(e, 0, 1);
    expect(e.run.belt[1]!.id).toBe(first.id);
    expect(e.run.gold).toBe(gold - first.price);
  });

  it('eliminar una carta sube de precio cada vez', () => {
    const e = fresh(500);
    expect(removalPrice(e)).toBe(CONFIG.shop.removeCard);
    const victim = e.deck[0];
    removeCard(e, 0);
    expect(e.deck).toHaveLength(19);
    expect(e.run.gold).toBe(500 - CONFIG.shop.removeCard);
    expect(removalPrice(e)).toBe(CONFIG.shop.removeCard + CONFIG.shop.removeCardStep);
    expect(e.deck.filter((id) => id === victim).length).toBeGreaterThanOrEqual(0);
    expect(() => removeCard(e, 99)).toThrow();
  });

  it('no deja quedarse con menos cartas de las que permite jugar', () => {
    const e = fresh(5000);
    e.deck = e.deck.slice(0, 12); // 4 campeones vivos → mínimo 12
    expect(() => removeCard(e, 0)).toThrow(/mazo/i);
  });
});

describe('reliquias en venta', () => {
  it('comprar una reliquia la añade a la expedición y no se compra dos veces', () => {
    const e = fresh(1000);
    const item = e.shop!.relics[0];
    buyRelic(e, 0);
    expect(e.run.relics).toEqual([item.id]);
    expect(e.run.gold).toBe(1000 - item.price);
    expect(() => buyRelic(e, 0)).toThrow(/vendid/i);
  });

  it('sin oro no compra', () => {
    const e = fresh(1);
    expect(() => buyRelic(e, 1)).toThrow(/oro/i);
    expect(e.run.relics).toHaveLength(0);
  });

  it('no ofrece reliquias que ya se tienen, y con pocas libres ofrece menos', () => {
    const e = createExpedition(11);
    e.run.relics = RELIC_LIST.slice(0, RELIC_LIST.length - 1).map((r) => r.id);
    openShop(e);
    expect(e.shop!.relics.map((r) => r.id)).toEqual([RELIC_LIST.at(-1)!.id]);
  });
});
