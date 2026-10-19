import { describe, expect, it } from 'vitest';
import { cardOf } from '../../src/engine/cards';
import { availableNodes } from '../../src/engine/expedition';
import { createExpedition } from '../../src/engine/expedition';
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

describe('pociones en el mapa', () => {
  it('una poción curativa seleccionada cura al campeón elegido y se gasta', () => {
    const g = createGameStore();
    g.newExpedition(1);
    g.startExpedition();
    const e = g.getState().expedition!;
    e.run.belt[0] = { id: 'health', spent: false };
    e.run.champions[0].hp = 10;
    g.selectPotion(0);
    g.drinkPotion('leona');
    expect(e.run.champions[0].hp).toBe(30);
    expect(e.run.belt[0]).toBeNull();
    expect(g.getState().selectedPotion).toBeNull();
  });

  it('un elixir no curativo da un aviso', () => {
    const g = createGameStore();
    g.newExpedition(1);
    g.startExpedition();
    g.getState().expedition!.run.belt[0] = { id: 'iron', spent: false };
    g.selectPotion(0);
    g.drinkPotion('leona');
    expect(g.getState().hint).toMatch(/curativas/i);
  });
});

describe('efectos flotantes del turno enemigo', () => {
  it('un golpe absorbido por el bloqueo se anuncia como «bloqueado»', () => {
    const g = inBattle();
    const s = g.getState().combat!;
    for (const a of s.units) if (a.side === 'ally') a.block = 0;
    // El bloqueo de los aliados se reinicia al empezar su turno, así que el golpe llega antes: lo medimos sobre el turno enemigo.
    const front = s.units.filter((x) => x.side === 'ally').sort((a, b) => a.pos - b.pos)[0];
    front.block = 999;
    g.endTurn();
    expect(g.getState().fx.some((f) => f.kind === 'blocked')).toBe(true);
    expect(g.getState().fx.some((f) => f.kind === 'damage' && f.unitId === front.id)).toBe(false);
  });
});

describe('comerciante y eventos', () => {
  /** Lleva la run a un nodo del tipo dado reescribiendo la conexión del piso anterior (atajo de test). */
  function atNode(type: 'shop' | 'event', seed = 2) {
    const g = createGameStore();
    g.newExpedition(seed);
    g.startExpedition();
    const e = g.getState().expedition!;
    const target = e.map.nodes.find((n) => n.type === type)!;
    e.currentId = 'n0-0';
    e.map.nodes.find((n) => n.id === 'n0-0')!.next = [target.id];
    g.chooseNode(target.id);
    return g;
  }

  it('entrar en un comerciante abre la tienda y comprar resta oro', () => {
    const g = atNode('shop');
    expect(g.getState().screen).toBe('shop');
    const e = g.getState().expedition!;
    e.run.gold = 500;
    const price = e.shop!.cards[0].price;
    g.buyCard(0);
    expect(e.run.gold).toBe(500 - price);
    expect(e.deck).toHaveLength(21);
    g.leaveShop();
    expect(g.getState().screen).toBe('map');
    expect(e.shop).toBeNull();
  });

  it('comprar sin oro deja un aviso', () => {
    const g = atNode('shop');
    g.getState().expedition!.run.gold = 0;
    g.buyCard(0);
    expect(g.getState().hint).toMatch(/oro/i);
  });

  it('un evento se resuelve una sola vez y se puede salir después', () => {
    const g = atNode('event');
    expect(g.getState().screen).toBe('event');
    const ev = g.getState().event!;
    const leave = ev.choices.findIndex((c) => c.effects.length === 0);
    g.chooseEventOption(leave);
    expect(g.getState().eventOutcome!.result).toBe(ev.choices[leave].result);
    g.chooseEventOption(0);
    expect(g.getState().eventOutcome!.result).toBe(ev.choices[leave].result);
    g.leaveEvent();
    expect(g.getState().screen).toBe('map');
    expect(g.getState().event).toBeNull();
  });

  it('una opción con requisito de oro no se puede elegir sin oro', () => {
    const g = atNode('event', 3);
    const ev = g.getState().event!;
    const i = ev.choices.findIndex((c) => c.requiresGold);
    if (i < 0) return;
    g.getState().expedition!.run.gold = 0;
    expect(g.eventBlocked(i)).toMatch(/oro/i);
    g.chooseEventOption(i);
    expect(g.getState().eventOutcome).toBeNull();
    expect(g.getState().hint).toMatch(/oro/i);
  });
});

import { createSaveManager, SAVE_KEY, type StorageLike } from '../../src/save/saveManager';

describe('guardado automático', () => {
  const mem = (): StorageLike & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
  };

  it('guarda al llegar al mapa y la expedición se puede retomar', () => {
    const store = mem();
    const g = createGameStore({ save: createSaveManager(store) });
    g.newExpedition(5);
    expect(store.data.has(SAVE_KEY)).toBe(false); // la preparación no se guarda
    g.startExpedition();
    expect(store.data.has(SAVE_KEY)).toBe(true);
    expect(g.getState().saved).toMatchObject({ floor: 0, gold: 0 });
    g.getState().expedition!.run.gold = 42;
    g.selectPotion(null); // cualquier emisión en el mapa vuelve a guardar
    const g2 = createGameStore({ save: createSaveManager(store) });
    expect(g2.getState().saved).toMatchObject({ gold: 42 });
    g2.continueExpedition();
    expect(g2.getState().screen).toBe('map');
    expect(g2.getState().expedition!.run.gold).toBe(42);
  });

  it('no guarda en pleno combate y al terminar la expedición borra el guardado', () => {
    const store = mem();
    const g = createGameStore({ save: createSaveManager(store) });
    g.newExpedition(5);
    g.getState().expedition!.run.gold = 10;
    g.startExpedition();
    g.chooseNode(availableNodes(g.getState().expedition!)[0].id);
    g.getState().expedition!.run.gold = 999;
    g.endTurn();
    expect(JSON.parse(store.data.get(SAVE_KEY)!).expedition.run.gold).toBe(10);
    g.retreat();
    expect(store.data.has(SAVE_KEY)).toBe(false);
    expect(g.getState().saved).toBeNull();
  });

  it('un guardado dañado se descarta con un aviso y no rompe nada', () => {
    const store = mem();
    store.setItem(SAVE_KEY, 'basura');
    const g = createGameStore({ save: createSaveManager(store) });
    g.continueExpedition();
    expect(g.getState().screen).toBe('menu');
    expect(g.getState().notice).toMatch(/dañad[ao]/);
    g.dismissNotice();
    expect(g.getState().notice).toBeNull();
  });

  it('sin guardado, continuar no hace nada', () => {
    const g = createGameStore({ save: createSaveManager(mem()) });
    g.continueExpedition();
    expect(g.getState().screen).toBe('menu');
  });
});

describe('gear y equipo', () => {
  it('el botín de gear se puede equipar al elegirlo y solo se elige una vez', () => {
    const g = inBattle();
    win(g);
    g.concludeCombat();
    const e = g.getState().expedition!;
    g.getState().rewards!.gear = ['rabadon', 'infinity', 'warmog'];
    g.claimGear('rabadon', 'lux');
    expect(e.gear.lux.weapon).toBe('rabadon');
    expect(g.getState().gearClaimed).toBe(true);
    g.claimGear('infinity');
    expect(g.getState().hint).toMatch(/Ya elegiste/);
    expect(e.inventory).toEqual([]);
  });

  it('elegir un objeto que no está en el botín da un aviso', () => {
    const g = inBattle();
    win(g);
    g.concludeCombat();
    g.getState().rewards!.gear = ['rabadon'];
    g.claimGear('infinity');
    expect(g.getState().hint).toMatch(/no está/);
    expect(g.getState().expedition!.inventory).toEqual([]);
  });

  it('la pantalla de equipo se abre desde el mapa, equipa y desequipa, y vuelve', () => {
    const g = createGameStore();
    g.newExpedition(1);
    g.startExpedition();
    const e = g.getState().expedition!;
    e.inventory.push('warmog');
    g.openTeam();
    expect(g.getState().screen).toBe('team');
    g.equipGear('leona', 'warmog');
    expect(e.gear.leona.armor).toBe('warmog');
    g.unequipGear('leona', 'armor');
    expect(e.inventory).toEqual(['warmog']);
    g.unequipGear('leona', 'armor');
    expect(g.getState().hint).toMatch(/nada/i);
    g.closeTeam();
    expect(g.getState().screen).toBe('map');
  });

  it('no se puede equipar en combate', () => {
    const g = inBattle();
    const e = g.getState().expedition!;
    e.inventory.push('warmog');
    g.equipGear('leona', 'warmog');
    expect(g.getState().hint).toMatch(/combate/);
    expect(e.gear.leona.armor).toBeNull();
  });
});

describe('reliquias en la interfaz', () => {
  it('las reliquias activadas en una acción quedan marcadas en el estado', () => {
    const g = createGameStore();
    g.newExpedition(3);
    g.getState().expedition!.run.relics.push('stone', 'bowl');
    g.getState().expedition!.run.champions[2].stress = 90;
    g.startExpedition();
    g.chooseNode(availableNodes(g.getState().expedition!)[0].id);
    // al empezar el combate se activan solo las del primer turno; tras terminar el turno, el Cuenco (estrés ≥ 75) pulsa de nuevo
    g.endTurn();
    expect(g.getState().activeRelics).toContain('bowl');
    expect(g.getState().activeRelics).not.toContain('stone');
  });

  it('el botín añade las reliquias nuevas a la expedición al concluir el combate', () => {
    const g = createGameStore();
    g.newExpedition(3);
    g.startExpedition();
    g.chooseNode(availableNodes(g.getState().expedition!)[0].id);
    const s = g.getState().combat!;
    for (const u of s.units) if (u.side === 'enemy') { u.hp = 0; u.downed = true; }
    s.outcome = 'won';
    g.getState().expedition!.run.mist = 95; // Ruina: más posibilidades de reliquia
    g.concludeCombat();
    const r = g.getState().rewards!;
    for (const id of r.relicIds ?? []) expect(g.getState().expedition!.run.relics).toContain(id);
  });
});

describe('dificultad', () => {
  it('se elige en la preparación y se conserva el orden del equipo', () => {
    const g = createGameStore();
    g.newExpedition(5);
    g.reorderTeam('soraka', 1);
    g.setDifficulty('nightmare');
    const e = g.getState().expedition!;
    expect(e.difficulty).toBe('nightmare');
    expect(e.run.champions.find((c) => c.id === 'soraka')!.pos).toBe(1);
    expect(e.run.omen).toBe(createExpedition(5).run.omen); // mismo presagio: misma semilla
  });

  it('no se puede cambiar una vez empezada la expedición', () => {
    const g = createGameStore();
    g.newExpedition(5);
    g.startExpedition();
    g.setDifficulty('nightmare');
    expect(g.getState().expedition!.difficulty).toBe('normal');
  });

  it('una expedición nueva puede empezar en Pesadilla', () => {
    const g = createGameStore();
    g.newExpedition(5, 'nightmare');
    expect(g.getState().expedition!.difficulty).toBe('nightmare');
  });
});

import { createMetaManager, META_KEY } from '../../src/save/metaManager';
import { PERKS } from '../../src/data/perks';

describe('metaprogresión en el store', () => {
  const mem = (): StorageLike & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
  };

  it('las Esquirlas se ganan una sola vez al terminar la expedición y se guardan', () => {
    const store = mem();
    const g = createGameStore({ save: createSaveManager(store), meta: createMetaManager(store) });
    g.newExpedition(5);
    g.startExpedition();
    g.retreat();
    const shards = g.getState().lastShards!;
    expect(shards).toBeGreaterThanOrEqual(5);
    expect(g.getState().meta.shards).toBe(shards);
    expect(JSON.parse(store.data.get(META_KEY)!).meta.shards).toBe(shards);
    g.toMenu();
    g.openMenuScreen('archive');
    expect(g.getState().meta.shards).toBe(shards); // no se vuelve a sumar
    const g2 = createGameStore({ save: createSaveManager(store), meta: createMetaManager(store) });
    expect(g2.getState().meta.shards).toBe(shards);
  });

  it('comprar una mejora gasta Esquirlas, se guarda y se aplica a la siguiente expedición', () => {
    const store = mem();
    const g = createGameStore({ meta: createMetaManager(store) });
    g.getState().meta.shards = 500;
    g.buyPerk('vigor');
    g.buyPerk('provisions');
    expect(g.getState().meta.perks.vigor).toBe(1);
    expect(g.getState().meta.shards).toBe(500 - PERKS.vigor.costs[0] - PERKS.provisions.costs[0]);
    g.newExpedition(3);
    const e = g.getState().expedition!;
    expect(e.run.gold).toBe(PERKS.provisions.values[0]);
    expect(e.run.champions[0].maxHp).toBeGreaterThan(0);
    expect(e.perks.hp).toBe(PERKS.vigor.values[0]);
    g.setDifficulty('nightmare');
    expect(g.getState().expedition!.perks.hp).toBe(PERKS.vigor.values[0]);
  });

  it('comprar sin saldo o al máximo da un aviso', () => {
    const g = createGameStore({ meta: createMetaManager(mem()) });
    g.buyPerk('mastery');
    expect(g.getState().hint).toMatch(/Esquirlas/);
    expect(g.getState().meta.perks.mastery).toBe(0);
  });

  it('borrar el progreso lo deja a cero', () => {
    const store = mem();
    const g = createGameStore({ meta: createMetaManager(store) });
    g.getState().meta.shards = 50;
    g.buyPerk('belt');
    g.resetProgress();
    expect(g.getState().meta.shards).toBe(0);
    expect(g.getState().meta.perks.belt).toBe(0);
    expect(store.data.has(META_KEY)).toBe(false);
  });

  it('un progreso dañado se descarta con un aviso en el menú', () => {
    const store = mem();
    store.setItem(META_KEY, 'basura');
    const g = createGameStore({ meta: createMetaManager(store) });
    expect(g.getState().notice).toMatch(/progreso permanente/);
    expect(g.getState().meta.shards).toBe(0);
  });
});

describe('robustez de las acciones de botín', () => {
  it('equipar el botín en un campeón muerto no recoge nada ni cierra la elección', () => {
    const g = createGameStore();
    g.newExpedition(3, 'nightmare');
    g.startExpedition();
    g.chooseNode(availableNodes(g.getState().expedition!)[0].id);
    win(g);
    g.concludeCombat();
    const e = g.getState().expedition!;
    e.dead.push('lux');
    e.run.champions = e.run.champions.filter((c) => c.id !== 'lux');
    g.getState().rewards!.gear = ['rabadon'];
    g.claimGear('rabadon', 'lux');
    expect(e.inventory).toEqual([]);
    expect(g.getState().gearClaimed).toBe(false);
    expect(g.getState().hint).toMatch(/muerto/);
    g.claimGear('rabadon', 'leona');
    expect(e.gear.leona.weapon).toBe('rabadon');
    expect(g.getState().gearClaimed).toBe(true);
  });

  it('concludeCombat es idempotente: un segundo clic no reparte dos veces el botín ni suma heridas', () => {
    const g = inBattle();
    win(g);
    const s = g.getState().combat!;
    s.units.find((u) => u.id === 'lux')!.downed = true;
    s.units.find((u) => u.id === 'lux')!.hp = 0;
    g.concludeCombat();
    const e = g.getState().expedition!;
    const gold = e.run.gold;
    const wounds = { ...e.wounds };
    const combats = e.stats.combats;
    g.concludeCombat();
    g.concludeCombat();
    expect(e.run.gold).toBe(gold);
    expect(e.wounds).toEqual(wounds);
    expect(e.stats.combats).toBe(combats);
    expect(g.getState().screen).toBe('reward');
  });
});

describe('guardado dañado al arrancar', () => {
  it('se avisa, se conserva una copia y el siguiente autoguardado no la destruye', () => {
    const data = new Map<string, string>();
    const store: StorageLike = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
    data.set(SAVE_KEY, JSON.stringify({ version: 4, savedAt: 1, expedition: { nonsense: true } }));
    const g = createGameStore({ save: createSaveManager(store) });
    expect(g.getState().notice).toMatch(/guardada estaba dañada/);
    expect(g.getState().saved).toBeNull();
    expect([...data.keys()].some((k) => k.endsWith('.corrupt'))).toBe(true);
    g.newExpedition(2);
    g.startExpedition(); // autoguarda una expedición válida
    expect([...data.keys()].some((k) => k.endsWith('.corrupt'))).toBe(true);
    expect(data.has(SAVE_KEY)).toBe(true);
  });
});
