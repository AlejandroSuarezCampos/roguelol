import { describe, expect, it } from 'vitest';
import { CARDS } from '../../src/data/cards';
import { EVENTS, type EventDef } from '../../src/data/events';
import { createExpedition } from '../../src/engine/expedition';
import { choiceBlocked, pickEvent, resolveChoice } from '../../src/engine/events';
import { CONFIG } from '../../src/engine/config';

const ev = (id: string): EventDef => EVENTS.find((x) => x.id === id)!;

describe('datos de eventos', () => {
  it('hay al menos 5 eventos con 3 opciones, textos y efectos', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(5);
    expect(new Set(EVENTS.map((x) => x.id)).size).toBe(EVENTS.length);
    for (const x of EVENTS) {
      expect(x.choices, x.id).toHaveLength(3);
      expect(x.text.length, x.id).toBeGreaterThan(0);
      for (const c of x.choices) {
        expect(c.label.length).toBeGreaterThan(0);
        expect(c.result.length).toBeGreaterThan(0);
      }
      expect(x.choices.some((c) => c.effects.length === 0), `${x.id} tiene salida sin coste`).toBe(true);
    }
  });

  it('toda opción se puede resolver desde una run nueva con oro de sobra', () => {
    for (const x of EVENTS)
      x.choices.forEach((_, i) => {
        const e = createExpedition(5);
        e.run.gold = 500;
        expect(() => resolveChoice(e, x, i), `${x.id}/${i}`).not.toThrow();
      });
  });
});

describe('sin cartas de esa rareza', () => {
  it('con un solo campeón vivo sin épicas, el evento da otra carta (o ninguna) y no falla', () => {
    const e = createExpedition(1, 'nightmare');
    e.run.champions = e.run.champions.filter((c) => c.id === 'yasuo'); // Yasuo no tiene cartas épicas
    e.dead.push('leona', 'lux', 'soraka');
    e.deck = e.deck.filter((id) => CARDS[id].owner === 'yasuo');
    const x = ev('void_altar');
    const before = e.deck.length;
    const out = resolveChoice(e, x, 0);
    expect(e.deck.length).toBe(before + 1);
    expect(CARDS[e.deck.at(-1)!].owner).toBe('yasuo');
    expect(out.lines.join(' ')).toMatch(/Nueva carta/);
  });
});

describe('pickEvent', () => {
  it('no repite eventos hasta agotarlos y es reproducible con la semilla', () => {
    const e = createExpedition(9);
    const ids = EVENTS.map(() => pickEvent(e).id);
    expect(new Set(ids).size).toBe(EVENTS.length);
    const again = createExpedition(9);
    expect(EVENTS.map(() => pickEvent(again).id)).toEqual(ids);
    expect(EVENTS.map((x) => x.id)).toContain(pickEvent(e).id); // agotados: vuelve a empezar sin fallar
  });
});

describe('efectos', () => {
  it('requisito de oro: bloquea la opción y no cambia nada', () => {
    const e = createExpedition(1);
    e.run.gold = 10;
    const purify = ev('void_altar');
    const i = purify.choices.findIndex((c) => c.requiresGold);
    expect(choiceBlocked(e, purify.choices[i])).toMatch(/oro/i);
    expect(() => resolveChoice(e, purify, i)).toThrow(/oro/i);
    expect(e.run.gold).toBe(10);
  });

  it('oro, estrés y niebla se aplican con sus límites', () => {
    const e = createExpedition(1);
    e.run.gold = 100;
    e.run.champions[0].stress = 5;
    const x = ev('void_altar');
    resolveChoice(e, x, x.choices.findIndex((c) => c.requiresGold));
    expect(e.run.gold).toBe(100 - x.choices.find((c) => c.requiresGold)!.requiresGold!);
    expect(e.run.champions[0].stress).toBe(0); // no baja de 0
    const camp = ev('fallen_altar');
    const pray = camp.choices.findIndex((c) => c.effects.some((f) => f.type === 'mist'));
    const mist = e.run.mist;
    resolveChoice(e, camp, pray);
    expect(e.run.mist).toBe(mist + 8);
  });

  it('el daño a todos nunca mata: deja al menos 1 de vida', () => {
    const e = createExpedition(1);
    e.run.champions[2].hp = 3;
    const x = ev('fallen_altar');
    const i = x.choices.findIndex((c) => c.effects.some((f) => f.type === 'damageAll'));
    resolveChoice(e, x, i);
    expect(e.run.champions[2].hp).toBe(1);
    expect(e.run.champions.every((c) => !c.downed && c.hp >= 1)).toBe(true);
  });

  it('curar a todos respeta la vida máxima y salta a los derribados', () => {
    const e = createExpedition(1);
    e.run.champions[0].hp = 10;
    e.run.champions[1].hp = 0;
    e.run.champions[1].downed = true;
    e.run.gold = 100;
    const x = ev('ghost_ferryman');
    resolveChoice(e, x, x.choices.findIndex((c) => c.effects.some((f) => f.type === 'healAll')));
    expect(e.run.champions[0].hp).toBeGreaterThan(10);
    expect(e.run.champions[1].hp).toBe(0);
    expect(e.run.champions.every((c) => c.hp <= c.maxHp)).toBe(true);
  });

  it('una carta rara o épica del evento va al mazo con la rareza pedida', () => {
    const e = createExpedition(1);
    const x = ev('void_altar');
    const out = resolveChoice(e, x, 0);
    expect(e.deck).toHaveLength(21);
    expect(CARDS[e.deck.at(-1)!].rarity).toBe('epic');
    expect(out.lines.join(' ')).toContain(CARDS[e.deck.at(-1)!].name);
  });

  it('una herida grave recae en un campeón y respeta el tope', () => {
    const e = createExpedition(1);
    const x = ev('chained_chest');
    const i = x.choices.findIndex((c) => c.effects.some((f) => f.type === 'wound'));
    for (let k = 0; k < 30; k++) resolveChoice(e, x, i);
    for (const n of Object.values(e.wounds)) expect(n).toBeLessThanOrEqual(CONFIG.expedition.wound.cap);
    expect(Object.values(e.wounds).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });

  it('una poción de evento con el cinturón lleno se pierde y lo dice', () => {
    const e = createExpedition(1);
    e.run.belt = [{ id: 'iron', spent: false }, { id: 'iron', spent: false }, { id: 'iron', spent: false }];
    const x = ev('abandoned_camp');
    const out = resolveChoice(e, x, 0);
    expect(out.lines.join(' ')).toMatch(/lleno/i);
  });

  it('la salida sin coste no cambia el estado', () => {
    const e = createExpedition(1);
    const x = ev('ghost_ferryman');
    const i = x.choices.findIndex((c) => c.effects.length === 0);
    const before = JSON.stringify([e.run.gold, e.run.mist, e.deck, e.run.champions]);
    resolveChoice(e, x, i);
    expect(JSON.stringify([e.run.gold, e.run.mist, e.deck, e.run.champions])).toBe(before);
  });
});

import { SHRINES } from '../../src/data/events';
import { NO_PERKS } from '../../src/engine/meta';
import { RELIC_LIST } from '../../src/data/relics';
import { maxHpFor } from '../../src/engine/gear';

describe('santuarios', () => {
  it('hay 3, con 3 opciones y una salida sin coste, y todas se pueden resolver', () => {
    expect(SHRINES).toHaveLength(3);
    for (const x of SHRINES) {
      expect(x.choices).toHaveLength(3);
      expect(x.choices.some((c) => c.effects.length === 0)).toBe(true);
      x.choices.forEach((_, i) => {
        const e = createExpedition(5);
        e.run.gold = 500;
        expect(() => resolveChoice(e, x, i), `${x.id}/${i}`).not.toThrow();
      });
    }
  });

  it('pickEvent distingue eventos y santuarios y no repite hasta agotar los de su tipo', () => {
    const e = createExpedition(9);
    const ids = SHRINES.map(() => pickEvent(e, 'shrine').id);
    expect(new Set(ids).size).toBe(SHRINES.length);
    expect(ids.every((id) => SHRINES.some((x) => x.id === id))).toBe(true);
    expect(pickEvent(e).id).not.toMatch(/^shrine_/);
    expect(SHRINES.map((x) => x.id)).toContain(pickEvent(e, 'shrine').id); // agotados: vuelve a empezar
  });

  it('el efecto «relic» da una reliquia no repetida y, si ya están todas, oro', () => {
    const e = createExpedition(5);
    const x = SHRINES[0];
    const out = resolveChoice(e, x, 0);
    expect(e.run.relics).toHaveLength(1);
    expect(out.lines.join(' ')).toMatch(/Nueva reliquia/);
    const f = createExpedition(5);
    f.run.relics = RELIC_LIST.map((r) => r.id);
    const gold = f.run.gold;
    expect(resolveChoice(f, x, 0).lines.join(' ')).toMatch(/todas las reliquias/);
    expect(f.run.gold).toBe(gold + 60);
    expect(f.run.relics).toHaveLength(RELIC_LIST.length);
  });

  it('«maxHpAll» sube la vida máxima y actual de los que están en pie, y sobrevive a heridas y gear', () => {
    const e = createExpedition(5);
    e.run.gold = 100;
    e.run.champions[1].downed = true;
    e.run.champions[1].hp = 0;
    const max = e.run.champions.map((c) => c.maxHp);
    resolveChoice(e, SHRINES[0], 1);
    expect(e.run.champions[0].maxHp).toBe(max[0] + 4);
    expect(e.run.champions[0].hp).toBe(max[0] + 4);
    expect(e.run.champions[1].hp).toBe(0); // el derribado no se cura
    e.wounds.leona = 1;
    expect(maxHpFor(e, 'leona')).toBe(Math.round(70 * 0.9) + 4);
  });

  it('las ventajas de una expedición no comparten objeto con la constante de «sin mejoras»', () => {
    const e = createExpedition(5);
    e.run.gold = 100;
    resolveChoice(e, SHRINES[0], 1);
    expect(e.perks.hp).toBe(4);
    expect(NO_PERKS.hp).toBe(0);
    expect(createExpedition(6).perks.hp).toBe(0);
  });
});
