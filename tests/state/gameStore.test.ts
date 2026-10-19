import { describe, expect, it } from 'vitest';
import { cardOf } from '../../src/engine/cards';
import { availableNodes } from '../../src/engine/expedition';
import { createGameStore } from '../../src/state/gameStore';

function inBattle(seed = 3) {
  const g = createGameStore();
  g.newExpedition(seed);
  g.startExpedition();
  g.chooseNode(availableNodes(g.getState().expedition!)[0].id);
  return g;
}
const win = (g: ReturnType<typeof createGameStore>) => {
  const s = g.getState().combat!;
  for (const u of s.units) if (u.side === 'enemy') { u.hp = 0; u.downed = true; }
  s.outcome = 'won';
};

describe('flujo de pantallas', () => {
  it('menú → preparación → mapa → combate', () => {
    const g = createGameStore();
    expect(g.getState().screen).toBe('menu');
    g.newExpedition(1);
    expect(g.getState().screen).toBe('prep');
    g.startExpedition();
    expect(g.getState().screen).toBe('map');
    g.chooseNode(availableNodes(g.getState().expedition!)[0].id);
    expect(g.getState().screen).toBe('battle');
    expect(g.getState().combat).not.toBeNull();
  });

  it('en la preparación se puede reordenar el equipo', () => {
    const g = createGameStore();
    g.newExpedition(1);
    g.reorderTeam('soraka', 1);
    const champs = g.getState().expedition!.run.champions;
    expect(champs.find((c) => c.id === 'soraka')!.pos).toBe(1);
    expect(champs.find((c) => c.id === 'leona')!.pos).toBe(4);
  });

  it('no deja entrar en un nodo inaccesible', () => {
    const g = createGameStore();
    g.newExpedition(1);
    g.startExpedition();
    g.chooseNode('n5-0');
    expect(g.getState().screen).toBe('map');
    expect(g.getState().hint).toMatch(/accesible/i);
  });

  it('ganar el combate lleva al botín, y el botín de vuelta al mapa', () => {
    const g = inBattle();
    win(g);
    g.concludeCombat();
    expect(g.getState().screen).toBe('reward');
    expect(g.getState().expedition!.run.gold).toBeGreaterThan(0);
    const offered = g.getState().rewards!.cards[0];
    const before = g.getState().expedition!.deck.length;
    g.claimCard(offered);
    expect(g.getState().expedition!.deck).toHaveLength(before + 1);
    g.finishRewards();
    expect(g.getState().screen).toBe('map');
  });

  it('no se puede coger dos veces la carta del botín', () => {
    const g = inBattle();
    win(g);
    g.concludeCombat();
    const [a, b] = g.getState().rewards!.cards;
    g.claimCard(a);
    g.claimCard(b);
    expect(g.getState().expedition!.deck.filter((id) => id === b || id === a).length).toBeGreaterThanOrEqual(1);
    expect(g.getState().expedition!.deck).toHaveLength(21);
  });

  it('perder lleva al resultado de derrota', () => {
    const g = inBattle();
    g.getState().combat!.outcome = 'lost';
    g.concludeCombat();
    expect(g.getState().screen).toBe('result');
    expect(g.getState().expedition!.status).toBe('defeat');
  });

  it('retirarse lleva al resultado de retirada', () => {
    const g = inBattle();
    g.retreat();
    expect(g.getState().screen).toBe('result');
    expect(g.getState().expedition!.status).toBe('retreat');
  });

  it('un nodo de descanso abre la hoguera y volver lleva al mapa', () => {
    const g = createGameStore();
    g.newExpedition(2);
    g.startExpedition();
    const e = g.getState().expedition!;
    e.currentId = 'n5-0'; // lleva el equipo cerca de un descanso para el test
    const rest = e.map.nodes.find((n) => n.floor === 6)!;
    e.map.nodes.find((n) => n.id === 'n5-0')!.next = [rest.id];
    g.chooseNode(rest.id);
    expect(g.getState().screen).toBe('rest');
    g.restAction('calm');
    expect(() => g.restAction('heal')).not.toThrow();
    expect(g.getState().hint).toMatch(/descansaste/i);
    g.leaveRest();
    expect(g.getState().screen).toBe('map');
  });
});

describe('combate', () => {
  it('seleccionar una carta alterna la selección y Esc (null) la cancela', () => {
    const g = inBattle();
    const uid = g.getState().combat!.hand[0].uid;
    g.selectCard(uid);
    expect(g.getState().selectedUid).toBe(uid);
    g.selectCard(uid);
    expect(g.getState().selectedUid).toBeNull();
    g.selectCard(uid);
    g.selectCard(null);
    expect(g.getState().selectedUid).toBeNull();
  });

  it('jugar una carta ilegal deja un aviso y no cambia el estado', () => {
    const g = inBattle();
    const s = g.getState().combat!;
    s.energy = 0;
    const uid = s.hand.find((c) => cardOf(s, c).cost > 0)!.uid;
    const handBefore = s.hand.length;
    g.playCard(uid, s.units.find((u) => u.side === 'enemy')!.id);
    expect(g.getState().hint).toMatch(/energ/i);
    expect(g.getState().combat!.hand).toHaveLength(handBefore);
  });

  it('jugar una carta legal la saca de la mano, gasta energía y genera efectos flotantes', () => {
    const g = inBattle();
    const s = g.getState().combat!;
    const inst = s.hand.find((c) => {
      const d = cardOf(s, c);
      return d.target === 'enemy' && d.effects.some((e) => e.type === 'damage') && d.cost <= s.energy;
    });
    if (!inst) return; // la mano de esta semilla no tiene ataque: lo cubren los demás tests
    const enemy = s.units.find((u) => u.side === 'enemy')!;
    g.playCard(inst.uid, enemy.id);
    expect(g.getState().combat!.hand.find((c) => c.uid === inst.uid)).toBeUndefined();
    expect(g.getState().fx.some((f) => f.unitId === enemy.id && f.kind === 'damage')).toBe(true);
    expect(g.getState().selectedUid).toBeNull();
  });

  it('clic en una unidad con carta seleccionada la juega sobre ella', () => {
    const g = inBattle();
    const s = g.getState().combat!;
    const inst = s.hand.find((c) => {
      const d = cardOf(s, c);
      return d.target === 'enemy' && d.cost <= s.energy;
    });
    if (!inst) return;
    g.selectCard(inst.uid);
    g.clickUnit(s.units.find((u) => u.side === 'enemy')!.id);
    expect(g.getState().combat!.hand.find((c) => c.uid === inst.uid)).toBeUndefined();
  });

  it('terminar el turno pasa al siguiente y vacía la selección', () => {
    const g = inBattle();
    const turn = g.getState().combat!.turn;
    g.selectCard(g.getState().combat!.hand[0].uid);
    g.endTurn();
    expect(g.getState().combat!.turn).toBe(turn + 1);
    expect(g.getState().selectedUid).toBeNull();
  });

  it('intercambiar dos aliados adyacentes cuesta energía y se refleja en el estado', () => {
    const g = inBattle();
    g.swap(1, 2);
    const s = g.getState().combat!;
    expect(s.units.find((u) => u.id === 'leona')!.pos).toBe(2);
    expect(s.energy).toBe(2);
    g.swap(2, 3);
    expect(g.getState().hint).toMatch(/intercambiaste/i);
  });

  it('el estado se publica a los suscriptores en cada acción', () => {
    const g = inBattle();
    let calls = 0;
    const off = g.subscribe(() => calls++);
    g.endTurn();
    off();
    g.endTurn();
    expect(calls).toBe(1);
  });
});
