import { describe, expect, it } from 'vitest';
import { CARD_LIST, CARDS, STARTER_DECK } from '../../src/data/cards';
import { CHAMPIONS, CHAMPION_IDS } from '../../src/data/champions';
import { playCard } from '../../src/engine/cards';
import { createExpedition } from '../../src/engine/expedition';
import { championAvailable, newMeta, setParty, setupFor } from '../../src/engine/meta';
import type { ChampionId } from '../../src/engine/types';
import { playExpedition } from '../balance/bot';
import { ally, enemy, give, makeState, u } from './fixtures';

const SUPPORTS: ChampionId[] = ['janna', 'nami', 'sona', 'thresh'];
/** Los demás campeones cuyo papel principal en el LoL es apoyo. */
const MORE_SUPPORTS: ChampionId[] = ['alistar', 'bard', 'blitzcrank', 'braum', 'karma', 'milio', 'nautilus', 'pyke', 'rakan', 'rell', 'renata', 'senna', 'seraphine', 'taric', 'yuumi', 'zilean', 'zyra', 'morgana'];
const ALL_NEW = [...SUPPORTS, ...MORE_SUPPORTS];

describe('apoyos nuevos: datos', () => {
  for (const id of ALL_NEW) {
    it(`${CHAMPIONS[id].name}: 8 cartas con mejora, 5 de mazo inicial y bloqueado hasta desbloquearlo`, () => {
      const cards = CARD_LIST.filter((c) => c.owner === id);
      expect(cards).toHaveLength(8);
      expect(cards.every((c) => c.upgrade)).toBe(true);
      expect(cards.some((c) => c.rarity === 'epic')).toBe(true);
      expect(STARTER_DECK.filter((c) => CARDS[c].owner === id)).toHaveLength(5);
      expect(CHAMPION_IDS).toContain(id);
      const m = newMeta();
      expect(championAvailable(m, id)).toBe(false);
      m.unlocked.push(`champion:${id}`);
      expect(championAvailable(m, id)).toBe(true);
    });
  }
});

describe('apoyos nuevos: cartas en combate', () => {
  const withSupport = (id: ChampionId, pos: 1 | 2 | 3 | 4 = 4) => {
    const s = makeState({ cards: CARDS });
    s.units = [ally('leona', 1, { hp: 20 }), ally('yasuo', 2, { hp: 20 }), ally('lux', 3, { hp: 20 }), ally(id, pos, { hp: 20 }), enemy('e1', 1), enemy('e2', 2)];
    return s;
  };

  it('Janna: Ráfaga de céfiro empuja al objetivo una posición', () => {
    const s = withSupport('janna');
    const [c] = give(s, 'j1');
    playCard(s, c, 'e1');
    expect(u(s, 'e1').pos).toBe(2);
    expect(u(s, 'e2').pos).toBe(1);
    expect(u(s, 'e1').hp).toBeLessThan(30);
  });

  it('Janna: Monzón cura y da bloqueo a todos los aliados', () => {
    const s = withSupport('janna');
    s.energy = 3;
    const [c] = give(s, 'j7');
    playCard(s, c);
    for (const id of ['leona', 'yasuo', 'lux', 'janna']) {
      expect(u(s, id).hp, id).toBe(28);
      expect(u(s, id).block, id).toBe(8);
    }
  });

  it('Thresh: Sentencia de muerte atrae al objetivo una posición', () => {
    const s = withSupport('thresh', 2);
    s.units = s.units.filter((x) => x.id !== 'yasuo');
    const [c] = give(s, 't1');
    playCard(s, c, 'e2');
    expect(u(s, 'e2').pos).toBe(1);
    expect(u(s, 'e1').pos).toBe(2);
  });

  it('Thresh: Cosecha de almas da 1 Carga y Cadena fatal aturde y atrae', () => {
    const s = withSupport('thresh', 2);
    s.units = s.units.filter((x) => x.id !== 'yasuo');
    s.energy = 3;
    const [a, b] = give(s, 't6', 't7');
    playCard(s, a, 'e1');
    expect(u(s, 'thresh').statuses.charge).toBe(1);
    playCard(s, b, 'e2');
    expect(u(s, 'e2').statuses.stun).toBe(1);
    expect(u(s, 'e2').pos).toBe(1);
  });

  it('Nami: Resaca consume las Marcas de los enemigos y suma daño por cada una', () => {
    const s = withSupport('nami', 3);
    s.units = s.units.filter((x) => x.id !== 'lux');
    u(s, 'e1').statuses.mark = 2;
    const [c] = give(s, 'n5');
    playCard(s, c);
    expect(u(s, 'e1').statuses.mark ?? 0).toBe(0);
    const marked = 30 - u(s, 'e1').hp;
    const plain = 30 - u(s, 'e2').hp;
    expect(marked - plain).toBe(6);
  });

  it('Sona: Himno de valor da bloqueo a todos y roba una carta', () => {
    const s = withSupport('sona');
    s.drawPile = [{ uid: 'd1', defId: 'o8' }];
    const [c] = give(s, 'o1');
    playCard(s, c);
    expect(u(s, 'leona').block).toBe(2);
    expect(s.hand.map((h) => h.defId)).toEqual(['o8']);
  });

  it('Sona: Crescendo aturde y deja Vulnerables a todos los enemigos', () => {
    const s = withSupport('sona');
    s.energy = 3;
    const [c] = give(s, 'o7');
    playCard(s, c);
    for (const id of ['e1', 'e2']) expect([u(s, id).statuses.stun, u(s, id).statuses.vulnerable]).toEqual([1, 1]);
  });
});

describe('apoyos nuevos: expedición', () => {
  it('un equipo de cuatro apoyos nuevos se puede formar y llevar, y empieza con su mazo', () => {
    const m = newMeta();
    for (const id of SUPPORTS) m.unlocked.push(`champion:${id}`);
    setParty(m, SUPPORTS);
    const e = createExpedition(11, 0, setupFor(m));
    expect(e.party).toEqual(SUPPORTS);
    expect(e.deck).toHaveLength(20);
    expect(e.deck.every((id) => SUPPORTS.includes(CARDS[id].owner))).toBe(true);
  });

  it('el bot juega una expedición entera con ellos sin errores', () => {
    const m = newMeta();
    for (const id of SUPPORTS) m.unlocked.push(`champion:${id}`);
    setParty(m, SUPPORTS);
    const e = createExpedition(11, 0, setupFor(m));
    const r = playExpedition(e, 11);
    expect(['victory', 'defeat']).toContain(r.status);
  });
});

describe('todos los apoyos del LoL', () => {
  it('hay 26 apoyos jugables en total y los textos de sus cartas citan los números de sus efectos', () => {
    expect(CHAMPION_IDS).toHaveLength(27);
    for (const id of ALL_NEW) {
      for (const c of CARD_LIST.filter((x) => x.owner === id)) {
        for (const eff of [...c.effects, ...(c.upgrade?.effects ?? [])]) {
          if ('amount' in eff && eff.type !== 'draw') {
            const def = eff.type === 'damage' || eff.type === 'block' || eff.type === 'heal' || eff.type === 'reduceStress';
            if (def) expect(`${c.text} ${c.upgrade?.text}`, `${c.id} ${eff.type}`).toContain(String(eff.amount));
          }
        }
      }
    }
  });

  for (const id of MORE_SUPPORTS) {
    it(`${CHAMPIONS[id].name} sustituye a Soraka y el bot completa una expedición`, () => {
      const m = newMeta();
      m.unlocked.push(`champion:${id}`);
      setParty(m, ['leona', 'yasuo', 'lux', id]);
      const e = createExpedition(5, 0, setupFor(m));
      expect(e.deck.filter((c) => CARDS[c].owner === id)).toHaveLength(5);
      expect(['victory', 'defeat']).toContain(playExpedition(e, 5).status);
    });
  }
});
