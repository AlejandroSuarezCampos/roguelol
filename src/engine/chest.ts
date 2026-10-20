import { RELIC_LIST } from '../data/relics';
import { CONFIG } from './config';
import type { Expedition } from './expedition';

export type ChestOffer = { kind: 'gold'; amount: number } | { kind: 'relic'; id: string };

export interface ChestState {
  offers: ChestOffer[];
  /** Índice de la oferta elegida (null = aún sin elegir). */
  taken: number | null;
}

/**
 * Abre el tesoro del nodo actual (como en Slay the Spire): un cofre con una reliquia no repetida, sin elegir. Si ya se tienen todas,
 * trae oro. Sale de la semilla de la run y no cambia al reabrir. `offers` siempre tiene un único contenido.
 */
export function openChest(e: Expedition): ChestState {
  if (e.chest) return e.chest;
  const fresh = RELIC_LIST.filter((r) => !e.run.relics.includes(r.id));
  const offer: ChestOffer = fresh.length ? { kind: 'relic', id: e.run.rng.pick(fresh).id } : { kind: 'gold', amount: CONFIG.chest.fallbackGold };
  e.chest = { offers: [offer], taken: null };
  return e.chest;
}

/** Coge el contenido del cofre (índice 0): se cierra y no se puede volver a abrir. */
export function takeChestOffer(e: Expedition, index: number): ChestOffer {
  const chest = e.chest;
  if (!chest) throw new Error('No estás en un tesoro');
  if (chest.taken !== null) throw new Error('El cofre ya está cerrado');
  const offer = chest.offers[index];
  if (!offer) throw new Error('Esa oferta no existe');
  chest.taken = index;
  if (offer.kind === 'gold') e.run.gold += offer.amount;
  else e.run.relics.push(offer.id);
  return offer;
}

export const offerName = (o: ChestOffer): string =>
  o.kind === 'gold' ? `${o.amount} de oro` : (RELIC_LIST.find((r) => r.id === o.id)?.name ?? o.id);
