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
import type { GearSlot } from '../data/gear';
import { choiceBlocked, pickEvent, resolveChoice, type EventOutcome } from '../engine/events';
import { swapAllies } from '../engine/formation';
import { usePotion as engineUsePotion, usePotionOnMap } from '../engine/potions';
import { reorder } from '../engine/run';
import { buyCard as engineBuyCard, buyGear as engineBuyGear, buyPotion as engineBuyPotion, openShop, removeCard as engineRemoveCard, treatWoundAtShop } from '../engine/shop';
import type { ChampionId, CombatState, Pos } from '../engine/types';
import { browserStorage, createSaveManager, type SaveManager, type SaveSummary } from '../save/saveManager';
import { intentView } from './selectors';

export type Screen = 'menu' | 'prep' | 'map' | 'battle' | 'reward' | 'rest' | 'shop' | 'event' | 'team' | 'result';

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
  /** Solo para que React detecte cambios aunque el motor mute en sitio. */
  version: number;
}

type Snap = Map<string, { hp: number; block: number; stress: number }>;
const snapshot = (s: CombatState): Snap => new Map(s.units.map((u) => [u.id, { hp: u.hp, block: u.block, stress: u.stress }]));

const initial = (saved: SaveSummary | null = null, notice: string | null = null): GameState => ({
  screen: 'menu', expedition: null, combat: null, combatKind: null, rewards: null, cardClaimed: false, potionClaimed: false, gearClaimed: false,
  saved, notice, event: null, eventOutcome: null, selectedUid: null, selectedPotion: null, hint: null, fx: [], activeRelics: [], version: 0,
});

export function createGameStore(opts: { save?: SaveManager } = {}) {
  const save = opts.save;
  let state = initial(save?.summary() ?? null);
  let fxKey = 0;
  const listeners = new Set<() => void>();

  const emit = (patch: Partial<GameState> = {}) => {
    state = { ...state, ...patch, version: state.version + 1 };
    // Autoguardado en los puntos seguros: al volver al mapa. Al terminar la expedición se borra.
    if (save && state.expedition) {
      if (state.screen === 'map' && state.expedition.status === 'active') {
        save.save(state.expedition);
        state = { ...state, saved: save.summary() };
      } else if (state.screen === 'result') {
        save.clear();
        state = { ...state, saved: null };
      }
    }
    listeners.forEach((l) => l());
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
      emit({ hint: (e as Error).message });
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

  const fail = (message: string) => emit({ hint: message });

  /** Compra o servicio del comerciante: el error de regla se convierte en aviso y el estado se republica. */
  function shopAction(fn: () => void): void {
    if (!state.expedition) return;
    try {
      fn();
      emit({ hint: null });
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
    newExpedition(seed = Math.floor(Math.random() * 2 ** 31) || 1) {
      state = initial(state.saved);
      emit({ screen: 'prep', expedition: createExpedition(seed) });
    },
    /** Retoma la expedición guardada en el mapa. Un guardado dañado se descarta con un aviso. */
    continueExpedition() {
      if (!save) return;
      const r = save.load();
      if (r.status === 'ok') {
        state = initial(state.saved);
        emit({ screen: 'map', expedition: r.expedition });
      } else if (r.status === 'corrupt') {
        emit({ saved: null, notice: `El guardado estaba dañado (${r.reason}) y se ha descartado. Se conserva una copia.` });
      } else emit({ saved: null });
    },
    dismissNotice() {
      emit({ notice: null });
    },
    reorderTeam(id: ChampionId, to: Pos) {
      if (!state.expedition) return;
      reorder(state.expedition.run, id, to);
      emit();
    },
    startExpedition() {
      if (state.expedition) emit({ screen: 'map', hint: null });
    },
    toMenu() {
      state = initial(save?.summary() ?? null);
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
      try {
        const node = enterNode(e, id);
        const kind = encounterKind(node.type);
        if (node.type === 'shop') {
          openShop(e);
          return emit({ screen: 'shop', hint: null });
        }
        if (node.type === 'event') return emit({ screen: 'event', event: pickEvent(e), eventOutcome: null, hint: null });
        if (kind) emit({ screen: 'battle', combat: combatFromExpedition(e, kind), combatKind: kind, hint: null, fx: [], selectedUid: null, selectedPotion: null });
        else emit({ screen: 'rest', hint: null });
      } catch {
        fail('Ese nodo no es accesible');
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
    playCard(uid: string, targetId?: string) {
      act((s) => enginePlayCard(s, uid, targetId));
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
      act((s) => swapAllies(s, a, b));
    },
    usePotion(slot: number, targetId?: string) {
      act((s) => engineUsePotion(s, slot, targetId));
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
      } catch (err) {
        fail((err as Error).message);
      }
    },
    endTurn() {
      act(
        (s) => endTeamTurn(s),
        {},
        (s) => {
          const hits = new Map<string, number>();
          for (const e of s.units) if (e.side === 'enemy' && !e.downed && !e.statuses.stun)
            for (const v of intentView(s, e)) if (v.intent.kind === 'attack' && v.target) hits.set(v.target.id, (hits.get(v.target.id) ?? 0) + v.value);
          return hits;
        },
      );
    },

    // ——— botín ———
    concludeCombat() {
      const e = state.expedition;
      const s = state.combat;
      if (!e || !s || !state.combatKind) return;
      const rewards = finishCombat(e, s, state.combatKind);
      if (!rewards) return emit({ screen: 'result', hint: null });
      claimRewards(e, rewards);
      emit({ screen: 'reward', rewards, cardClaimed: false, potionClaimed: false, gearClaimed: false, hint: null, fx: [] });
    },
    claimCard(defId: string | null) {
      const e = state.expedition;
      if (!e || !state.rewards) return;
      if (state.cardClaimed) return fail('Ya elegiste una carta');
      if (defId !== null && !state.rewards.cards.includes(defId)) return fail('Esa carta no está en el botín');
      engineClaimCard(e, defId);
      emit({ cardClaimed: true, hint: null });
    },
    /** Elige un objeto del botín (`null` = omitir). Con `equipOn`, lo equipa enseguida en ese campeón. */
    claimGear(gearId: string | null, equipOn?: ChampionId) {
      const e = state.expedition;
      if (!e || !state.rewards?.gear) return;
      if (state.gearClaimed) return fail('Ya elegiste un objeto');
      if (gearId !== null && !state.rewards.gear.includes(gearId)) return fail('Ese objeto no está en el botín');
      try {
        engineClaimGear(e, gearId);
        if (gearId !== null && equipOn) engineEquip(e, equipOn, gearId);
        emit({ gearClaimed: true, hint: null });
      } catch (err) {
        fail((err as Error).message);
      }
    },
    claimPotion(slot?: number | 'new') {
      const e = state.expedition;
      const potion = state.rewards?.potion;
      if (!e || !potion || state.potionClaimed) return;
      const r = engineClaimPotion(e, potion, slot);
      if (r === 'full') return fail('Cinturón lleno: elige qué poción sustituir');
      emit({ potionClaimed: true, hint: null });
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
    equipGear(championId: ChampionId, gearId: string) {
      shopAction(() => engineEquip(state.expedition!, championId, gearId));
    },
    unequipGear(championId: ChampionId, slot: GearSlot) {
      shopAction(() => engineUnequip(state.expedition!, championId, slot));
    },

    // ——— descanso ———
    restAction(action: RestAction) {
      const e = state.expedition;
      if (!e) return;
      try {
        engineRest(e, action);
        emit({ hint: null });
      } catch (err) {
        fail((err as Error).message);
      }
    },
    leaveRest() {
      emit({ screen: 'map', hint: null });
    },

    // ——— comerciante ———
    buyCard(index: number) {
      shopAction(() => engineBuyCard(state.expedition!, index));
    },
    buyPotion(index: number, slot?: number) {
      shopAction(() => engineBuyPotion(state.expedition!, index, slot));
    },
    buyGear(index: number) {
      shopAction(() => engineBuyGear(state.expedition!, index));
    },
    treatWound() {
      shopAction(() => treatWoundAtShop(state.expedition!));
    },
    removeCard(deckIndex: number) {
      shopAction(() => engineRemoveCard(state.expedition!, deckIndex));
    },
    leaveShop() {
      if (state.expedition) state.expedition.shop = null;
      emit({ screen: 'map', hint: null });
    },

    // ——— eventos ———
    chooseEventOption(index: number) {
      const e = state.expedition;
      const ev = state.event;
      if (!e || !ev || state.eventOutcome) return;
      try {
        emit({ eventOutcome: resolveChoice(e, ev, index), hint: null });
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

export const game = createGameStore({ save: createSaveManager(browserStorage()) });

export function useGame(store: GameStore = game): GameState {
  return useSyncExternalStore(store.subscribe, store.getState);
}
