import { useSyncExternalStore } from 'react';
import type { EncounterKind } from '../data/enemies';
import { cardOf, forcedTarget, playCard as enginePlayCard } from '../engine/cards';
import { endTeamTurn } from '../engine/combat';
import {
  claimCard as engineClaimCard, claimPotion as engineClaimPotion, claimRewards, combatFromExpedition, createExpedition, encounterKind,
  enterNode, finishCombat, rest as engineRest, retreat as engineRetreat, type Expedition, type ExpeditionRewards, type RestAction,
} from '../engine/expedition';
import { swapAllies } from '../engine/formation';
import { usePotion as engineUsePotion, usePotionOnMap } from '../engine/potions';
import { reorder } from '../engine/run';
import type { ChampionId, CombatState, Pos } from '../engine/types';

export type Screen = 'menu' | 'prep' | 'map' | 'battle' | 'reward' | 'rest' | 'result';

/** Número flotante sobre una unidad tras una acción (daño, curación, bloqueo o estrés). */
export interface FxEvent {
  key: number;
  unitId: string;
  kind: 'damage' | 'heal' | 'block' | 'stress' | 'calm';
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
  /** uid de la carta seleccionada en la mano. */
  selectedUid: string | null;
  /** Hueco del cinturón seleccionado para usar. */
  selectedPotion: number | null;
  /** Último aviso (motivo de una jugada ilegal, error de regla…). */
  hint: string | null;
  fx: FxEvent[];
  /** Solo para que React detecte cambios aunque el motor mute en sitio. */
  version: number;
}

type Snap = Map<string, { hp: number; block: number; stress: number }>;
const snapshot = (s: CombatState): Snap => new Map(s.units.map((u) => [u.id, { hp: u.hp, block: u.block, stress: u.stress }]));

const initial = (): GameState => ({
  screen: 'menu', expedition: null, combat: null, combatKind: null, rewards: null, cardClaimed: false, potionClaimed: false,
  selectedUid: null, selectedPotion: null, hint: null, fx: [], version: 0,
});

export function createGameStore() {
  let state = initial();
  let fxKey = 0;
  const listeners = new Set<() => void>();

  const emit = (patch: Partial<GameState> = {}) => {
    state = { ...state, ...patch, version: state.version + 1 };
    listeners.forEach((l) => l());
  };

  /** Ejecuta una acción del motor, traduce sus errores a un aviso y calcula los efectos flotantes. */
  function act(fn: (s: CombatState) => void, extra: Partial<GameState> = {}): boolean {
    const s = state.combat;
    if (!s) return false;
    const before = snapshot(s);
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
    }
    emit({ hint: null, fx, selectedUid: null, selectedPotion: null, ...extra });
    return true;
  }

  const fail = (message: string) => emit({ hint: message });

  const api = {
    getState: () => state,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },

    // ——— flujo general ———
    newExpedition(seed = Math.floor(Math.random() * 2 ** 31) || 1) {
      state = initial();
      emit({ screen: 'prep', expedition: createExpedition(seed) });
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
      state = initial();
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
      act((s) => endTeamTurn(s));
    },

    // ——— botín ———
    concludeCombat() {
      const e = state.expedition;
      const s = state.combat;
      if (!e || !s || !state.combatKind) return;
      const rewards = finishCombat(e, s, state.combatKind);
      if (!rewards) return emit({ screen: 'result', hint: null });
      claimRewards(e, rewards);
      emit({ screen: 'reward', rewards, cardClaimed: false, potionClaimed: false, hint: null, fx: [] });
    },
    claimCard(defId: string | null) {
      const e = state.expedition;
      if (!e || !state.rewards) return;
      if (state.cardClaimed) return fail('Ya elegiste una carta');
      if (defId !== null && !state.rewards.cards.includes(defId)) return fail('Esa carta no está en el botín');
      engineClaimCard(e, defId);
      emit({ cardClaimed: true, hint: null });
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
  };
  return api;
}

export type GameStore = ReturnType<typeof createGameStore>;

export const game = createGameStore();

export function useGame(store: GameStore = game): GameState {
  return useSyncExternalStore(store.subscribe, store.getState);
}
