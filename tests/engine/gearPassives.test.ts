import { describe, expect, it } from 'vitest';
import { GEAR_LIST } from '../../src/data/gear';
import { playCard } from '../../src/engine/cards';
import { endTeamTurn } from '../../src/engine/combat';
import { combatFromExpedition, createExpedition, finishCombat, type Expedition } from '../../src/engine/expedition';
import { equip } from '../../src/engine/gear';
import { processRelics } from '../../src/engine/relics';
import { applyDamage } from '../../src/engine/units';
import { CARDS, SeqRng, give, makeState, u } from './fixtures';

describe('datos', () => {
  it('todos los raros y legendarios tienen pasiva o desventaja con texto, y los comunes no', () => {
    for (const g of GEAR_LIST) {
      if (g.rarity === 'common') expect(g.passive ?? g.drawback, g.id).toBeUndefined();
      else expect((g.passive ?? g.drawback)?.text, g.id).toBeTruthy();
    }
    expect(GEAR_LIST.filter((g) => g.drawback).length).toBeGreaterThanOrEqual(2);
  });
});

describe('pasivas en combate', () => {
  it('Malla de espinas devuelve daño al atacante; sin ella, no', () => {
    const s = makeState({ gear: [{ wearer: 'leona', gearId: 'thornmail' }], intents: { e1: [{ kind: 'attack', amount: 5, target: 1 }], e2: [] } });
    s.enemyDefs = { ...s.enemyDefs, wolf: { ...s.enemyDefs.wolf, script: [{ kind: 'attack', amount: 5, target: 1 }] } };
    endTeamTurn(s);
    expect(u(s, 'e1').hp).toBe(26);
    const t = makeState({ intents: { e1: [{ kind: 'attack', amount: 5, target: 1 }], e2: [] } });
    endTeamTurn(t);
    expect(u(t, 'e1').hp).toBe(30);
  });

  it('solo reacciona a su portador: un golpe a otro aliado no dispara las espinas de Leona', () => {
    const s = makeState({ gear: [{ wearer: 'leona', gearId: 'thornmail' }], intents: { e1: [{ kind: 'attack', amount: 5, target: 2 }], e2: [] } });
    endTeamTurn(s);
    expect(u(s, 'e1').hp).toBe(30);
  });

  it('Filo infinito da Carga al hacer crítico y Lord Dominik añade daño y estrés', () => {
    const s = makeState({ gear: [{ wearer: 'yasuo', gearId: 'infinity' }, { wearer: 'yasuo', gearId: 'dominik' }] });
    s.cards = { ...CARDS, cut: { id: 'cut', name: 'Corte', owner: 'yasuo', cost: 1, type: 'attack', target: 'enemy', rarity: 'common', keywords: [], text: 'Inflige 4.', effects: [{ type: 'damage', amount: 4, damageType: 'true', canCrit: true }] } };
    u(s, 'yasuo').stats.critChance = 1;
    s.rng = new SeqRng([0]);
    const [id] = give(s, 'cut');
    playCard(s, id, 'e1');
    expect(u(s, 'yasuo').statuses.charge).toBe(1);
    expect(u(s, 'e1').hp).toBe(30 - 6 - 6);
    expect(u(s, 'yasuo').stress).toBe(3);
  });

  it('Sombrero de Rabadon: cada carta de su portador le da estrés (desventaja)', () => {
    const s = makeState({ gear: [{ wearer: 'lux', gearId: 'rabadon' }] });
    const [id] = give(s, 'bind');
    playCard(s, id, 'e1');
    expect(u(s, 'lux').stress).toBe(2);
  });

  it('Ángel de la guarda levanta al portador una vez por expedición', () => {
    const s = makeState({ gear: [{ wearer: 'soraka', gearId: 'guardian' }] });
    applyDamage(s, u(s, 'soraka'), 999);
    processRelics(s);
    expect(u(s, 'soraka').downed).toBe(false);
    expect(u(s, 'soraka').hp).toBe(Math.ceil(u(s, 'soraka').maxHp * 0.3));
    expect(s.spentGear).toEqual(['soraka:guardian:p']);
    applyDamage(s, u(s, 'soraka'), 999);
    processRelics(s);
    expect(u(s, 'soraka').downed).toBe(true);
  });
});

describe('en la expedición', () => {
  const win = (e: Expedition) => {
    const s = combatFromExpedition(e, 'combat');
    for (const x of s.units) if (x.side === 'enemy') { x.hp = 0; x.downed = true; }
    s.outcome = 'won';
    return s;
  };

  it('el combate recibe el gear equipado y lo gastado vuelve a la expedición', () => {
    const e = createExpedition(4);
    e.inventory.push('guardian');
    equip(e, 'lux', 'guardian');
    const s = win(e);
    expect(s.gear).toEqual([{ wearer: 'lux', gearId: 'guardian' }]);
    s.spentGear.push('lux:guardian:p');
    finishCombat(e, s, 'combat');
    expect(e.spentGear).toEqual(['lux:guardian:p']);
    expect(combatFromExpedition(e, 'combat').spentGear).toEqual(['lux:guardian:p']);
  });

  it('Warmog cura a su portador al ganar', () => {
    const e = createExpedition(4);
    e.inventory.push('warmog');
    equip(e, 'leona', 'warmog');
    const leona = e.run.champions.find((c) => c.id === 'leona')!;
    const s = win(e);
    s.units.find((x) => x.id === 'leona')!.hp = 20;
    const r = finishCombat(e, s, 'combat')!;
    expect(leona.hp).toBe(32);
    expect(r.relicNotes).toContain('Armadura de Warmog: +12 de vida a Leona');
  });
});

describe('catálogo de objetos', () => {
  it('hay 60 objetos con ids y iconos distintos, y cada rareza tiene su peso', () => {
    expect(GEAR_LIST).toHaveLength(60);
    expect(new Set(GEAR_LIST.map((g) => g.itemId)).size).toBe(GEAR_LIST.length);
    for (const r of ['common', 'rare', 'legendary'] as const) expect(GEAR_LIST.filter((g) => g.rarity === r).length, r).toBeGreaterThanOrEqual(10);
  });

  it('el portador de cualquier objeto sobrevive a un turno entero (jugar cartas, recibir golpes, acabar turno) sin errores', () => {
    for (const g of GEAR_LIST) {
      const s = makeState({ gear: [{ wearer: 'leona', gearId: g.id }, { wearer: 'yasuo', gearId: g.id }], intents: { e1: [{ kind: 'attack', amount: 5, target: 1 }], e2: [{ kind: 'attack', amount: 5, target: 2 }] } });
      expect(() => endTeamTurn(s), g.id).not.toThrow();
    }
  });
});
