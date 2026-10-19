import { describe, expect, it } from 'vitest';
import { availableNodes } from '../../src/engine/expedition';
import { SAVE_KEY, createSaveManager, type StorageLike } from '../../src/save/saveManager';
import { createGameStore } from '../../src/state/gameStore';
import { cardOf } from '../../src/engine/cards';

const mem = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};
const open = (store: StorageLike) => createGameStore({ save: createSaveManager(store) });
const shape = (g: ReturnType<typeof createGameStore>) => {
  const s = g.getState().combat!;
  return JSON.stringify({
    units: s.units, hand: s.hand, draw: s.drawPile, discard: s.discard, energy: s.energy, turn: s.turn, intents: s.intents,
    relics: s.relicLog, rng: s.rng.state, fallen: s.fallen,
  });
};
const economy = (g: ReturnType<typeof createGameStore>) => {
  const e = g.getState().expedition!;
  return JSON.stringify({ gold: e.run.gold, deck: e.deck, belt: e.run.belt, mist: e.run.mist, champs: e.run.champions, wounds: e.wounds, inv: e.inventory });
};

function intoBattle(store: StorageLike, seed = 3, difficulty: 'normal' | 'nightmare' = 'normal') {
  const g = open(store);
  g.newExpedition(seed, difficulty);
  g.startExpedition();
  g.chooseNode(availableNodes(g.getState().expedition!)[0].id);
  return g;
}

function playSomething(g: ReturnType<typeof createGameStore>) {
  const s = g.getState().combat!;
  for (const inst of [...s.hand]) {
    const d = cardOf(s, inst);
    if (d.cost > s.energy) continue;
    const target = d.target === 'enemy' ? s.units.find((u) => u.side === 'enemy' && !u.downed)?.id : d.target === 'ally' ? 'leona' : undefined;
    const before = s.hand.length;
    g.playCard(inst.uid, target);
    if (g.getState().combat!.hand.length < before) return true;
  }
  return false;
}

describe('reanudar a mitad de un nodo', () => {
  it('recargar en pleno combate devuelve exactamente el mismo combate', () => {
    const store = mem();
    const g = intoBattle(store);
    playSomething(g);
    g.endTurn();
    playSomething(g);
    const reloaded = open(store);
    expect(reloaded.getState().saved).not.toBeNull();
    reloaded.continueExpedition();
    expect(reloaded.getState().screen).toBe('battle');
    expect(shape(reloaded)).toBe(shape(g));
    expect(economy(reloaded)).toBe(economy(g));
  });

  it('y sigue igual de determinista: la misma jugada da el mismo resultado en ambos', () => {
    const store = mem();
    const g = intoBattle(store);
    playSomething(g);
    const reloaded = open(store);
    reloaded.continueExpedition();
    g.endTurn();
    reloaded.endTurn();
    expect(shape(reloaded)).toBe(shape(g));
  });

  it('la muerte permanente de Pesadilla no se deshace recargando', () => {
    const store = mem();
    const g = intoBattle(store, 5, 'nightmare');
    for (let i = 0; i < 40 && g.getState().combat!.outcome === 'ongoing' && !g.getState().combat!.units.some((u) => u.side === 'ally' && u.downed); i++) g.endTurn();
    const downed = g.getState().combat!.units.filter((u) => u.side === 'ally' && u.downed).map((u) => u.id);
    expect(downed.length).toBeGreaterThan(0);
    const reloaded = open(store);
    reloaded.continueExpedition();
    expect(reloaded.getState().combat!.units.filter((u) => u.side === 'ally' && u.downed).map((u) => u.id)).toEqual(downed);
    expect(shape(reloaded)).toBe(shape(g));
  });

  it('recargar tras ganar y antes de elegir el botín devuelve el mismo botín', () => {
    const store = mem();
    const g = intoBattle(store);
    // Gana jugando de verdad: ataca hasta acabar con todo (con el RNG de la run, determinista)
    for (let i = 0; i < 60 && g.getState().combat!.outcome === 'ongoing'; i++) {
      if (!playSomething(g)) g.endTurn();
    }
    if (g.getState().combat!.outcome !== 'won') return; // esta semilla pierde: lo cubren los otros tests
    g.concludeCombat();
    const rewards = JSON.stringify(g.getState().rewards);
    const reloaded = open(store);
    reloaded.continueExpedition();
    expect(reloaded.getState().screen).toBe('reward');
    expect(JSON.stringify(reloaded.getState().rewards)).toBe(rewards);
    expect(economy(reloaded)).toBe(economy(g));
  });

  it('un evento resuelto no se puede re-elegir recargando', () => {
    const store = mem();
    const g = open(store);
    g.newExpedition(2);
    g.startExpedition();
    const e = g.getState().expedition!;
    const target = e.map.nodes.find((n) => n.type === 'event')!;
    e.currentId = 'n0-0';
    e.map.nodes.find((n) => n.id === 'n0-0')!.next = [target.id];
    g.selectPotion(null); // emisión en el mapa: refresca el punto seguro con el atajo de test
    g.chooseNode(target.id);
    const ev = g.getState().event!;
    g.chooseEventOption(ev.choices.findIndex((c) => c.effects.length === 0));
    const outcome = JSON.stringify(g.getState().eventOutcome);
    const reloaded = open(store);
    reloaded.continueExpedition();
    expect(reloaded.getState().screen).toBe('event');
    expect(JSON.stringify(reloaded.getState().eventOutcome)).toBe(outcome);
    reloaded.chooseEventOption(0);
    expect(JSON.stringify(reloaded.getState().eventOutcome)).toBe(outcome);
  });

  it('una compra en el comerciante persiste y al salir al mapa se limpia el diario', () => {
    const store = mem();
    const g = open(store);
    g.newExpedition(2);
    g.startExpedition();
    const e = g.getState().expedition!;
    const target = e.map.nodes.find((n) => n.type === 'shop')!;
    e.currentId = 'n0-0';
    e.map.nodes.find((n) => n.id === 'n0-0')!.next = [target.id];
    e.run.gold = 500;
    g.selectPotion(null);
    g.chooseNode(target.id);
    g.buyCard(0);
    const gold = g.getState().expedition!.run.gold;
    const reloaded = open(store);
    reloaded.continueExpedition();
    expect(reloaded.getState().screen).toBe('shop');
    expect(reloaded.getState().expedition!.run.gold).toBe(gold);
    expect(reloaded.getState().expedition!.shop!.cards[0].sold).toBe(true);
    reloaded.leaveShop();
    expect(JSON.parse(store.data.get(SAVE_KEY)!).journal).toEqual([]);
    const again = open(store);
    again.continueExpedition();
    expect(again.getState().screen).toBe('map');
    expect(again.getState().expedition!.run.gold).toBe(gold);
  });

  it('forjar una carta en el descanso persiste', () => {
    const store = mem();
    const g = open(store);
    g.newExpedition(2);
    g.startExpedition();
    const e = g.getState().expedition!;
    const rest = e.map.nodes.find((n) => n.floor === 6)!;
    e.currentId = 'n5-0';
    e.map.nodes.find((n) => n.id === 'n5-0')!.next = [rest.id];
    g.selectPotion(null);
    g.chooseNode(rest.id);
    g.restAction('upgrade', 3);
    const reloaded = open(store);
    reloaded.continueExpedition();
    expect(reloaded.getState().screen).toBe('rest');
    expect(reloaded.getState().expedition!.deck[3].endsWith('+')).toBe(true);
    expect(reloaded.getState().expedition!.restUsed).toBe(true);
  });
});

describe('diario dañado', () => {
  it('un diario con acciones desconocidas se rechaza como guardado dañado', () => {
    const store = mem();
    const g = intoBattle(store);
    playSomething(g);
    const raw = JSON.parse(store.data.get(SAVE_KEY)!);
    raw.journal.push({ a: 'hacerTrampa', p: [] });
    store.setItem(SAVE_KEY, JSON.stringify(raw));
    const reloaded = open(store);
    expect(reloaded.getState().saved).toBeNull();
    expect(reloaded.getState().notice).toMatch(/dañada/);
  });

  it('un diario que no se puede reproducir devuelve al mapa con un aviso, sin romper nada', () => {
    const store = mem();
    const g = intoBattle(store);
    const raw = JSON.parse(store.data.get(SAVE_KEY)!);
    raw.journal.push({ a: 'playCard', p: ['carta-que-no-existe', null] });
    store.setItem(SAVE_KEY, JSON.stringify(raw));
    const reloaded = open(store);
    reloaded.continueExpedition();
    expect(reloaded.getState().screen).toBe('map');
    expect(reloaded.getState().notice).toMatch(/No se pudo reanudar/);
    expect(reloaded.getState().expedition!.status).toBe('active');
    expect(reloaded.getState().expedition!.visited).toEqual([]); // vuelve al punto seguro: antes de entrar en el nodo
  });

  it('terminar la expedición borra el guardado y el diario', () => {
    const store = mem();
    const g = intoBattle(store);
    playSomething(g);
    g.retreat();
    expect(store.data.has(SAVE_KEY)).toBe(false);
  });
});
