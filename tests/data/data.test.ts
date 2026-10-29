import { describe, expect, it } from 'vitest';
import { CARD_LIST, CARDS, STARTER_DECK } from '../../src/data/cards';
import { CHAMPION_IDS, CHAMPIONS } from '../../src/data/champions';
import { ENCOUNTERS, ENEMIES } from '../../src/data/enemies';

describe('cartas', () => {
  it('hay 20 cartas por campeón con ids únicos', () => {
    expect(CARD_LIST).toHaveLength(20 * CHAMPION_IDS.length);
    expect(new Set(CARD_LIST.map((c) => c.id)).size).toBe(CARD_LIST.length);
    for (const id of CHAMPION_IDS) expect(CARD_LIST.filter((c) => c.owner === id)).toHaveLength(20);
  });

  it('las 20 cartas de cada campeón son distintas: otro nombre, otros efectos y las tres rarezas', () => {
    for (const id of CHAMPION_IDS) {
      const own = CARD_LIST.filter((c) => c.owner === id);
      expect(new Set(own.map((c) => c.name.toLowerCase())).size, `${id} nombres`).toBe(20);
      expect(new Set(own.map((c) => JSON.stringify([c.cost, c.type, c.target, c.effects]))).size, `${id} efectos`).toBe(20);
      const by = (r: string) => own.filter((c) => c.rarity === r).length;
      expect(by('common'), `${id} comunes`).toBeGreaterThanOrEqual(8);
      expect(by('rare'), `${id} raras`).toBeGreaterThanOrEqual(6);
      expect(by('epic'), `${id} épicas`).toBeGreaterThanOrEqual(3);
      expect(own.filter((c) => c.type === 'attack' || c.type === 'skill' || c.type === 'control').length, `${id} ofensivas`).toBeGreaterThanOrEqual(5);
      expect(own.filter((c) => c.type === 'defense' || c.type === 'support').length, `${id} defensivas`).toBeGreaterThanOrEqual(3);
    }
  });

  it('las cartas épicas son más caras y más potentes que las comunes (coste medio)', () => {
    const avg = (r: string) => {
      const l = CARD_LIST.filter((c) => c.rarity === r);
      return l.reduce((a, c) => a + c.cost, 0) / l.length;
    };
    expect(avg('epic')).toBeGreaterThan(avg('rare'));
    expect(avg('rare')).toBeGreaterThan(avg('common'));
  });

  it('las mejoras nunca empeoran la carta: más números o un coste menor', () => {
    for (const c of CARD_LIST) {
      const u = c.upgrade!;
      expect(u, c.id).toBeDefined();
      expect(u.cost === undefined || u.cost < c.cost, c.id).toBe(true);
      if (u.effects) expect(JSON.stringify(u.effects) !== JSON.stringify(c.effects), c.id).toBe(true);
    }
  });

  it('cada carta tiene efectos, coste válido y un objetivo coherente con sus efectos', () => {
    for (const c of CARD_LIST) {
      expect(c.effects.length, c.id).toBeGreaterThan(0);
      expect(c.cost, c.id).toBeGreaterThanOrEqual(0);
      expect(c.cost, c.id).toBeLessThanOrEqual(3);
      expect(c.text.length, c.id).toBeGreaterThan(0);
      if (c.positionBonus) expect(c.idealPositions?.length, c.id).toBeGreaterThan(0);
      if (c.effects.some((e) => e.type === 'revive')) expect(c.target, c.id).toBe('ally');
    }
  });

  it('cada campeón puede hacer algo útil: ataque, defensa o apoyo', () => {
    for (const id of CHAMPION_IDS) {
      const own = CARD_LIST.filter((c) => c.owner === id);
      expect(own.some((c) => c.type === 'attack' || c.type === 'skill'), id).toBe(true);
      expect(own.some((c) => c.type === 'defense' || c.type === 'support'), id).toBe(true);
    }
  });
});

describe('mazo inicial', () => {
  it('son 5 cartas por campeón y todas existen', () => {
    expect(STARTER_DECK).toHaveLength(5 * CHAMPION_IDS.length);
    for (const id of STARTER_DECK) expect(CARDS[id], id).toBeDefined();
    for (const champ of CHAMPION_IDS) expect(STARTER_DECK.filter((id) => CARDS[id].owner === champ)).toHaveLength(5);
  });
});

describe('campeones y enemigos', () => {
  it('los campeones tienen vida, color y crisis', () => {
    for (const id of CHAMPION_IDS) {
      const c = CHAMPIONS[id];
      expect(c.maxHp).toBeGreaterThan(0);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.color).toMatch(/^#/);
    }
  });

  it('el punto fuerte de cada campeón coincide con las posiciones ideales de sus cartas', () => {
    for (const id of CHAMPION_IDS) {
      const ideal = new Set(CARD_LIST.filter((c) => c.owner === id).flatMap((c) => c.idealPositions ?? []));
      for (const p of CHAMPIONS[id].sweetSpot) expect(ideal.has(p), `${id} ${p}`).toBe(true);
    }
  });

  it('cada encuentro usa enemigos definidos, en posiciones válidas y sin repetir', () => {
    for (const [kind, list] of Object.entries(ENCOUNTERS)) {
      expect(list.length, kind).toBeGreaterThan(0);
      for (const enc of list) {
        const pos = enc.map((e) => e.pos);
        expect(new Set(pos).size, kind).toBe(pos.length);
        for (const e of enc) {
          expect(ENEMIES[e.defId], e.defId).toBeDefined();
          expect([1, 2, 3, 4]).toContain(e.pos);
        }
      }
    }
  });

  it('las intenciones apuntan a posiciones 1–4 y los guiones no están vacíos', () => {
    for (const d of Object.values(ENEMIES)) {
      expect(d.script.length, d.id).toBeGreaterThan(0);
      for (const i of d.script) if ('target' in i) expect([1, 2, 3, 4]).toContain(i.target);
    }
  });
});

describe('Marcas y Cargas', () => {
  it('quien las aplica tiene cartas que las gastan, y al revés (por sí solas no hacen nada)', () => {
    for (const id of CHAMPION_IDS) {
      const eff = CARD_LIST.filter((c) => c.owner === id).flatMap((c) => c.effects);
      const apps = (st: string) => eff.filter((e) => e.type === 'applyStatus' && e.status === st).length;
      const cons = (st: string) => eff.filter((e) => (e.type === 'damage' && e.consumeStatus?.status === st) || (e.type === 'convertStatus' && e.status === st)).length;
      for (const st of ['mark', 'charge']) {
        expect(apps(st) > 0 && cons(st) === 0, `${id} aplica ${st} y nadie lo gasta`).toBe(false);
        expect(cons(st) > 0 && apps(st) === 0, `${id} gasta ${st} sin aplicarlo`).toBe(false);
      }
    }
  });
});
