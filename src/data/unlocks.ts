import type { ChampionId } from '../engine/types';

export type UnlockKind = 'starter' | 'card' | 'relic';

export interface UnlockDef {
  /** `${kind}:${ref}`. */
  id: string;
  kind: UnlockKind;
  /** Id del objeto inicial, de la carta o de la reliquia que desbloquea. */
  ref: string;
  /** Coste en Esquirlas. */
  cost: number;
}

const u = (kind: UnlockKind, ref: string, cost: number): UnlockDef => ({ id: `${kind}:${ref}`, kind, ref, cost });

/**
 * Desbloqueos permanentes (spec §14 revisada: desbloqueos, no estadísticas). Lo que aparece aquí empieza bloqueado; todo lo demás
 * está disponible desde la primera expedición. Provisional: más campeones, cartas y reliquias se añadirán aquí.
 */
export const UNLOCKS: UnlockDef[] = [
  u('starter', 'blade', 30),
  u('starter', 'ring', 30),
  u('starter', 'doranshield', 30),
  u('starter', 'atlas', 30),
  u('card', 'l8', 60),
  u('card', 'y8', 60),
  u('card', 'x7', 60),
  u('card', 's5', 60),
  u('relic', 'emblem', 60),
  u('relic', 'bowl', 60),
  u('relic', 'voidshard', 90),
];

export const UNLOCK_BY_ID: Record<string, UnlockDef> = Object.fromEntries(UNLOCKS.map((x) => [x.id, x]));

export const UNLOCK_KIND_LABEL: Record<UnlockKind, string> = { starter: 'Objetos iniciales', card: 'Cartas', relic: 'Reliquias' };

/** Lo que una expedición recibe del progreso permanente al crearse. */
export interface RunSetup {
  /** Cartas y reliquias aún bloqueadas: no salen en botín, tienda, eventos ni tesoros. */
  locked: { cards: string[]; relics: string[] };
  /** Objeto inicial elegido para cada campeón (se equipa al empezar). */
  starters: Partial<Record<ChampionId, string>>;
}

/** Sin progreso que aplicar: nada bloqueado ni objetos iniciales (lo que usan los tests y el bot). */
export const OPEN_SETUP: RunSetup = { locked: { cards: [], relics: [] }, starters: {} };
