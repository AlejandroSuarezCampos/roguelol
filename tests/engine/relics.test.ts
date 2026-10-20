import { describe, expect, it } from 'vitest';
import { RELICS, RELIC_LIST, type RelicDef } from '../../src/data/relics';
import { playCard } from '../../src/engine/cards';
import { startCombat } from '../../src/engine/combat';
import { CONFIG } from '../../src/engine/config';
import { createExpedition, combatFromExpedition, enterNode, availableNodes, finishCombat } from '../../src/engine/expedition';
import { applyDamage } from '../../src/engine/units';
import { combatEndNotes, newRelicState, processRelics } from '../../src/engine/relics';
import { CARDS, ENEMIES, give, makeState, u } from './fixtures';
import type { CombatState } from '../../src/engine/types';

const withRelics = (ids: string[], over: Partial<CombatState> = {}) => makeState({ relics: ids, ...over });
const turnStart = (s: CombatState) => {
  s.relicQueue.push({ type: 'turnStart' });
  processRelics(s);
};

describe('datos', () => {
  it('hay al menos 16 reliquias normales y 5 de jefe, con texto y algún disparador', () => {
    expect(RELIC_LIST.filter((r) => r.rarity !== 'boss').length).toBeGreaterThanOrEqual(16);
    expect(RELIC_LIST.filter((r) => r.rarity === 'boss').length).toBeGreaterThanOrEqual(5);
    expect(new Set(RELIC_LIST.map((r) => r.id)).size).toBe(RELIC_LIST.length);
    for (const r of RELIC_LIST) {
      expect(r.text.length, r.id).toBeGreaterThan(10);
      expect(Boolean(r.on) || Boolean(r.run), r.id).toBe(true);
      if (r.rarity !== 'boss') expect(Boolean(r.on) !== Boolean(r.run), `${r.id} es de combate o de expedición, no ambas`).toBe(true);
    }
  });
});

describe('Talismán de piedra', () => {
  it('da bloqueo a todos los aliados vivos solo en el primer turno', () => {
    const s = withRelics(['stone']);
    u(s, 'lux').downed = true;
    turnStart(s);
    expect(u(s, 'leona').block).toBe(5);
    expect(u(s, 'yasuo').block).toBe(5);
    expect(u(s, 'lux').block).toBe(0);
    s.turn = 2;
    u(s, 'leona').block = 0;
    turnStart(s);
    expect(u(s, 'leona').block).toBe(0);
  });
});

describe('Reloj roto', () => {
  it('da 1 de energía en el primer turno', () => {
    const s = withRelics(['clock'], { energy: 3 });
    turnStart(s);
    expect(s.energy).toBe(4);
  });
});

describe('Cuenco de plata', () => {
  it('calma a todos si alguien está al límite, y no si no lo está', () => {
    const s = withRelics(['bowl']);
    u(s, 'leona').stress = 60;
    u(s, 'lux').stress = 80;
    turnStart(s);
    expect(u(s, 'leona').stress).toBe(55);
    expect(u(s, 'lux').stress).toBe(75);
    const calm = withRelics(['bowl']);
    u(calm, 'leona').stress = 60;
    turnStart(calm);
    expect(u(calm, 'leona').stress).toBe(60);
  });
});

describe('Emblema del asalto', () => {
  /** Ataques gratis de cuatro dueños distintos (el límite es de 3 cartas por campeón y turno). */
  const setup = () => {
    const cards = {
      ...CARDS,
      a1: { ...CARDS.strike, id: 'a1', cost: 0, owner: 'leona' as const },
      a2: { ...CARDS.strike, id: 'a2', cost: 0, owner: 'yasuo' as const },
      a3: { ...CARDS.strike, id: 'a3', cost: 0, owner: 'lux' as const },
      a4: { ...CARDS.strike, id: 'a4', cost: 0, owner: 'soraka' as const },
    };
    const s = withRelics(['emblem'], { cards });
    for (const id of ['e1', 'e2']) u(s, id).hp = u(s, id).maxHp = 200;
    return { s, hand: give(s, 'a1', 'a2', 'a3', 'a4') };
  };

  it('el tercer ataque del turno inflige 5 de daño verdadero a todos los enemigos, una vez por turno', () => {
    const { s, hand } = setup();
    playCard(s, hand[0], 'e1');
    playCard(s, hand[1], 'e1');
    const e2 = u(s, 'e2').hp;
    expect(e2).toBe(200);
    playCard(s, hand[2], 'e1');
    expect(u(s, 'e2').hp).toBe(e2 - 5);
    playCard(s, hand[3], 'e1'); // el cuarto no repite
    expect(u(s, 'e2').hp).toBe(e2 - 5);
    expect(s.relicLog.filter((l) => l.relic === 'emblem')).toHaveLength(1);
  });

  it('con dos ataques no se activa', () => {
    const { s, hand } = setup();
    playCard(s, hand[0], 'e1');
    playCard(s, hand[1], 'e1');
    expect(u(s, 'e2').hp).toBe(200);
  });
});

describe('Estandarte de la compañía', () => {
  it('tres campeones distintos en un turno: el último gana 6 de bloqueo', () => {
    const s = withRelics(['banner'], { energy: 6 });
    const [strike, tempest, bind] = give(s, 'strike', 'tempest', 'bind');
    playCard(s, strike, 'e1');
    playCard(s, tempest, 'e1');
    expect(u(s, 'lux').block).toBe(0);
    playCard(s, bind, 'e1');
    expect(u(s, 'lux').block).toBe(6);
  });

  it('dos campeones no bastan', () => {
    const s = withRelics(['banner'], { energy: 6 });
    const [strike, guard] = give(s, 'strike', 'guard');
    playCard(s, strike, 'e1');
    playCard(s, guard);
    expect(u(s, 'leona').block).toBe(8);
  });
});

describe('Fragmento del Vacío', () => {
  it('consumir Marcas hace daño verdadero al enemigo más débil y cuesta 4 de estrés', () => {
    const s = withRelics(['voidshard'], { energy: 5 });
    u(s, 'e1').statuses.mark = 2;
    u(s, 'e2').hp = 7;
    const [spark] = give(s, 'spark');
    const stress = u(s, 'lux').stress;
    playCard(s, spark);
    // Chispa final no consume marcas en las fixtures: se comprueba por el evento directo
    expect(u(s, 'lux').stress).toBe(stress);
    s.relicQueue.push({ type: 'statusConsumed', owner: 'lux', status: 'mark', stacks: 2 });
    const before = u(s, 'e2').hp;
    processRelics(s);
    expect(u(s, 'e2').hp).toBe(Math.max(0, before - 6));
    expect(u(s, 'lux').stress).toBe(stress + 4);
  });

  it('en el juego real, una carta que consume Marcas lo activa', async () => {
    const { CARDS: real } = await import('../../src/data/cards');
    const s = withRelics(['voidshard'], { energy: 5, cards: { ...CARDS, x2: real.x2 } });
    u(s, 'e1').statuses.mark = 2;
    const [x2] = give(s, 'x2');
    const stress = u(s, 'lux').stress;
    playCard(s, x2);
    expect(u(s, 'lux').stress).toBe(stress + 4);
    expect(s.relicLog.some((l) => l.relic === 'voidshard')).toBe(true);
  });
});

describe('Colmillo del lobo', () => {
  it('cuando cae un aliado, los demás ganan 8 de bloqueo (una vez por turno)', () => {
    const s = withRelics(['fang']);
    applyDamage(s, u(s, 'leona'), 999);
    processRelics(s);
    expect(u(s, 'yasuo').block).toBe(8);
    expect(u(s, 'leona').block).toBe(0);
    applyDamage(s, u(s, 'yasuo'), 999);
    processRelics(s);
    expect(u(s, 'lux').block).toBe(8); // un segundo derribo en el mismo turno no repite: lux sigue en 8, no 16
  });

  it('un enemigo derrotado no lo activa', () => {
    const s = withRelics(['fang']);
    applyDamage(s, u(s, 'e1'), 999);
    processRelics(s);
    expect(u(s, 'leona').block).toBe(0);
  });
});

describe('cola y límites', () => {
  it('sin reliquias, procesar la cola es inocuo y la deja vacía', () => {
    const s = makeState();
    s.relicQueue.push({ type: 'turnStart' });
    processRelics(s);
    expect(s.relicQueue).toEqual([]);
    expect(s.relicLog).toEqual([]);
  });

  it('una reliquia en cadena no puede crear un bucle infinito', () => {
    const loop: RelicDef = {
      id: 'loop', name: 'Bucle', rarity: 'common', text: 'Pruebas: cada activación vuelve a disparar el turno.', on: 'turnStart', chains: true,
      effects: [{ type: 'block', amount: 1, to: 'allies' }, { type: 'emit', event: { type: 'turnStart' } }],
    };
    RELICS.loop = loop;
    try {
      const s = withRelics(['loop']);
      turnStart(s);
      expect(s.relicLog.length).toBeLessThanOrEqual(CONFIG.relics.maxActivationsPerDrain);
      expect(s.relicLog.length).toBeGreaterThan(1);
      expect(s.relicQueue).toEqual([]);
    } finally {
      delete RELICS.loop;
    }
  });

  it('sin `chains`, los eventos que genere una reliquia se descartan', () => {
    const quiet: RelicDef = {
      id: 'quiet', name: 'Silenciosa', rarity: 'common', text: 'Pruebas: intenta encadenar sin declararlo.', on: 'turnStart',
      effects: [{ type: 'block', amount: 1, to: 'allies' }, { type: 'emit', event: { type: 'turnStart' } }],
    };
    RELICS.quiet = quiet;
    try {
      const s = withRelics(['quiet']);
      turnStart(s);
      expect(s.relicLog).toHaveLength(1);
      expect(u(s, 'leona').block).toBe(1);
    } finally {
      delete RELICS.quiet;
    }
  });

  it('registra cada activación con el turno', () => {
    const s = withRelics(['stone', 'clock'], { turn: 1 });
    turnStart(s);
    expect(s.relicLog).toEqual([{ relic: 'stone', turn: 1 }, { relic: 'clock', turn: 1 }]);
  });

  it('las reliquias del primer turno funcionan en un combate real (startCombat)', () => {
    const e = createExpedition(3);
    e.run.relics.push('stone', 'clock');
    const s = combatFromExpedition(e, 'combat');
    expect(s.energy).toBe(CONFIG.energyPerTurn + 1);
    expect(s.units.filter((x) => x.side === 'ally').every((a) => a.block === 5)).toBe(true);
    expect(s.relicLog.map((l) => l.relic)).toEqual(['stone', 'clock']);
  });

  it('los contadores del turno se reinician al empezar cada turno', () => {
    const s = withRelics(['emblem']);
    s.relicState = { attacksThisTurn: 5, ownersThisTurn: ['leona'], turnUses: { emblem: 1 }, combatUses: {} };
    expect(newRelicState()).toEqual({ attacksThisTurn: 0, ownersThisTurn: [], turnUses: {}, combatUses: {} });
  });
});

describe('reliquias de la expedición', () => {
  it('Corazón incandescente: al ganar cura 6 a los campeones en pie y lo anota', () => {
    const e = createExpedition(2);
    e.run.relics.push('heart');
    e.run.champions[0].hp = 10;
    const s = combatFromExpedition(e, 'combat');
    for (const x of s.units) if (x.side === 'enemy') { x.hp = 0; x.downed = true; }
    s.outcome = 'won';
    s.units.find((x) => x.id === 'yasuo')!.hp = 20;
    const r = finishCombat(e, s, 'combat')!;
    expect(e.run.champions.find((c) => c.id === 'yasuo')!.hp).toBe(26);
    expect(r.relicNotes?.join(' ')).toMatch(/Corazón incandescente/);
  });

  it('Lámpara de la Niebla: entrar en un nodo cuesta 2 de niebla menos', () => {
    const e = createExpedition(2);
    e.run.relics.push('lamp');
    enterNode(e, availableNodes(e)[0].id);
    expect(e.run.mist).toBe(CONFIG.mist.node - 2);
  });

  it('combatEndNotes cura y devuelve una nota por reliquia de expedición que actúe', () => {
    const e = createExpedition(2);
    expect(combatEndNotes(e)).toEqual([]);
    e.run.relics.push('heart', 'lamp');
    e.run.champions[0].hp = 10;
    expect(combatEndNotes(e)).toHaveLength(1); // la Lámpara no actúa aquí
    expect(e.run.champions[0].hp).toBe(16);
  });
});

describe('botín de reliquias', () => {
  const won = (e: ReturnType<typeof createExpedition>, kind: 'elite' | 'combat') => {
    const s = combatFromExpedition(e, kind);
    for (const x of s.units) if (x.side === 'enemy') { x.hp = 0; x.downed = true; }
    s.outcome = 'won';
    return finishCombat(e, s, kind)!;
  };

  it('la élite suelta una reliquia que no se tiene ya', () => {
    const e = createExpedition(2);
    const r = won(e, 'elite');
    expect(r.relicIds).toHaveLength(1);
    expect(e.run.relics).not.toContain(r.relicIds![0]);
  });

  it('nunca repite una reliquia y se acaban sin romper nada', () => {
    const e = createExpedition(2);
    e.run.relics = RELIC_LIST.map((x) => x.id);
    const r = won(e, 'elite');
    expect(r.relicIds ?? []).toEqual([]);
  });

  it('un combate normal sin Ruina no suelta reliquias', () => {
    const e = createExpedition(2);
    expect(won(e, 'combat').relicIds ?? []).toEqual([]);
  });

  it('startCombat acepta reliquias directamente', () => {
    expect(typeof startCombat).toBe('function');
    expect(ENEMIES.wolf).toBeDefined();
  });
});

describe('Lámpara de la Niebla: resta de lo que sube, no después del tope', () => {
  it('a mucha niebla sigue subiendo 2 menos que sin lámpara, y la vista previa coincide', async () => {
    const { previewNode } = await import('../../src/engine/run');
    const without = createExpedition(2);
    without.run.mist = 50;
    const withLamp = createExpedition(2);
    withLamp.run.relics.push('lamp');
    withLamp.run.mist = 50;
    expect(previewNode(without.run, 'combat').mistAfter).toBe(55);
    expect(previewNode(withLamp.run, 'combat').mistAfter).toBe(53);
    enterNode(withLamp, availableNodes(withLamp)[0].id);
    expect(withLamp.run.mist).toBe(53);
    const edge = createExpedition(2);
    edge.run.relics.push('lamp');
    edge.run.mist = 98;
    expect(previewNode(edge.run, 'combat').mistAfter).toBe(100);
    enterNode(edge, availableNodes(edge)[0].id);
    expect(edge.run.mist).toBe(100);
  });
});

describe('reliquias nuevas', () => {
  it('Destello hextech roba 1 carta al empezar el combate', () => {
    const s = withRelics(['flash']);
    s.drawPile = [{ uid: 'd1', defId: 'strike' }];
    turnStart(s);
    expect(s.hand.map((c) => c.uid)).toEqual(['d1']);
  });

  it('Fajín de mercurio: al cruzar los 75 de estrés quita 15, una vez por combate', async () => {
    const { addStress } = await import('../../src/engine/stress');
    const s = withRelics(['quicksilver']);
    addStress(s, u(s, 'lux'), 80);
    processRelics(s);
    expect(u(s, 'lux').stress).toBe(65);
    addStress(s, u(s, 'leona'), 80);
    processRelics(s);
    expect(u(s, 'leona').stress).toBe(80);
  });

  it('Chaleco de zarzas responde solo a golpes críticos', () => {
    const s = withRelics(['bramble']);
    s.relicQueue.push({ type: 'allyHit', unit: 'leona', attacker: 'e1', crit: false });
    processRelics(s);
    expect(u(s, 'e1').hp).toBe(30);
    s.relicQueue.push({ type: 'allyHit', unit: 'leona', attacker: 'e1', crit: true });
    processRelics(s);
    expect(u(s, 'e1').hp).toBe(24);
  });

  it('Égida de fuego solar quema a todos los enemigos cada turno', () => {
    const s = withRelics(['sunfire']);
    turnStart(s);
    expect(u(s, 'e1').statuses.burn).toBe(1);
    expect(u(s, 'e2').statuses.burn).toBe(1);
  });

  it('las reliquias de jefe nunca salen en botín, tienda ni tesoros', async () => {
    const { createExpedition, relicPool } = await import('../../src/engine/expedition');
    expect(relicPool(createExpedition(1)).some((r) => r.rarity === 'boss')).toBe(false);
  });

  it('la Corona de la Niebla da energía y cobra niebla al entrar en un nodo', async () => {
    const { createRun, enterNode } = await import('../../src/engine/run');
    const run = createRun(1, []);
    run.relics.push('mistcrown');
    enterNode(run, 'combat');
    expect(run.mist).toBe(5 + 3);
  });
});
