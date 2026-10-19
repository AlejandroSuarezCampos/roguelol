import { CARD_LIST, CARDS } from '../data/cards';
import { CHAMPIONS } from '../data/champions';
import { CONFIG } from './config';
import type { Expedition } from './expedition';
import { claimPotion } from './expedition';
import { POTIONS } from './potions';
import type { PotionId } from './types';

export interface ShopCard {
  defId: string;
  price: number;
  sold: boolean;
}
export interface ShopPotion {
  id: PotionId;
  price: number;
  sold: boolean;
}
export interface ShopState {
  cards: ShopCard[];
  potions: ShopPotion[];
  /** Una herida tratada por visita basta: el servicio se vende una vez. */
  woundTreated: boolean;
}

/** Abre el comerciante del nodo actual. El stock sale de la semilla de la run y no cambia al reabrir. */
export function openShop(e: Expedition): ShopState {
  if (e.shop) return e.shop;
  const rng = e.run.rng;
  const cards = rng.shuffle(CARD_LIST).slice(0, 3).map((c) => ({ defId: c.id, price: CONFIG.shop.cardPrice[c.rarity], sold: false }));
  const potions = rng.shuffle(Object.keys(POTIONS) as PotionId[]).slice(0, 3).map((id) => ({ id, price: CONFIG.shop.potionPrice[id], sold: false }));
  e.shop = { cards, potions, woundTreated: false };
  return e.shop;
}

function pay(e: Expedition, price: number): void {
  if (e.run.gold < price) throw new Error(`Oro insuficiente (faltan ${price - e.run.gold})`);
  e.run.gold -= price;
}

function stock(e: Expedition): ShopState {
  if (!e.shop) throw new Error('No estás en un comerciante');
  return e.shop;
}

export function buyCard(e: Expedition, index: number): void {
  const item = stock(e).cards[index];
  if (!item) throw new Error('Esa carta no está en venta');
  if (item.sold) throw new Error('Vendido');
  pay(e, item.price);
  item.sold = true;
  e.deck.push(item.defId);
}

/** Con el cinturón lleno hay que indicar qué hueco sustituir (el oro no se gasta hasta entonces). */
export function buyPotion(e: Expedition, index: number, slot?: number): void {
  const item = stock(e).potions[index];
  if (!item) throw new Error('Esa poción no está en venta');
  if (item.sold) throw new Error('Vendido');
  if (e.run.gold < item.price) throw new Error(`Oro insuficiente (faltan ${item.price - e.run.gold})`);
  if (claimPotion(e, item.id, slot) === 'full') throw new Error('Cinturón lleno: elige qué poción sustituir');
  e.run.gold -= item.price;
  item.sold = true;
}

export function treatWoundAtShop(e: Expedition): void {
  const s = stock(e);
  if (s.woundTreated) throw new Error('Vendido');
  const worst = [...e.run.champions].sort((a, b) => e.wounds[b.id] - e.wounds[a.id])[0];
  if (!e.wounds[worst.id]) throw new Error('Nadie tiene heridas');
  pay(e, CONFIG.shop.treatWound);
  e.wounds[worst.id]--;
  worst.maxHp = Math.round(CHAMPIONS[worst.id].maxHp * (1 - CONFIG.expedition.wound.maxHpLoss * e.wounds[worst.id]));
  s.woundTreated = true;
}

export const removalPrice = (e: Expedition): number => CONFIG.shop.removeCard + e.removals * CONFIG.shop.removeCardStep;

/** Quita la carta en la posición `deckIndex` del mazo. */
export function removeCard(e: Expedition, deckIndex: number): void {
  stock(e);
  if (!CARDS[e.deck[deckIndex]]) throw new Error('Esa carta no está en el mazo');
  if (e.deck.length <= CONFIG.shop.minDeck) throw new Error(`El mazo no puede tener menos de ${CONFIG.shop.minDeck} cartas`);
  pay(e, removalPrice(e));
  e.deck.splice(deckIndex, 1);
  e.removals++;
}
