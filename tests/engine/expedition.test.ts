import { describe, expect, it } from 'vitest';
import { CARDS } from '../../src/data/cards';
import { CHAMPIONS } from '../../src/data/champions';
import { CONFIG } from '../../src/engine/config';
import {
  availableNodes, claimCard, claimRewards, combatFromExpedition, createExpedition, enterNode, finishCombat,
  generateMap, rest, retreat, type Expedition,
} from '../../src/engine/expedition';
import { Rng } from '../../src/engine/rng';

const firstOfType = (e: Expedition, type: string) => e.map.nodes.find((n) => n.type === type)!;
/** Lleva la expedición hasta un nodo del tipo dado entrando por el camino más corto. */
function walkTo(e: Expedition, type: string): void {
  const target = firstOfType(e, type);
  const path: string[] = [];
  const prev = new Map<string, string>();
  const queue = availableNodes(e).map((n) => n.id);
  const seen = new Set(queue);
  while (queue.length) {
    const id = queue.shift()!;
    if (id === target.id) {
      for (let c: string | undefined = id; c; c = prev.get(c)) path.unshift(c);
      break;
    }
    for (const nx of e.map.nodes.find((n) => n.id === id)!.next) if (!seen.has(nx)) { seen.add(nx); prev.set(nx, id); queue.push(nx); }
  }
  for (const id of path) enterNode(e, id);
}

describe('mapa', () => {
  const map = generateMap(new Rng(7));

  it('es reproducible con la misma semilla', () => {
    expect(generateMap(new Rng(7))).toEqual(map);
    expect(generateMap(new Rng(8))).not.toEqual(map);
  });

  it('tiene 8 pisos con un único jefe al final', () => {
    expect(Math.max(...map.nodes.map((n) => n.floor))).toBe(CONFIG.expedition.floors - 1);
    const top = map.nodes.filter((n) => n.floor === CONFIG.expedition.floors - 1);
    expect(top).toHaveLength(1);
    expect(top[0].type).toBe('boss');
    expect(map.nodes.filter((n) => n.type === 'boss')).toHaveLength(1);
  });

  it('los caminos solo van al piso siguiente y no hay nodos huérfanos ni callejones', () => {
    for (const n of map.nodes) {
      if (n.type !== 'boss') expect(n.next.length, n.id).toBeGreaterThan(0);
      for (const id of n.next) expect(map.nodes.find((x) => x.id === id)!.floor).toBe(n.floor + 1);
      if (n.floor > 0) expect(map.nodes.some((x) => x.next.includes(n.id)), n.id).toBe(true);
    }
  });

  it('el primer piso es de combates y el penúltimo siempre es descanso', () => {
    expect(map.nodes.filter((n) => n.floor === 0).every((n) => n.type === 'combat')).toBe(true);
    expect(map.nodes.filter((n) => n.floor === CONFIG.expedition.floors - 2).every((n) => n.type === 'rest')).toBe(true);
  });

  it('cada piso tiene 2–3 nodos salvo el jefe', () => {
    for (let f = 0; f < CONFIG.expedition.floors - 1; f++) {
      const count = map.nodes.filter((n) => n.floor === f).length;
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(3);
    }
  });
});

describe('avance por el mapa', () => {
  it('al principio solo se puede entrar en el primer piso y luego en los siguientes conectados', () => {
    const e = createExpedition(1);
    expect(availableNodes(e).every((n) => n.floor === 0)).toBe(true);
    const first = availableNodes(e)[0];
    enterNode(e, first.id);
    expect(e.currentId).toBe(first.id);
    expect(availableNodes(e).map((n) => n.id).sort()).toEqual([...first.next].sort());
  });

  it('rechaza nodos no accesibles y sube la niebla al entrar', () => {
    const e = createExpedition(1);
    const far = e.map.nodes.find((n) => n.floor === 3)!;
    expect(() => enterNode(e, far.id)).toThrow();
    enterNode(e, availableNodes(e)[0].id);
    expect(e.run.mist).toBe(CONFIG.mist.node);
  });

  it('empieza con 4 campeones sanos, el mazo inicial y sin oro', () => {
    const e = createExpedition(1);
    expect(e.run.champions.map((c) => c.id)).toEqual(['leona', 'yasuo', 'lux', 'soraka']);
    expect(e.run.champions.every((c) => c.hp === c.maxHp && !c.downed)).toBe(true);
    expect(e.deck).toHaveLength(20);
    expect(e.run.gold).toBe(0);
    expect(e.status).toBe('active');
  });
});

describe('combate desde la expedición', () => {
  it('crea el combate con el equipo de la run, su mazo y los enemigos del encuentro', () => {
    const e = createExpedition(3);
    e.run.champions[2].hp = 10; // Lux herida
    const s = combatFromExpedition(e, 'combat');
    expect(s.units.filter((u) => u.side === 'ally')).toHaveLength(4);
    expect(s.units.find((u) => u.id === 'lux')!.hp).toBe(10);
    expect(s.units.filter((u) => u.side === 'enemy').length).toBeGreaterThan(0);
    expect(s.hand).toHaveLength(CONFIG.handSize);
    expect(s.hand.length + s.drawPile.length + s.discard.length).toBe(e.deck.length);
    expect(s.omen).toBe(e.run.omen);
  });

  it('mantiene derribado a quien lo estaba y aplica los modificadores de niebla', () => {
    const e = createExpedition(3);
    e.run.champions[0].hp = 0;
    e.run.champions[0].downed = true;
    e.run.mist = 100;
    const s = combatFromExpedition(e, 'combat');
    expect(s.units.find((u) => u.id === 'leona')!.downed).toBe(true);
    expect(s.mods.hpMultiplier).toBe(CONFIG.mist.ruinHpMultiplier);
  });

  it('el mismo estado de run da el mismo combate (reproducible)', () => {
    const a = combatFromExpedition(createExpedition(5), 'combat');
    const b = combatFromExpedition(createExpedition(5), 'combat');
    expect(a.hand.map((c) => c.defId)).toEqual(b.hand.map((c) => c.defId));
    expect(a.units.map((u) => u.id)).toEqual(b.units.map((u) => u.id));
  });
});

describe('fin de combate', () => {
  function won(e: Expedition, kind: 'combat' | 'elite' | 'boss' = 'combat') {
    const s = combatFromExpedition(e, kind);
    for (const u of s.units) if (u.side === 'enemy') { u.hp = 0; u.downed = true; }
    s.outcome = 'won';
    return s;
  }

  it('vuelca vida y estrés de los aliados en la run y devuelve el botín', () => {
    const e = createExpedition(2);
    const s = won(e);
    s.units.find((u) => u.id === 'yasuo')!.hp = 17;
    s.units.find((u) => u.id === 'yasuo')!.stress = 41;
    const rewards = finishCombat(e, s, 'combat')!;
    const y = e.run.champions.find((c) => c.id === 'yasuo')!;
    expect(y.hp).toBe(17);
    expect(y.stress).toBe(41);
    expect(rewards.gold).toBeGreaterThan(0);
    expect(rewards.cardOptions).toBeGreaterThanOrEqual(3);
    expect(e.status).toBe('active');
  });

  it('un derribado sobrevive a la victoria con una herida grave y vida reducida', () => {
    const e = createExpedition(2);
    const s = won(e);
    const l = s.units.find((u) => u.id === 'lux')!;
    l.hp = 0;
    l.downed = true;
    finishCombat(e, s, 'combat');
    const lux = e.run.champions.find((c) => c.id === 'lux')!;
    expect(lux.downed).toBe(false);
    expect(e.wounds.lux).toBe(1);
    expect(lux.maxHp).toBe(Math.round(CHAMPIONS.lux.maxHp * (1 - CONFIG.expedition.wound.maxHpLoss)));
    expect(lux.hp).toBe(Math.ceil(lux.maxHp * CONFIG.expedition.wound.recoverHpFraction));
  });

  it('las heridas tienen tope', () => {
    const e = createExpedition(2);
    for (let i = 0; i < 5; i++) {
      const s = won(e);
      const l = s.units.find((u) => u.id === 'lux')!;
      l.hp = 0;
      l.downed = true;
      finishCombat(e, s, 'combat');
    }
    expect(e.wounds.lux).toBe(CONFIG.expedition.wound.cap);
  });

  it('perder acaba la expedición en derrota', () => {
    const e = createExpedition(2);
    const s = combatFromExpedition(e, 'combat');
    s.outcome = 'lost';
    expect(finishCombat(e, s, 'combat')).toBeNull();
    expect(e.status).toBe('defeat');
  });

  it('vencer al jefe es la victoria de la expedición', () => {
    const e = createExpedition(2);
    finishCombat(e, won(e, 'boss'), 'boss');
    expect(e.status).toBe('victory');
  });

  it('el botín añade oro, y la carta elegida va al mazo (o se omite)', () => {
    const e = createExpedition(2);
    const rewards = finishCombat(e, won(e), 'combat')!;
    claimRewards(e, rewards);
    expect(e.run.gold).toBe(rewards.gold);
    claimCard(e, 'x2');
    expect(e.deck).toHaveLength(21);
    expect(e.deck.at(-1)).toBe('x2');
    claimCard(e, null);
    expect(e.deck).toHaveLength(21);
    expect(() => claimCard(e, 'nope')).toThrow();
  });

  it('las cartas de recompensa salen del pool y no repiten las 3 opciones', () => {
    const e = createExpedition(2);
    const rewards = finishCombat(e, won(e), 'combat')!;
    expect(new Set(rewards.cards).size).toBe(rewards.cardOptions);
    for (const id of rewards.cards) expect(CARDS[id]).toBeDefined();
  });
});

describe('descanso y retirada', () => {
  it('curar recupera el 30 % de la vida máxima sin superar el máximo ni tocar a derribados', () => {
    const e = createExpedition(4);
    e.run.champions[0].hp = 10;
    e.run.champions[1].hp = e.run.champions[1].maxHp - 2;
    e.run.champions[2].hp = 0;
    e.run.champions[2].downed = true;
    rest(e, 'heal');
    expect(e.run.champions[0].hp).toBe(10 + Math.floor(e.run.champions[0].maxHp * CONFIG.expedition.rest.healFraction));
    expect(e.run.champions[1].hp).toBe(e.run.champions[1].maxHp);
    expect(e.run.champions[2].hp).toBe(0);
  });

  it('calmar baja el estrés de todos hasta un mínimo de 0', () => {
    const e = createExpedition(4);
    e.run.champions[0].stress = 50;
    e.run.champions[1].stress = 5;
    rest(e, 'calm');
    expect(e.run.champions[0].stress).toBe(30);
    expect(e.run.champions[1].stress).toBe(0);
  });

  it('tratar una herida devuelve la vida máxima del campeón más herido', () => {
    const e = createExpedition(4);
    e.wounds.lux = 2;
    e.run.champions[2].maxHp = 36;
    rest(e, 'treat');
    expect(e.wounds.lux).toBe(1);
    expect(e.run.champions[2].maxHp).toBe(Math.round(CHAMPIONS.lux.maxHp * (1 - CONFIG.expedition.wound.maxHpLoss)));
  });

  it('solo se descansa una vez por nodo de descanso', () => {
    const e = createExpedition(4);
    walkTo(e, 'rest');
    rest(e, 'heal');
    expect(() => rest(e, 'calm')).toThrow();
  });

  it('avivar la hoguera baja la niebla una vez y es aparte del descanso', () => {
    const e = createExpedition(4);
    walkTo(e, 'rest');
    const before = e.run.mist;
    rest(e, 'stoke');
    expect(e.run.mist).toBe(before + CONFIG.mist.stoke < 0 ? 0 : before + CONFIG.mist.stoke);
    expect(() => rest(e, 'stoke')).toThrow();
    rest(e, 'heal'); // el descanso sigue disponible
  });

  it('retirarse acaba la expedición y conserva solo parte del oro', () => {
    const e = createExpedition(4);
    e.run.gold = 100;
    retreat(e);
    expect(e.status).toBe('retreat');
    expect(e.run.gold).toBe(50);
  });
});
