import { describe, expect, it } from 'vitest';
import { CARD_LIST, CARDS, STARTER_DECK } from '../../src/data/cards';
import { CHAMPIONS } from '../../src/data/champions';
import { playCard } from '../../src/engine/cards';
import { createExpedition } from '../../src/engine/expedition';
import { championAvailable, newMeta, setParty, setupFor } from '../../src/engine/meta';
import type { ChampionId } from '../../src/engine/types';
import { playExpedition } from '../balance/bot';
import { ally, enemy, give, makeState, u } from './fixtures';

/** Los campeones de la línea central del LoL. */
const MIDS: ChampionId[] = ['ahri', 'akali', 'akshan', 'anivia', 'annie', 'aurelionsol', 'azir', 'cassiopeia', 'corki', 'diana', 'ekko', 'fizz', 'galio', 'hwei', 'kassadin', 'katarina', 'leblanc', 'lissandra', 'malzahar', 'naafiri', 'neeko', 'orianna', 'qiyana', 'ryze', 'sylas', 'syndra', 'taliyah', 'talon', 'twistedfate', 'veigar', 'velkoz', 'vex', 'viktor', 'vladimir', 'xerath', 'yone', 'zed', 'ziggs', 'zoe', 'mel', 'aurora'];

describe('línea central: datos', () => {
  it('son 41', () => {
    expect(MIDS).toHaveLength(41);
  });

  for (const id of MIDS) {
    it(`${CHAMPIONS[id].name}: 8 cartas con mejora, 5 de mazo inicial, daño, defensa y bloqueado hasta desbloquearlo`, () => {
      const cards = CARD_LIST.filter((c) => c.owner === id);
      expect(cards).toHaveLength(8);
      expect(cards.every((c) => c.upgrade)).toBe(true);
      expect(cards.some((c) => c.rarity === 'epic')).toBe(true);
      expect(cards.filter((c) => c.effects.some((e) => e.type === 'damage')).length).toBeGreaterThanOrEqual(3);
      expect(STARTER_DECK.filter((c) => CARDS[c].owner === id)).toHaveLength(5);
      const m = newMeta();
      expect(championAvailable(m, id)).toBe(false);
      m.unlocked.push(`champion:${id}`);
      expect(championAvailable(m, id)).toBe(true);
    });
  }
});

describe('línea central con su identidad del LoL', () => {
  const withMid = (id: ChampionId, pos: 1 | 2 | 3 | 4 = 3) => {
    const s = makeState({ cards: CARDS });
    s.units = [ally('leona', 1, { hp: 20 }), ally('yasuo', 2, { hp: 20 }), ally(id, pos, { hp: 20 }), ally('soraka', 4, { hp: 20 }), enemy('e1', 1), enemy('e2', 2)];
    s.energy = 3;
    return s;
  };

  it('Zed: marca con Shuriken y la Marca de la muerte las gasta para un golpe enorme', () => {
    const s = withMid('zed', 2);
    s.units = s.units.filter((x) => x.id !== 'yasuo');
    s.energy = 4;
    const [a, b] = give(s, 'zed1', 'zed4');
    playCard(s, a, 'e1');
    expect(u(s, 'e1').statuses.mark).toBe(1);
    const before = u(s, 'e1').hp;
    playCard(s, b, 'e1');
    expect(u(s, 'e1').statuses.mark ?? 0).toBe(0);
    expect(before - u(s, 'e1').hp).toBeGreaterThanOrEqual(10 + 6);
  });

  it('Syndra: las esferas son Cargas y Poder desatado las gasta todas', () => {
    const s = withMid('syndra');
    u(s, 'syndra').statuses.charge = 3;
    const [c] = give(s, 'syn4');
    playCard(s, c, 'e1');
    expect(u(s, 'syndra').statuses.charge ?? 0).toBe(0);
    expect(30 - u(s, 'e1').hp).toBeGreaterThanOrEqual(8 + 15);
  });

  it('Sylas: Cadena arrastra al enemigo de atrás a primera fila y Rompecadenas, además, aturde', () => {
    const s = withMid('sylas', 2);
    s.units = s.units.filter((x) => x.id !== 'yasuo');
    const [a, b] = give(s, 'syl1', 'syl2');
    playCard(s, a, 'e2');
    expect(u(s, 'e2').pos).toBe(1);
    playCard(s, b, 'e1');
    expect([u(s, 'e1').pos, u(s, 'e1').statuses.stun]).toEqual([1, 1]);
  });

  it('Katarina: Loto de la muerte golpea tres veces a cada enemigo', () => {
    const s = withMid('katarina', 2);
    s.units = s.units.filter((x) => x.id !== 'yasuo');
    const [c] = give(s, 'kat4');
    playCard(s, c);
    for (const id of ['e1', 'e2']) expect(30 - u(s, id).hp, id).toBeGreaterThanOrEqual(3 * 5);
  });

  it('Ekko: Cronorruptura cura y protege a Ekko; Akshan: Venganza reanima a un aliado', () => {
    const s = withMid('ekko', 2);
    s.units = s.units.filter((x) => x.id !== 'yasuo');
    u(s, 'ekko').hp = 5;
    const [c] = give(s, 'ekk4');
    playCard(s, c);
    expect([u(s, 'ekko').hp, u(s, 'ekko').block]).toEqual([20, 10]);
    const t = withMid('akshan');
    t.units.find((x) => x.id === 'yasuo')!.downed = true;
    t.units.find((x) => x.id === 'yasuo')!.hp = 0;
    const [r] = give(t, 'aks6');
    playCard(t, r, 'yasuo');
    expect([u(t, 'yasuo').downed, u(t, 'yasuo').hp]).toEqual([false, 20]);
  });

  it('Galio: Entrada del héroe da bloqueo a todo el equipo', () => {
    const s = withMid('galio', 1);
    s.units = s.units.filter((x) => x.id !== 'leona');
    const [c] = give(s, 'gal4');
    playCard(s, c);
    for (const x of s.units.filter((y) => y.side === 'ally')) expect(x.block, x.id).toBe(12);
  });
});

describe('línea central: expedición', () => {
  for (const id of MIDS) {
    it(`${CHAMPIONS[id].name} entra en el equipo y el bot completa una expedición`, () => {
      const m = newMeta();
      m.unlocked.push(`champion:${id}`);
      const slot = CHAMPIONS[id].startPos <= 2 ? 1 : 2;
      const party: ChampionId[] = ['leona', 'yasuo', 'lux', 'soraka'];
      party[slot] = id;
      setParty(m, party);
      const e = createExpedition(5, 0, setupFor(m));
      expect(e.deck.filter((c) => CARDS[c].owner === id)).toHaveLength(5);
      expect(['victory', 'defeat']).toContain(playExpedition(e, 5).status);
    });
  }
});
