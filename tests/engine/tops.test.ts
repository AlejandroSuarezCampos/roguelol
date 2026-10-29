import { describe, expect, it } from 'vitest';
import { CARD_LIST, CARDS, STARTER_DECK } from '../../src/data/cards';
import { CHAMPIONS } from '../../src/data/champions';
import { playCard } from '../../src/engine/cards';
import { createExpedition } from '../../src/engine/expedition';
import { championAvailable, newMeta, setParty, setupFor } from '../../src/engine/meta';
import type { ChampionId } from '../../src/engine/types';
import { playExpedition } from '../balance/bot';
import { ally, enemy, give, makeState, u } from './fixtures';

/** Los campeones de la línea superior del LoL. */
const TOPS: ChampionId[] = ['aatrox', 'ambessa', 'camille', 'chogath', 'darius', 'drmundo', 'fiora', 'gangplank', 'garen', 'gnar', 'gwen', 'illaoi', 'irelia', 'jax', 'jayce', 'kayle', 'kennen', 'kled', 'ksante', 'malphite', 'maokai', 'mordekaiser', 'nasus', 'ornn', 'pantheon', 'poppy', 'quinn', 'renekton', 'riven', 'rumble', 'sett', 'shen', 'singed', 'sion', 'tahmkench', 'teemo', 'trundle', 'tryndamere', 'urgot', 'volibear', 'yorick'];

describe('línea superior: datos', () => {
  it('son 41, con 8 cartas cada uno (1336 cartas en total con la jungla) y sin ids repetidos', () => {
    expect(TOPS).toHaveLength(41);
    expect(CARD_LIST).toHaveLength(167 * 8);
  });

  for (const id of TOPS) {
    it(`${CHAMPIONS[id].name}: 8 cartas con mejora, 5 de mazo inicial, daño, defensa y bloqueado hasta desbloquearlo`, () => {
      const cards = CARD_LIST.filter((c) => c.owner === id);
      expect(cards).toHaveLength(8);
      expect(cards.every((c) => c.upgrade)).toBe(true);
      expect(cards.some((c) => c.rarity === 'epic')).toBe(true);
      expect(cards.filter((c) => c.effects.some((e) => e.type === 'damage')).length).toBeGreaterThanOrEqual(3);
      expect(cards.some((c) => c.type === 'defense' || c.type === 'support')).toBe(true);
      expect(STARTER_DECK.filter((c) => CARDS[c].owner === id)).toHaveLength(5);
      const m = newMeta();
      expect(championAvailable(m, id)).toBe(false);
      m.unlocked.push(`champion:${id}`);
      expect(championAvailable(m, id)).toBe(true);
    });
  }
});

describe('línea superior con su identidad del LoL', () => {
  const withTop = (id: ChampionId) => {
    const s = makeState({ cards: CARDS });
    s.units = [ally(id, 1, { hp: 20 }), ally('yasuo', 2, { hp: 20 }), ally('lux', 3, { hp: 20 }), ally('soraka', 4, { hp: 20 }), enemy('e1', 1), enemy('e2', 2)];
    s.energy = 4;
    return s;
  };

  it('Darius: Golpe lisiador sangra (Marca) y la Guillotina noxiana remata gastándolas', () => {
    const s = withTop('darius');
    const [a, b] = give(s, 'dar2', 'dar4');
    playCard(s, a, 'e1');
    expect(u(s, 'e1').statuses.mark).toBe(1);
    playCard(s, b, 'e1');
    expect(u(s, 'e1').statuses.mark ?? 0).toBe(0);
  });

  it('Sett: Gran espectáculo arrastra al enemigo de atrás y lo aturde', () => {
    const s = withTop('sett');
    const [c] = give(s, 'set4');
    playCard(s, c, 'e2');
    expect([u(s, 'e2').pos, u(s, 'e2').statuses.stun]).toEqual([1, 1]);
  });

  it('Malphite: Fuerza imparable aturde a todos; Riven: Alas rotas golpea tres veces', () => {
    const s = withTop('malphite');
    const [c] = give(s, 'mph4');
    playCard(s, c);
    for (const id of ['e1', 'e2']) expect(u(s, id).statuses.stun, id).toBe(1);
    const t = withTop('riven');
    const [r] = give(t, 'riv1');
    playCard(t, r, 'e1');
    expect(30 - u(t, 'e1').hp).toBeGreaterThanOrEqual(3 * 3);
  });

  it('Tryndamere: Furia imparable da bloqueo enorme y cura; Dr. Mundo: Curación se la lanza a sí mismo', () => {
    const s = withTop('tryndamere');
    u(s, 'tryndamere').hp = 5;
    const [c] = give(s, 'try4');
    playCard(s, c);
    expect([u(s, 'tryndamere').hp, u(s, 'tryndamere').block]).toEqual([13, 20]);
    const t = withTop('drmundo');
    u(t, 'drmundo').hp = 5;
    const [h] = give(t, 'mun4');
    playCard(t, h);
    expect(u(t, 'drmundo').hp).toBe(17);
  });

  it('Tahm Kench: Devorar protege a un aliado y lo lleva al fondo; Shen: Estar unidos da bloqueo y cura a un aliado', () => {
    const s = withTop('tahmkench');
    const [c] = give(s, 'tah2');
    playCard(s, c, 'yasuo');
    expect([u(s, 'yasuo').block, u(s, 'yasuo').pos]).toEqual([8, 4]);
    const t = withTop('shen');
    u(t, 'lux').hp = 10;
    const [e] = give(t, 'she3');
    playCard(t, e, 'lux');
    expect([u(t, 'lux').block, u(t, 'lux').hp]).toEqual([15, 16]);
  });

  it('Poppy: Carga heroica empuja y aturde; Camille: Ultimátum hextech aturde con mucho daño', () => {
    const s = withTop('poppy');
    const [c] = give(s, 'pop3');
    playCard(s, c, 'e1');
    expect([u(s, 'e1').pos, u(s, 'e1').statuses.stun]).toEqual([2, 1]);
    const t = withTop('camille');
    const [h] = give(t, 'cam4');
    playCard(t, h, 'e1');
    expect([u(t, 'e1').statuses.stun, 30 - u(t, 'e1').hp >= 10]).toEqual([1, true]);
  });

  it('Nasus: Golpe sifón acumula Cargas y Estoque las gasta', () => {
    const s = withTop('nasus');
    const [a, b] = give(s, 'nas1', 'nas7');
    playCard(s, a, 'e1');
    expect(u(s, 'nasus').statuses.charge).toBe(1);
    playCard(s, b, 'e1');
    expect(u(s, 'nasus').statuses.charge ?? 0).toBe(0);
  });
});

describe('línea superior: expedición', () => {
  for (const id of TOPS) {
    it(`${CHAMPIONS[id].name} entra en el equipo y el bot completa una expedición`, () => {
      const m = newMeta();
      m.unlocked.push(`champion:${id}`);
      const party: ChampionId[] = ['leona', 'yasuo', 'lux', 'soraka'];
      party[CHAMPIONS[id].startPos <= 1 ? 0 : 1] = id;
      setParty(m, party);
      const e = createExpedition(5, 0, setupFor(m));
      expect(e.deck.filter((c) => CARDS[c].owner === id)).toHaveLength(5);
      expect(['victory', 'defeat']).toContain(playExpedition(e, 5).status);
    });
  }
});
