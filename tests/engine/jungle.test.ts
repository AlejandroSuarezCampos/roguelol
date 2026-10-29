import { describe, expect, it } from 'vitest';
import { CARD_LIST, CARDS, STARTER_DECK } from '../../src/data/cards';
import { CHAMPIONS } from '../../src/data/champions';
import { playCard } from '../../src/engine/cards';
import { createExpedition } from '../../src/engine/expedition';
import { championAvailable, newMeta, setParty, setupFor } from '../../src/engine/meta';
import type { ChampionId } from '../../src/engine/types';
import { playExpedition } from '../balance/bot';
import { ally, enemy, give, makeState, u } from './fixtures';

/** Los campeones de la jungla del LoL. */
const JUNGLE: ChampionId[] = ['amumu', 'belveth', 'briar', 'elise', 'evelynn', 'fiddlesticks', 'gragas', 'graves', 'hecarim', 'ivern', 'jarvaniv', 'karthus', 'kayn', 'khazix', 'kindred', 'leesin', 'lillia', 'masteryi', 'nidalee', 'nocturne', 'nunu', 'olaf', 'rammus', 'reksai', 'rengar', 'sejuani', 'shaco', 'shyvana', 'skarner', 'udyr', 'vi', 'viego', 'warwick', 'monkeyking', 'xinzhao', 'zac'];

describe('jungla: datos', () => {
  it('son 36 y hay 167 campeones con 1336 cartas en total', () => {
    expect(JUNGLE).toHaveLength(36);
    expect(CARD_LIST).toHaveLength(167 * 8);
  });

  for (const id of JUNGLE) {
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

describe('jungla con su identidad del LoL', () => {
  const withJg = (id: ChampionId) => {
    const s = makeState({ cards: CARDS });
    s.units = [ally(id, 1, { hp: 20 }), ally('yasuo', 2, { hp: 20 }), ally('lux', 3, { hp: 20 }), ally('soraka', 4, { hp: 20 }), enemy('e1', 1), enemy('e2', 2)];
    s.energy = 4;
    return s;
  };

  it('Amumu: Lanzar vendas arrastra al enemigo de atrás a primera fila', () => {
    const s = withJg('amumu');
    const [c] = give(s, 'amu1');
    playCard(s, c, 'e2');
    expect([u(s, 'e2').pos, u(s, 'e1').pos]).toEqual([1, 2]);
  });

  it('Briar, Vi y Skarner: sus definitivas arrastran al frente y aturden', () => {
    for (const [id, card] of [['briar', 'bri4'], ['vi', 'vii4'], ['skarner', 'ske4']] as const) {
      const s = withJg(id);
      s.energy = 3;
      const [c] = give(s, card);
      playCard(s, c, 'e2');
      expect([u(s, 'e2').pos, u(s, 'e2').statuses.stun], id).toEqual([1, 1]);
    }
  });

  it('Rengar: Salvajismo da Ferocidad (Cargas) y Cacería las gasta con crítico', () => {
    const s = withJg('rengar');
    const [a, b] = give(s, 'rgr1', 'rgr4');
    playCard(s, a, 'e1');
    expect(u(s, 'rengar').statuses.charge).toBe(1);
    playCard(s, b, 'e1');
    expect(u(s, 'rengar').statuses.charge ?? 0).toBe(0);
  });

  it('Maestro Yi: Golpe alfa y Filo veloz son ráfagas; Highlander da Cargas y bloqueo', () => {
    const s = withJg('masteryi');
    const [a] = give(s, 'myi1');
    playCard(s, a, 'e1');
    expect(30 - u(s, 'e1').hp).toBeGreaterThanOrEqual(9);
    const [b] = give(s, 'myi4');
    s.energy = 3;
    playCard(s, b);
    expect([u(s, 'masteryi').statuses.charge, u(s, 'masteryi').block]).toEqual([3, 8]);
  });

  it('Warwick se cura al morder y Viego reanima con Posesión', () => {
    const s = withJg('warwick');
    u(s, 'warwick').hp = 10;
    const [a] = give(s, 'war1');
    playCard(s, a, 'e1');
    expect(u(s, 'warwick').hp).toBe(13);
    const t = withJg('viego');
    const dead = t.units.find((x) => x.id === 'lux')!;
    dead.downed = true;
    dead.hp = 0;
    const [r] = give(t, 'vie6');
    playCard(t, r, 'lux');
    expect([dead.downed, dead.hp]).toEqual([false, 15]);
  });

  it('Kindred: Respiro del cordero da bloqueo y cura a todo el equipo; Jarvan: Égida dorada, bloqueo a todos', () => {
    const s = withJg('kindred');
    for (const x of s.units.filter((y) => y.side === 'ally')) x.hp = 10;
    s.energy = 3;
    const [a] = give(s, 'kin4');
    playCard(s, a);
    for (const x of s.units.filter((y) => y.side === 'ally')) expect([x.block, x.hp], x.id).toEqual([12, 16]);
    const t = withJg('jarvaniv');
    const [b] = give(t, 'jar3');
    playCard(t, b);
    for (const x of t.units.filter((y) => y.side === 'ally')) expect(x.block, x.id).toBe(8);
  });

  it('Zac: ¡A rebotar! aturde a todos; Elise: Descenso gasta las Marcas', () => {
    const s = withJg('zac');
    s.energy = 3;
    const [a] = give(s, 'zac4');
    playCard(s, a);
    for (const id of ['e1', 'e2']) expect(u(s, id).statuses.stun, id).toBe(1);
    const t = withJg('elise');
    u(t, 'e1').statuses.mark = 2;
    t.energy = 3;
    const [b] = give(t, 'eli4');
    playCard(t, b, 'e1');
    expect(u(t, 'e1').statuses.mark ?? 0).toBe(0);
    expect(30 - u(t, 'e1').hp).toBeGreaterThanOrEqual(12 + 10);
  });
});

describe('jungla: expedición', () => {
  for (const id of JUNGLE) {
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
