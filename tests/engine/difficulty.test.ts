import { describe, expect, it } from 'vitest';
import { CARDS } from '../../src/data/cards';
import { DIFFICULTIES } from '../../src/data/difficulty';
import { ENEMIES } from '../../src/data/enemies';
import { CONFIG } from '../../src/engine/config';
import { combatFromExpedition, createExpedition, finishCombat, generateMap, rest, type Expedition } from '../../src/engine/expedition';
import { equip } from '../../src/engine/gear';
import { Rng } from '../../src/engine/rng';
import { openShop, removalPrice } from '../../src/engine/shop';
import { applyDamage } from '../../src/engine/units';

const N = DIFFICULTIES.nightmare;

const won = (e: Expedition, kind: 'combat' | 'elite' | 'boss' = 'combat') => {
  const s = combatFromExpedition(e, kind);
  for (const u of s.units) if (u.side === 'enemy') { u.hp = 0; u.downed = true; }
  s.outcome = 'won';
  return s;
};

describe('definiciones', () => {
  it('Pesadilla es más dura que Normal en cada modificador', () => {
    const n = DIFFICULTIES.normal;
    expect(n.permadeath).toBe(false);
    expect(N.permadeath).toBe(true);
    expect(N.enemyHp).toBeGreaterThan(n.enemyHp);
    expect(N.enemyAttack).toBeGreaterThan(n.enemyAttack);
    expect(N.restWeight).toBeLessThan(n.restWeight);
    expect(N.restHeal).toBeLessThan(n.restHeal);
    expect(N.gold).toBeLessThan(n.gold);
    expect(N.potionDrop).toBeLessThan(n.potionDrop);
    expect(N.shopPrice).toBeGreaterThan(n.shopPrice);
  });

  it('una expedición es Normal salvo que se pida otra', () => {
    expect(createExpedition(1).difficulty).toBe('normal');
    expect(createExpedition(1, 'nightmare').difficulty).toBe('nightmare');
  });
});

describe('modificadores', () => {
  it('Pesadilla escala vida, ataque y bloqueo de los enemigos; Normal no toca nada', () => {
    const normal = combatFromExpedition(createExpedition(4), 'combat');
    const hard = combatFromExpedition(createExpedition(4, 'nightmare'), 'combat');
    const foe = (s: typeof normal) => s.units.filter((u) => u.side === 'enemy')[0];
    expect(foe(hard).maxHp).toBe(Math.round(foe(normal).maxHp * N.enemyHp));
    const def = (s: typeof normal) => s.enemyDefs[s.enemyOf[foe(s).id]];
    const base = ENEMIES[normal.enemyOf[foe(normal).id]];
    expect(def(normal).script).toEqual(base.script);
    base.script.forEach((i, k) => {
      const h = def(hard).script[k];
      if (i.kind === 'attack' || i.kind === 'block') expect((h as typeof i).amount).toBe(Math.round(i.amount * N.enemyAttack));
      else expect(h).toEqual(i);
    });
  });

  it('el escalado no modifica los datos globales de enemigos', () => {
    const before = JSON.stringify(ENEMIES);
    combatFromExpedition(createExpedition(4, 'nightmare'), 'elite');
    expect(JSON.stringify(ENEMIES)).toBe(before);
  });

  it('el mapa de Pesadilla tiene menos descansos a mitad de camino, pero conserva el previo al jefe', () => {
    const rests = (w: number) => {
      let n = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const m = generateMap(new Rng(seed), w);
        expect(m.nodes.filter((x) => x.floor === CONFIG.expedition.floors - 2).every((x) => x.type === 'rest')).toBe(true);
        n += m.nodes.filter((x) => x.type === 'rest' && x.floor < CONFIG.expedition.floors - 2).length;
      }
      return n;
    };
    expect(rests(N.restWeight)).toBeLessThan(rests(1) * 0.8);
  });

  it('el descanso cura menos', () => {
    const e = createExpedition(3, 'nightmare');
    e.run.champions[0].hp = 10;
    rest(e, 'heal');
    expect(e.run.champions[0].hp).toBe(10 + Math.floor(e.run.champions[0].maxHp * N.restHeal));
  });

  it('el oro del botín baja y el comerciante sube sus precios', () => {
    const normal = finishCombat(createExpedition(5), won(createExpedition(5)), 'combat')!;
    const e = createExpedition(5, 'nightmare');
    const hard = finishCombat(e, won(e), 'combat')!;
    expect(hard.gold).toBeLessThan(normal.gold);
    const shopN = openShop(createExpedition(5));
    const eh = createExpedition(5, 'nightmare');
    const shopH = openShop(eh);
    expect(shopH.cards[0].price).toBe(Math.round(shopN.cards[0].price * N.shopPrice));
    expect(removalPrice(eh)).toBe(Math.round(CONFIG.shop.removeCard * N.shopPrice));
  });

  it('suelta menos pociones con el tiempo', () => {
    let normal = 0, hard = 0;
    for (let i = 0; i < 300; i++) {
      const a = createExpedition(i);
      if (finishCombat(a, won(a), 'combat')!.potion) normal++;
      const b = createExpedition(i, 'nightmare');
      if (finishCombat(b, won(b), 'combat')!.potion) hard++;
    }
    expect(hard).toBeLessThan(normal * 0.8);
  });
});

describe('muerte permanente', () => {
  const downLux = (s: ReturnType<typeof won>) => {
    const lux = s.units.find((u) => u.id === 'lux')!;
    applyDamage(s, lux, 9999);
  };

  it('en Normal, el derribado sobrevive con una herida grave', () => {
    const e = createExpedition(2);
    const s = won(e);
    downLux(s);
    finishCombat(e, s, 'combat');
    expect(e.run.champions.map((c) => c.id)).toContain('lux');
    expect(e.wounds.lux).toBe(1);
    expect(e.dead).toEqual([]);
  });

  it('en Pesadilla, el que sigue derribado muere: sale del equipo, deja su gear y se llevan sus cartas', () => {
    const e = createExpedition(2, 'nightmare');
    e.inventory.push('rabadon');
    equip(e, 'lux', 'rabadon');
    const deckBefore = e.deck.length;
    const luxCards = e.deck.filter((id) => CARDS[id].owner === 'lux').length;
    const s = won(e);
    downLux(s);
    finishCombat(e, s, 'combat');
    expect(e.run.champions.map((c) => c.id)).not.toContain('lux');
    expect(e.dead).toEqual(['lux']);
    expect(e.inventory).toContain('rabadon');
    expect(e.deck).toHaveLength(deckBefore - luxCards);
    expect(e.deck.every((id) => CARDS[id].owner !== 'lux')).toBe(true);
    expect(e.status).toBe('active');
  });

  it('el reanimado en combate sobrevive pero con una herida grave', () => {
    const e = createExpedition(2, 'nightmare');
    const s = won(e);
    downLux(s);
    const lux = s.units.find((u) => u.id === 'lux')!;
    lux.downed = false;
    lux.hp = 20; // reanimado
    finishCombat(e, s, 'combat');
    expect(e.run.champions.map((c) => c.id)).toContain('lux');
    expect(e.wounds.lux).toBe(1);
    expect(e.run.champions.find((c) => c.id === 'lux')!.hp).toBeGreaterThan(0);
  });

  it('el combate recuerda quién cayó, aunque luego se reanime', () => {
    const e = createExpedition(2);
    const s = combatFromExpedition(e, 'combat');
    expect(s.fallen).toEqual([]);
    applyDamage(s, s.units.find((u) => u.id === 'soraka')!, 9999);
    applyDamage(s, s.units.find((u) => u.id === 'soraka')!, 9999);
    expect(s.fallen).toEqual(['soraka']);
  });

  it('si mueren los cuatro, derrota', () => {
    const e = createExpedition(2, 'nightmare');
    const s = won(e);
    for (const u of s.units) if (u.side === 'ally') applyDamage(s, u, 9999);
    s.outcome = 'won'; // victoria por daño simultáneo: todos caídos igualmente
    finishCombat(e, s, 'combat');
    expect(e.run.champions).toHaveLength(0);
    expect(e.status).toBe('defeat');
  });

  it('el siguiente combate se juega con quien queda, sin el muerto', () => {
    const e = createExpedition(2, 'nightmare');
    const s = won(e);
    downLux(s);
    finishCombat(e, s, 'combat');
    const next = combatFromExpedition(e, 'combat');
    expect(next.units.filter((u) => u.side === 'ally').map((u) => u.id)).not.toContain('lux');
    expect(next.hand.every((c) => CARDS[c.defId].owner !== 'lux')).toBe(true);
  });

  it('no se puede equipar a un campeón muerto', () => {
    const e = createExpedition(2, 'nightmare');
    const s = won(e);
    downLux(s);
    finishCombat(e, s, 'combat');
    e.inventory.push('rabadon');
    expect(() => equip(e, 'lux', 'rabadon')).toThrow(/muerto/i);
  });
});
