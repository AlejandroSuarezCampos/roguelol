import { GEAR } from '../data/gear';
import { RELIC_LIST } from '../data/relics';
import { CONFIG } from './config';
import { pickGear, type Expedition } from './expedition';

export type ChestOffer = { kind: 'gold'; amount: number } | { kind: 'relic'; id: string } | { kind: 'gear'; id: string };

export interface ChestState {
  offers: ChestOffer[];
  /** Índice de la oferta elegida (null = aún sin elegir). */
  taken: number | null;
}

/**
 * Abre el tesoro del nodo actual: tres ofertas visibles (oro, una reliquia no repetida y un objeto raro o legendario).
 * Si ya se tienen todas las reliquias, esa oferta pasa a ser más oro. Sale de la semilla de la run y no cambia al reabrir.
 */
export function openChest(e: Expedition): ChestState {
  if (e.chest) return e.chest;
  const rng = e.run.rng;
  const fresh = RELIC_LIST.filter((r) => !e.run.relics.includes(r.id));
  const relic: ChestOffer = fresh.length ? { kind: 'relic', id: rng.pick(fresh).id } : { kind: 'gold', amount: CONFIG.chest.fallbackGold };
  const gear = pickGear(rng, CONFIG.gear.rarityWeights.boss, 1)[0];
  e.chest = { offers: [{ kind: 'gold', amount: CONFIG.chest.gold }, relic, { kind: 'gear', id: gear }], taken: null };
  return e.chest;
}

/** Elige una oferta: el cofre se cierra y no se puede cambiar. */
export function takeChestOffer(e: Expedition, index: number): ChestOffer {
  const chest = e.chest;
  if (!chest) throw new Error('No estás en un tesoro');
  if (chest.taken !== null) throw new Error('El cofre ya está cerrado');
  const offer = chest.offers[index];
  if (!offer) throw new Error('Esa oferta no existe');
  chest.taken = index;
  if (offer.kind === 'gold') e.run.gold += offer.amount;
  else if (offer.kind === 'relic') e.run.relics.push(offer.id);
  else e.inventory.push(offer.id);
  return offer;
}

export const offerName = (o: ChestOffer): string =>
  o.kind === 'gold' ? `${o.amount} de oro` : o.kind === 'relic' ? (RELIC_LIST.find((r) => r.id === o.id)?.name ?? o.id) : GEAR[o.id].name;
