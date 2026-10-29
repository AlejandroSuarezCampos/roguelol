import { describe, expect, it } from 'vitest';
import { CARD_LIST, CARDS, STARTER_DECK } from '../../src/data/cards';
import { CHAMPIONS } from '../../src/data/champions';
import { playCard } from '../../src/engine/cards';
import { createExpedition } from '../../src/engine/expedition';
import { championAvailable, newMeta, setParty, setupFor } from '../../src/engine/meta';
import type { ChampionId } from '../../src/engine/types';
import { playExpedition } from '../balance/bot';
import { ally, enemy, give, makeState, u } from './fixtures';

/** Los tiradores (ADC) del LoL. */
const ADCS: ChampionId[] = ['aphelios', 'ashe', 'caitlyn', 'draven', 'ezreal', 'jhin', 'jinx', 'kaisa', 'kalista', 'kogmaw', 'lucian', 'missfortune', 'nilah', 'samira', 'sivir', 'smolder', 'tristana', 'twitch', 'varus', 'vayne', 'xayah', 'zeri'];

describe('tiradores: datos', () => {
  it('son 22 y juegan en la parte de atrás', () => {
    expect(ADCS).toHaveLength(22);
    for (const id of ADCS) {
      expect(CHAMPIONS[id].sweetSpot, id).toEqual([3, 4]);
      expect(CHAMPIONS[id].startPos, id).toBeGreaterThanOrEqual(3);
      expect(CHAMPIONS[id].stats.ad, id).toBeGreaterThanOrEqual(45);
    }
  });

  for (const id of ADCS) {
    it(`${CHAMPIONS[id].name}: 20 cartas con mejora, 5 de mazo inicial, daño de sobra y bloqueado hasta desbloquearlo`, () => {
      const cards = CARD_LIST.filter((c) => c.owner === id);
      expect(cards).toHaveLength(20);
      expect(cards.every((c) => c.upgrade)).toBe(true);
      expect(cards.some((c) => c.rarity === 'epic')).toBe(true);
      expect(cards.filter((c) => c.effects.some((e) => e.type === 'damage')).length).toBeGreaterThanOrEqual(5);
      expect(STARTER_DECK.filter((c) => CARDS[c].owner === id)).toHaveLength(5);
      const m = newMeta();
      expect(championAvailable(m, id)).toBe(false);
      m.unlocked.push(`champion:${id}`);
      expect(championAvailable(m, id)).toBe(true);
    });
  }
});

describe('tiradores con su identidad del LoL', () => {
  const withAdc = (id: ChampionId) => {
    const s = makeState({ cards: CARDS });
    s.units = [ally('leona', 1, { hp: 20 }), ally('soraka', 2, { hp: 20 }), ally('lux', 3, { hp: 20 }), ally(id, 4, { hp: 20 }), enemy('e1', 1), enemy('e2', 2)];
    s.energy = 3;
    return s;
  };

  it('Jhin: Última función dispara cuatro veces (cuatro golpes)', () => {
    const s = withAdc('jhin');
    s.energy = 3;
    const [c] = give(s, 'jh7');
    playCard(s, c, 'e1');
    expect(30 - u(s, 'e1').hp).toBeGreaterThanOrEqual(4 * 6);
  });

  it('Kalista: las lanzas son Marcas y Desgarrar las gasta', () => {
    const s = withAdc('kalista');
    const [a, b] = give(s, 'kl1', 'kl2');
    playCard(s, a, 'e1');
    expect(u(s, 'e1').statuses.mark).toBe(1);
    playCard(s, b, 'e1');
    expect(u(s, 'e1').statuses.mark ?? 0).toBe(0);
  });

  it('Vayne: Tumbo cambia a Vayne de posición y Condena empuja y aturde', () => {
    const s = withAdc('vayne');
    s.units.find((x) => x.id === 'vayne')!.pos = 3;
    s.units.find((x) => x.id === 'lux')!.pos = 4;
    const [a, b] = give(s, 'vy1', 'vy4');
    playCard(s, a, 'e1');
    expect(u(s, 'vayne').pos).toBe(4);
    playCard(s, b, 'e1');
    expect([u(s, 'e1').statuses.stun, u(s, 'e1').pos]).toEqual([1, 2]);
  });

  it('Draven: sus Cargas son hachas y Doble hacha las gasta', () => {
    const s = withAdc('draven');
    const [a, b] = give(s, 'dr1', 'dr6');
    playCard(s, a, 'e1');
    expect(u(s, 'draven').statuses.charge).toBe(1);
    s.energy = 3;
    playCard(s, b, 'e1');
    expect(u(s, 'draven').statuses.charge ?? 0).toBe(0);
  });

  it('Aphelios: Severum le cura a él', () => {
    const s = withAdc('aphelios');
    u(s, 'aphelios').hp = 10;
    const [c] = give(s, 'ap2');
    playCard(s, c, 'e1');
    expect(u(s, 'aphelios').hp).toBe(13);
  });

  it('Lucian: Luz penetrante dispara dos veces; Dos revólveres, tres', () => {
    const s = withAdc('lucian');
    s.units.find((x) => x.id === 'lucian')!.pos = 3;
    s.units.find((x) => x.id === 'lux')!.pos = 4;
    const [a] = give(s, 'lc1');
    playCard(s, a, 'e1');
    const one = 30 - u(s, 'e1').hp;
    expect(one).toBeGreaterThanOrEqual(8);
    const [b] = give(s, 'lc5');
    s.energy = 3;
    playCard(s, b, 'e2');
    expect(30 - u(s, 'e2').hp).toBeGreaterThanOrEqual(15);
  });
});

describe('tiradores: expedición', () => {
  for (const id of ADCS) {
    it(`${CHAMPIONS[id].name} sustituye a Lux y el bot completa una expedición`, () => {
      const m = newMeta();
      m.unlocked.push(`champion:${id}`);
      setParty(m, ['leona', 'yasuo', id, 'soraka']);
      const e = createExpedition(5, 0, setupFor(m));
      expect(e.deck.filter((c) => CARDS[c].owner === id)).toHaveLength(5);
      expect(['victory', 'defeat']).toContain(playExpedition(e, 5).status);
    });
  }
});
