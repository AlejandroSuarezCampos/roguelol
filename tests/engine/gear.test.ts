import { describe, expect, it } from 'vitest';
import { GEAR, GEAR_LIST } from '../../src/data/gear';
import { CHAMPIONS } from '../../src/data/champions';
import { CONFIG } from '../../src/engine/config';
import { combatFromExpedition, createExpedition, claimGear, finishCombat } from '../../src/engine/expedition';
import { equip, finalStatsFor, maxHpFor, syncMaxHp, unequip } from '../../src/engine/gear';
import { DEFAULT_STATS } from '../../src/engine/stats';
import type { StatBlock } from '../../src/engine/types';

const champ = (e: ReturnType<typeof createExpedition>, id: string) => e.run.champions.find((c) => c.id === id)!;

describe('datos de gear', () => {
  it('hay 12 objetos únicos con slot, rareza y alguna ventaja', () => {
    expect(GEAR_LIST).toHaveLength(12);
    expect(new Set(GEAR_LIST.map((g) => g.id)).size).toBe(12);
    expect(GEAR_LIST.filter((g) => g.slot === 'weapon').length).toBeGreaterThanOrEqual(4);
    expect(GEAR_LIST.filter((g) => g.slot === 'armor').length).toBeGreaterThanOrEqual(4);
    for (const g of GEAR_LIST) {
      expect(['common', 'rare', 'legendary']).toContain(g.rarity);
      for (const k of Object.keys(g.stats)) expect(k in DEFAULT_STATS, `${g.id}.${k}`).toBe(true);
      expect(Object.keys(g.stats).length + (g.hp ? 1 : 0), g.id).toBeGreaterThan(0);
      expect(g.itemId).toBeGreaterThan(0);
    }
  });
});

describe('equipar', () => {
  it('equipar saca el objeto del inventario, lo coloca en su slot y devuelve el anterior', () => {
    const e = createExpedition(1);
    e.inventory.push('infinity', 'guinsoo');
    equip(e, 'yasuo', 'infinity');
    expect(e.gear.yasuo.weapon).toBe('infinity');
    expect(e.inventory).toEqual(['guinsoo']);
    equip(e, 'yasuo', 'guinsoo');
    expect(e.gear.yasuo.weapon).toBe('guinsoo');
    expect(e.inventory).toEqual(['infinity']);
  });

  it('rechaza lo que no está en el inventario', () => {
    const e = createExpedition(1);
    expect(() => equip(e, 'lux', 'rabadon')).toThrow(/inventario/i);
    expect(() => equip(e, 'lux', 'nope')).toThrow();
  });

  it('desequipar devuelve el objeto al inventario', () => {
    const e = createExpedition(1);
    e.inventory.push('rabadon');
    equip(e, 'lux', 'rabadon');
    unequip(e, 'lux', 'weapon');
    expect(e.gear.lux.weapon).toBeNull();
    expect(e.inventory).toEqual(['rabadon']);
    expect(() => unequip(e, 'lux', 'weapon')).toThrow(/nada/i);
  });

  it('no se puede equipar ni desequipar en combate', () => {
    const e = createExpedition(1);
    e.inventory.push('rabadon');
    e.inCombat = true;
    expect(() => equip(e, 'lux', 'rabadon')).toThrow(/combate/i);
  });
});

describe('estadísticas finales', () => {
  it('suman el gear a la base y al daño crítico base', () => {
    const e = createExpedition(1);
    e.inventory.push('infinity');
    equip(e, 'yasuo', 'infinity');
    const s = finalStatsFor(e, 'yasuo');
    const base = CHAMPIONS.yasuo.stats as Partial<StatBlock>;
    expect(s.ad).toBe((base.ad ?? 0) + GEAR.infinity.stats.ad!);
    expect(s.critChance).toBeCloseTo((base.critChance ?? 0) + GEAR.infinity.stats.critChance!);
    expect(s.critDamage).toBeCloseTo(DEFAULT_STATS.critDamage + GEAR.infinity.stats.critDamage!);
  });

  it('el combate recibe esas mismas estadísticas', () => {
    const e = createExpedition(1);
    e.inventory.push('rabadon');
    equip(e, 'lux', 'rabadon');
    const s = combatFromExpedition(e, 'combat');
    expect(s.units.find((u) => u.id === 'lux')!.stats).toEqual(finalStatsFor(e, 'lux'));
    expect(s.units.find((u) => u.id === 'lux')!.stats.ap).toBe(CHAMPIONS.lux.stats.ap! + GEAR.rabadon.stats.ap!);
  });
});

describe('vida máxima', () => {
  it('base × heridas + vida del gear', () => {
    const e = createExpedition(1);
    e.wounds.lux = 1;
    e.inventory.push('warmog');
    equip(e, 'lux', 'warmog');
    expect(maxHpFor(e, 'lux')).toBe(Math.round(CHAMPIONS.lux.maxHp * (1 - CONFIG.expedition.wound.maxHpLoss)) + GEAR.warmog.hp!);
    expect(champ(e, 'lux').maxHp).toBe(maxHpFor(e, 'lux'));
  });

  it('equipar vida sube también la vida actual; desequiparla recorta al máximo', () => {
    const e = createExpedition(1);
    champ(e, 'leona').hp = 50;
    e.inventory.push('warmog');
    equip(e, 'leona', 'warmog');
    expect(champ(e, 'leona').hp).toBe(50 + GEAR.warmog.hp!);
    champ(e, 'leona').hp = champ(e, 'leona').maxHp;
    unequip(e, 'leona', 'armor');
    expect(champ(e, 'leona').maxHp).toBe(CHAMPIONS.leona.maxHp);
    expect(champ(e, 'leona').hp).toBe(CHAMPIONS.leona.maxHp);
  });

  it('desequipar vida nunca deja a un campeón vivo en 0', () => {
    const e = createExpedition(1);
    e.inventory.push('warmog');
    equip(e, 'soraka', 'warmog');
    champ(e, 'soraka').hp = 5;
    unequip(e, 'soraka', 'armor');
    expect(champ(e, 'soraka').hp).toBeGreaterThanOrEqual(1);
  });

  it('syncMaxHp recalcula tras una herida sin tocar la vida actual por debajo del máximo', () => {
    const e = createExpedition(1);
    champ(e, 'yasuo').hp = 20;
    e.wounds.yasuo = 2;
    syncMaxHp(e, champ(e, 'yasuo'));
    expect(champ(e, 'yasuo').maxHp).toBe(Math.round(CHAMPIONS.yasuo.maxHp * 0.8));
    expect(champ(e, 'yasuo').hp).toBe(20);
  });
});

describe('botín de gear', () => {
  const won = (seed: number, kind: 'combat' | 'elite' | 'boss') => {
    const e = createExpedition(seed);
    const s = combatFromExpedition(e, kind);
    for (const u of s.units) if (u.side === 'enemy') { u.hp = 0; u.downed = true; }
    s.outcome = 'won';
    return { e, r: finishCombat(e, s, kind)! };
  };

  it('la élite siempre ofrece 3 objetos distintos', () => {
    for (let i = 0; i < 20; i++) {
      const { r } = won(i, 'elite');
      expect(r.gear).toHaveLength(3);
      expect(new Set(r.gear).size).toBe(3);
    }
  });

  it('el jefe ofrece 3 objetos raros o legendarios', () => {
    for (let i = 0; i < 10; i++) {
      const { r } = won(i, 'boss');
      expect(r.gear).toHaveLength(3);
      for (const id of r.gear!) expect(GEAR[id].rarity).not.toBe('common');
    }
  });

  it('un combate normal ofrece gear solo a veces (~20 %)', () => {
    let n = 0;
    for (let i = 0; i < 300; i++) if (won(i, 'combat').r.gear) n++;
    expect(n).toBeGreaterThan(30);
    expect(n).toBeLessThan(100);
  });

  it('claimGear añade al inventario y acepta omitir', () => {
    const e = createExpedition(1);
    claimGear(e, 'titanic');
    expect(e.inventory).toEqual(['titanic']);
    claimGear(e, null);
    expect(e.inventory).toHaveLength(1);
    expect(() => claimGear(e, 'nope')).toThrow();
  });
});
