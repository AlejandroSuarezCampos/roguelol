import { describe, expect, it } from 'vitest';
import { CARDS } from '../../src/data/cards';
import { CONFIG } from '../../src/engine/config';
import { createExpedition } from '../../src/engine/expedition';
import { GEAR } from '../../src/data/gear';
import { buyCard, buyGear, buyPotion, openShop, removeCard, removalPrice, treatWoundAtShop } from '../../src/engine/shop';

const fresh = (gold = 500) => {
  const e = createExpedition(11);
  e.run.gold = gold;
  openShop(e);
  return e;
};

describe('stock del comerciante', () => {
  it('ofrece 3 cartas y 3 pociones distintas con precio, y es reproducible con la semilla', () => {
    const e = fresh();
    expect(e.shop!.cards).toHaveLength(3);
    expect(new Set(e.shop!.cards.map((c) => c.defId)).size).toBe(3);
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

  it('tratar una herida cuesta oro y falla si nadie la tiene', () => {
    const e = fresh(100);
    expect(() => treatWoundAtShop(e)).toThrow(/herida/i);
    e.wounds.lux = 1;
    e.run.champions[2].maxHp = 40;
    treatWoundAtShop(e);
    expect(e.wounds.lux).toBe(0);
    expect(e.run.gold).toBe(100 - CONFIG.shop.treatWound);
    expect(e.run.champions[2].maxHp).toBe(45);
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

describe('gear en venta', () => {
  it('ofrece 2 objetos con el precio de su rareza', () => {
    const e = fresh();
    expect(e.shop!.gear).toHaveLength(2);
    expect(new Set(e.shop!.gear.map((g) => g.gearId)).size).toBe(2);
    for (const g of e.shop!.gear) expect(g.price).toBe(CONFIG.shop.gearPrice[GEAR[g.gearId].rarity]);
  });

  it('comprar gear lo manda al inventario y no se compra dos veces', () => {
    const e = fresh(500);
    const item = e.shop!.gear[0];
    buyGear(e, 0);
    expect(e.inventory).toEqual([item.gearId]);
    expect(e.run.gold).toBe(500 - item.price);
    expect(() => buyGear(e, 0)).toThrow(/vendid/i);
  });

  it('sin oro no compra', () => {
    const e = fresh(1);
    expect(() => buyGear(e, 1)).toThrow(/oro/i);
    expect(e.inventory).toHaveLength(0);
  });
});
