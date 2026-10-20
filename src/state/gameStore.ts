import { useSyncExternalStore } from 'react';
import type { EventDef } from '../data/events';
import type { EncounterKind } from '../data/enemies';
import { cardOf, forcedTarget, playCard as enginePlayCard } from '../engine/cards';
import { endTeamTurn } from '../engine/combat';
import {
  claimCard as engineClaimCard, claimGear as engineClaimGear, claimPotion as engineClaimPotion, claimRewards, combatFromExpedition, createExpedition, encounterKind,
  enterNode, finishCombat, rest as engineRest, retreat as engineRetreat, type Expedition, type ExpeditionRewards, type RestAction,
} from '../engine/expedition';
import { equip as engineEquip, unequip as engineUnequip } from '../engine/gear';
import { openChest, takeChestOffer as engineTakeChestOffer } from '../engine/chest';
import { choiceBlocked, pickEvent, resolveChoice, type EventOutcome } from '../engine/events';
import { swapAllies } from '../engine/formation';
import { usePotion as engineUsePotion, usePotionOnMap } from '../engine/potions';
import { reorder } from '../engine/run';
import { buyCard as engineBuyCard, buyPotion as engineBuyPotion, buyRelic as engineBuyRelic, openShop, removeCard as engineRemoveCard } from '../engine/shop';
import type { ChampionId, CombatState, Pos } from '../engine/types';
import { buyPerk as engineBuyPerk, newMeta, perksFor, recordRun, type MetaState } from '../engine/meta';
import type { PerkId } from '../data/perks';
import { createMetaManager, type MetaManager } from '../save/metaManager';
import { browserStorage, cloneExpedition, createSaveManager, type JournalEntry, type SaveManager, type SaveSummary } from '../save/saveManager';
import { intentView } from './selectors';

export type Screen = 'menu' | 'prep' | 'map' | 'battle' | 'reward' | 'rest' | 'shop' | 'event' | 'chest' | 'team' | 'result' | 'upgrades' | 'archive' | 'roster';

/** Número flotante sobre una unidad tras una acción (daño, curación, bloqueo o estrés). */
export interface FxEvent {
  key: number;
  unitId: string;
  kind: 'damage' | 'heal' | 'block' | 'stress' | 'calm' | 'blocked';
  amount: number;
}

export interface GameState {
  screen: Screen;
  expedition: Expedition | null;
  combat: CombatState | null;
  combatKind: EncounterKind | null;
  rewards: ExpeditionRewards | null;
  cardClaimed: boolean;
  potionClaimed: boolean;
  gearClaimed: boolean;
  /** Progreso permanente: Esquirlas, mejoras, bestiario e historial. */
  meta: MetaState;
  /** Esquirlas ganadas por la expedición que acaba de terminar (null si no procede). */
  lastShards: number | null;
  /** Resumen de la expedición guardada (null = no hay). */
  saved: SaveSummary | null;
  /** Aviso para el menú (p. ej. un guardado dañado que se descartó). */
  notice: string | null;
  event: EventDef | null;
  /** Resultado de la opción elegida (null = aún sin elegir). */
  eventOutcome: EventOutcome | null;
  /** uid de la carta seleccionada en la mano. */
  selectedUid: string | null;
  /** Hueco del cinturón seleccionado para usar. */
  selectedPotion: number | null;
  /** Último aviso (motivo de una jugada ilegal, error de regla…). */
  hint: string | null;
  fx: FxEvent[];
  /** Reliquias que se activaron en la última acción (para que su orbe pulse). */
  activeRelics: string[];
}

type Snap = Map<string, { hp: number; block: number; stress: number }>;
const snapshot = (s: CombatState): Snap => new Map(s.units.map((u) => [u.id, { hp: u.hp, block: u.block, stress: u.stress }]));

const initial = (meta: MetaState, saved: SaveSummary | null = null, notice: string | null = null): GameState => ({
  screen: 'menu', expedition: null, combat: null, combatKind: null, rewards: null, cardClaimed: false, potionClaimed: false, gearClaimed: false,
  meta, lastShards: null, saved, notice, event: null, eventOutcome: null, selectedUid: null, selectedPotion: null, hint: null, fx: [], activeRelics: [],
});

export function createGameStore(opts: { save?: SaveManager; meta?: MetaManager } = {}) {
  const save = opts.save;
  const metaStore = opts.meta;
  const loaded = metaStore?.load();
  const meta: MetaState = loaded?.meta ?? newMeta();
  const inspected = save?.inspect();
  const notices = [
    loaded?.corrupt ? `El progreso permanente estaba dañado (${loaded.corrupt}) y se ha reiniciado.` : '',
    inspected?.corrupt ? `La expedición guardada estaba dañada (${inspected.corrupt}) y se ha descartado.` : '',
  ].filter(Boolean);
  let state = initial(meta, inspected?.summary ?? null, notices.length ? `${notices.join(' ')} Se conserva una copia.` : null);
  let fxKey = 0;
  const listeners = new Set<() => void>();
  // Punto seguro (el mapa) y acciones desde entonces: se guardan juntos para que recargar a mitad de un nodo lo reanude tal cual.
  let checkpoint: Expedition | null = null;
  let journal: JournalEntry[] = [];
  let replaying = false;
  let replayFailed = false;

  /** Punto seguro (mapa o Equipo: no hay ningún nodo a medias): guarda la expedición tal cual. */
  function persistSafePoint(): void {
    const e = state.expedition;
    if (!save || replaying || !e || e.status !== 'active') return;
    journal = [];
    state = { ...state, saved: save.save(e) ?? state.saved };
  }

  const emit = (patch: Partial<GameState> = {}) => {
    state = { ...state, ...patch };
    // Los cambios de pantalla son los puntos de guardado: al llegar al mapa o a Equipo se guarda; al terminar la expedición se borra.
    if ('screen' in patch && state.expedition) {
      if (state.screen === 'map' || state.screen === 'team') persistSafePoint();
      else if (state.screen === 'result' && save) {
        save.clear();
        checkpoint = null;
        journal = [];
        state = { ...state, saved: null };
      }
    }
    // Al terminar la expedición se suma una sola vez al progreso permanente.
    if (state.screen === 'result' && state.expedition && !state.expedition.recorded) {
      state = { ...state, lastShards: recordRun(meta, state.expedition).shards };
      metaStore?.save(meta);
    }
    listeners.forEach((l) => l());
  };

  /** Huella del estado visible de la partida: sirve para comprobar que reproducir el diario no se desvía. */
  const fingerprint = (): string => {
    const e = state.expedition;
    const c = state.combat;
    return [state.screen, e?.run.rng.state, c?.rng.state, c?.turn, c?.energy, c?.hand.length, e?.run.gold, e?.deck.length].join('|');
  };

  /** Ejecuta una acción del motor, traduce sus errores a un aviso y calcula los efectos flotantes. */
  function act(fn: (s: CombatState) => void, extra: Partial<GameState> = {}, expectedHits?: (s: CombatState) => Map<string, number>): boolean {
    const s = state.combat;
    if (!s) return false;
    const before = snapshot(s);
    const logBefore = s.relicLog.length;
    const expected = expectedHits?.(s);
    try {
      fn(s);
    } catch (e) {
      fail((e as Error).message);
      return false;
    }
    const fx: FxEvent[] = [];
    for (const u of s.units) {
      const b = before.get(u.id);
      if (!b) continue;
      const push = (kind: FxEvent['kind'], amount: number) => amount > 0 && fx.push({ key: ++fxKey, unitId: u.id, kind, amount });
      push('damage', b.hp - u.hp);
      push('heal', u.hp - b.hp);
      push('block', u.block - b.block);
      push('stress', u.stress - b.stress);
      push('calm', b.stress - u.stress);
      // Golpe anunciado que el bloqueo absorbió (total o parcialmente): se enseña para que el bloqueo no sea invisible.
      const hit = expected?.get(u.id) ?? 0;
      if (hit > 0 && b.hp - u.hp < hit && !u.downed) push('blocked', hit - (b.hp - u.hp));
    }
    const activeRelics = [...new Set(s.relicLog.slice(logBefore).map((l) => l.relic))];
    emit({ hint: null, fx, activeRelics, selectedUid: null, selectedPotion: null, ...extra });
    return true;
  }

  /** Un error de regla se enseña como aviso. Si ocurre al reproducir un guardado, la reproducción se da por fallida. */
  const fail = (message: string) => {
    if (replaying) replayFailed = true;
    emit({ hint: message });
  };

  /** Apunta una acción hecha dentro de un nodo y la guarda junto al punto seguro. */
  function record(a: JournalEntry['a'], ...p: unknown[]): void {
    if (replaying || !save || !checkpoint) return;
    journal.push({ a, p, f: fingerprint() });
    save.save(checkpoint, journal);
  }

  /** Compra o servicio del comerciante: el error de regla se convierte en aviso y el estado se republica. */
  function shopAction(fn: () => void, entry?: [JournalEntry['a'], ...unknown[]]): void {
    if (!state.expedition) return;
    try {
      fn();
      emit({ hint: null });
      if (entry && state.screen === 'shop') record(...entry);
      else if (state.screen === 'map' || state.screen === 'team') persistSafePoint();
    } catch (err) {
      fail((err as Error).message);
    }
  }

  const api = {
    getState: () => state,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },

    // ——— flujo general ———
    /** Nueva expedición en el nivel de Ascensión más alto desbloqueado (o el indicado, recortado a lo desbloqueado). */
    newExpedition(seed = Math.floor(Math.random() * 2 ** 31) || 1, ascension = meta.maxAscension) {
      state = initial(meta, state.saved);
      emit({ screen: 'prep', expedition: createExpedition(seed, Math.max(0, Math.min(ascension, meta.maxAscension)), perksFor(meta)) });
    },
    /** Cambia la Ascensión en la preparación (misma semilla, así que el Presagio no cambia; el mapa sí). Solo niveles desbloqueados. */
    setAscension(level: number) {
      const e = state.expedition;
      if (!e || state.screen !== 'prep' || e.ascension === level || level < 0 || level > meta.maxAscension) return;
      const order = e.run.champions.map((c) => [c.id, c.pos] as const);
      const fresh = createExpedition(e.seed, level, perksFor(meta));
      for (const [id, pos] of order) fresh.run.champions.find((c) => c.id === id)!.pos = pos;
      emit({ expedition: fresh });
    },
    /** Retoma la expedición guardada en el mapa. Un guardado dañado se descarta con un aviso. */
    continueExpedition() {
      if (!save) return;
      const r = save.load();
      if (r.status === 'ok') {
        state = initial(meta, state.saved);
        replaying = true;
        replayFailed = false;
        checkpoint = cloneExpedition(r.expedition); // el punto al que se vuelve si la reproducción falla
        emit({ screen: 'map', expedition: r.expedition }); // (sin guardar: aún falta reproducir)
        for (const { a, p, f } of r.journal) {
          try {
            (api as unknown as Record<string, (...args: unknown[]) => void>)[a](...p);
          } catch {
            replayFailed = true;
          }
          if (f !== undefined && fingerprint() !== f) replayFailed = true; // el estado se desvió del original
          if (replayFailed) break;
        }
        replaying = false;
        if (replayFailed && checkpoint) {
          // Algo no cuadra: se vuelve al mapa tal y como estaba antes de entrar en el nodo.
          state = initial(meta, state.saved, 'No se pudo reanudar lo que estabas haciendo; vuelves al mapa.');
          emit({ screen: 'map', expedition: cloneExpedition(checkpoint) });
        } else if (r.journal.length && checkpoint) {
          journal = r.journal;
          save.save(checkpoint, journal);
          emit({ saved: save.summary() });
        } else emit({ saved: save.summary() });
      } else if (r.status === 'corrupt') {
        emit({ saved: null, notice: `El guardado estaba dañado (${r.reason}) y se ha descartado. Se conserva una copia.` });
      } else emit({ saved: null });
    },
    /** Pantallas del menú (Mejoras, Archivo, Equipo). */
    openMenuScreen(screen: 'upgrades' | 'archive' | 'roster') {
      emit({ screen, hint: null });
    },
    buyPerk(id: PerkId) {
      try {
        engineBuyPerk(meta, id);
        metaStore?.save(meta);
        emit({ hint: null });
      } catch (err) {
        fail((err as Error).message);
      }
    },
    /** Borra el progreso permanente (la pantalla pide confirmación antes). */
    resetProgress() {
      Object.assign(meta, newMeta());
      metaStore?.clear();
      emit({ hint: null });
    },
    dismissNotice() {
      emit({ notice: null });
    },
    reorderTeam(id: ChampionId, to: Pos) {
      if (!state.expedition) return;
      reorder(state.expedition.run, id, to);
      emit();
      if (state.screen === 'map' || state.screen === 'team') persistSafePoint();
    },
    startExpedition() {
      if (state.expedition) emit({ screen: 'map', hint: null });
    },
    toMenu() {
      state = initial(meta, save?.inspect().summary ?? null);
      emit();
    },
    retreat() {
      const e = state.expedition;
      if (!e || e.status !== 'active') return;
      engineRetreat(e);
      emit({ screen: 'result', combat: null, hint: null });
    },

    // ——— mapa ———
    chooseNode(id: string) {
      const e = state.expedition;
      if (!e) return;
      let node;
      try {
        const before = cloneExpedition(e); // punto seguro: el estado justo antes de pisar el nodo
        node = enterNode(e, id);
        checkpoint = before;
        journal = [];
      } catch {
        return fail('Ese nodo no es accesible');
      }
      try {
        const kind = encounterKind(node.type);
        if (node.type === 'shop') {
          openShop(e);
          emit({ screen: 'shop', hint: null });
        } else if (node.type === 'event' || node.type === 'shrine') emit({ screen: 'event', event: pickEvent(e, node.type), eventOutcome: null, hint: null });
        else if (node.type === 'chest') {
          openChest(e);
          emit({ screen: 'chest', hint: null });
        } else if (kind) {
          const combat = combatFromExpedition(e, kind);
          const activeRelics = [...new Set(combat.relicLog.map((l) => l.relic))]; // las del primer turno pulsan al empezar
          emit({ screen: 'battle', combat, combatKind: kind, hint: null, fx: [], activeRelics, selectedUid: null, selectedPotion: null });
        } else emit({ screen: 'rest', hint: null });
        record('chooseNode', id);
      } catch (err) {
        fail((err as Error).message); // el nodo ya se ha pisado: se enseña el error real, no uno engañoso
      }
    },

    // ——— combate ———
    /** Muestra un aviso (p. ej. el motivo por el que una carta no se puede jugar). */
    notify(message: string | null) {
      emit({ hint: message });
    },
    selectCard(uid: string | null) {
      emit({ selectedUid: uid === state.selectedUid ? null : uid, selectedPotion: null, hint: null });
    },
    selectPotion(slot: number | null) {
      emit({ selectedPotion: slot === state.selectedPotion ? null : slot, selectedUid: null, hint: null });
    },
    playCard(uid: string, targetId?: string | null) {
      const target = targetId ?? undefined; // un diario guardado trae `null` donde no había objetivo
      if (act((s) => enginePlayCard(s, uid, target))) record('playCard', uid, target);
    },
    /** Clic en una unidad: juega la carta seleccionada o usa la poción seleccionada sobre ella. */
    clickUnit(unitId: string) {
      const s = state.combat;
      if (!s) return;
      if (state.selectedUid) api.playCard(state.selectedUid, unitId);
      else if (state.selectedPotion !== null) api.usePotion(state.selectedPotion, unitId);
    },
    /** Juega la carta seleccionada si no necesita objetivo (propia, de área, o con objetivo forzado por el Presagio). */
    playSelected() {
      const s = state.combat;
      if (!s || !state.selectedUid) return;
      const inst = s.hand.find((c) => c.uid === state.selectedUid);
      if (!inst) return;
      const card = cardOf(s, inst);
      const forced = forcedTarget(s, card);
      if ((card.target === 'enemy' || card.target === 'ally') && !forced) return fail('Elige un objetivo');
      api.playCard(inst.uid, forced?.id);
    },
    swap(a: Pos, b: Pos) {
      if (act((s) => swapAllies(s, a, b))) record('swap', a, b);
    },
    usePotion(slot: number, targetId?: string | null) {
      const target = targetId ?? undefined;
      if (act((s) => engineUsePotion(s, slot, target))) record('usePotion', slot, target);
    },
    /** Fuera de combate: bebe la poción seleccionada (solo curativas) sobre un campeón. */
    drinkPotion(championId: ChampionId) {
      const e = state.expedition;
      if (!e || state.selectedPotion === null) return;
      const champ = e.run.champions.find((c) => c.id === championId);
      if (!champ) return;
      try {
        usePotionOnMap(e.run.belt, state.selectedPotion, champ);
        emit({ selectedPotion: null, hint: null });
        persistSafePoint();
      } catch (err) {
        fail((err as Error).message);
      }
    },
    endTurn() {
      const ok = act(
        (s) => endTeamTurn(s),
        {},
        (s) => {
          const hits = new Map<string, number>();
          for (const e of s.units) if (e.side === 'enemy' && !e.downed && !e.statuses.stun)
            for (const v of intentView(s, e)) if (v.intent.kind === 'attack' && v.target) hits.set(v.target.id, (hits.get(v.target.id) ?? 0) + v.value);
          return hits;
        },
      );
      if (ok) record('endTurn');
    },

    // ——— botín ———
    concludeCombat() {
      const e = state.expedition;
      const s = state.combat;
      // Idempotente: un segundo clic (o un Enter repetido) no vuelve a cerrar el combate ni a repartir el botín.
      if (!e || !s || !state.combatKind || state.screen !== 'battle' || s.outcome === 'ongoing') return;
      const rewards = finishCombat(e, s, state.combatKind);
      if (!rewards) return emit({ screen: 'result', combat: null, hint: null });
      claimRewards(e, rewards);
      emit({ screen: 'reward', combat: null, rewards, cardClaimed: false, potionClaimed: false, gearClaimed: false, hint: null, fx: [] });
      record('concludeCombat');
    },
    claimCard(defId: string | null) {
      const e = state.expedition;
      if (!e || !state.rewards) return;
      if (state.cardClaimed) return fail('Ya elegiste una carta');
      if (defId !== null && !state.rewards.cards.includes(defId)) return fail('Esa carta no está en el botín');
      try {
        engineClaimCard(e, defId);
        emit({ cardClaimed: true, hint: null });
        record('claimCard', defId);
      } catch (err) {
        fail((err as Error).message);
      }
    },
    /** Elige un objeto del botín (`null` = omitir). Con `equipOn`, lo equipa enseguida en ese campeón. */
    claimGear(gearId: string | null, equipOn?: ChampionId | null) {
      const e = state.expedition;
      if (!e || !state.rewards?.gear) return;
      if (state.gearClaimed) return fail('Ya elegiste un objeto');
      if (gearId !== null && !state.rewards.gear.includes(gearId)) return fail('Ese objeto no está en el botín');
      try {
        engineClaimGear(e, gearId, equipOn ?? undefined); // atómico: si no se puede equipar, no se recoge
        emit({ gearClaimed: true, hint: null });
        record('claimGear', gearId, equipOn);
      } catch (err) {
        fail((err as Error).message);
      }
    },
    claimPotion(slotArg?: number | 'new' | null) {
      const slot = slotArg ?? undefined;
      const e = state.expedition;
      const potion = state.rewards?.potion;
      if (!e || !potion || state.potionClaimed) return;
      try {
        const r = engineClaimPotion(e, potion, slot);
        if (r === 'full') return fail('Cinturón lleno: elige qué poción sustituir');
        emit({ potionClaimed: true, hint: null });
        record('claimPotion', slot);
      } catch (err) {
        fail((err as Error).message);
      }
    },
    finishRewards() {
      const e = state.expedition;
      if (!e) return;
      emit({ screen: e.status === 'victory' ? 'result' : 'map', rewards: null, combat: null, combatKind: null, hint: null });
    },

    // ——— equipo (fuera de combate) ———
    openTeam() {
      if (state.expedition) emit({ screen: 'team', hint: null });
    },
    closeTeam() {
      emit({ screen: 'map', hint: null });
    },
    equipGear(championId: ChampionId, gearId: string, slot?: number) {
      shopAction(() => engineEquip(state.expedition!, championId, gearId, slot));
    },
    unequipGear(championId: ChampionId, slot: number) {
      shopAction(() => engineUnequip(state.expedition!, championId, slot));
    },

    // ——— descanso ———
    restAction(action: RestAction, deckIndexArg?: number | null) {
      const e = state.expedition;
      if (!e) return;
      const deckIndex = deckIndexArg ?? undefined;
      try {
        engineRest(e, action, deckIndex);
        emit({ hint: null });
        record('restAction', action, deckIndex);
      } catch (err) {
        fail((err as Error).message);
      }
    },
    leaveRest() {
      emit({ screen: 'map', hint: null });
    },

    // ——— comerciante ———
    buyCard(index: number) {
      shopAction(() => engineBuyCard(state.expedition!, index), ['buyCard', index]);
    },
    buyPotion(index: number, slotArg?: number | null) {
      const slot = slotArg ?? undefined;
      shopAction(() => engineBuyPotion(state.expedition!, index, slot), ['buyPotion', index, slot]);
    },
    buyRelic(index: number) {
      shopAction(() => engineBuyRelic(state.expedition!, index), ['buyRelic', index]);
    },
    removeCard(deckIndex: number) {
      shopAction(() => engineRemoveCard(state.expedition!, deckIndex), ['removeCard', deckIndex]);
    },
    leaveShop() {
      if (state.expedition) state.expedition.shop = null;
      emit({ screen: 'map', hint: null });
    },

    // ——— tesoro ———
    takeChestOffer(index: number) {
      const e = state.expedition;
      if (!e) return;
      try {
        engineTakeChestOffer(e, index);
        emit({ hint: null });
        record('takeChestOffer', index);
      } catch (err) {
        fail((err as Error).message);
      }
    },
    leaveChest() {
      if (state.expedition) state.expedition.chest = null;
      emit({ screen: 'map', hint: null });
    },

    // ——— eventos ———
    chooseEventOption(index: number) {
      const e = state.expedition;
      const ev = state.event;
      if (!e || !ev || state.eventOutcome) return;
      try {
        emit({ eventOutcome: resolveChoice(e, ev, index), hint: null });
        record('chooseEventOption', index);
      } catch (err) {
        fail((err as Error).message);
      }
    },
    eventBlocked(index: number): string | null {
      const e = state.expedition;
      const c = state.event?.choices[index];
      return e && c ? choiceBlocked(e, c) : null;
    },
    leaveEvent() {
      emit({ screen: 'map', event: null, eventOutcome: null, hint: null });
    },
  };
  return api;
}

export type GameStore = ReturnType<typeof createGameStore>;

const storage = browserStorage();
export const game = createGameStore({ save: createSaveManager(storage), meta: createMetaManager(storage) });

export function useGame(store: GameStore = game): GameState {
  return useSyncExternalStore(store.subscribe, store.getState);
}
