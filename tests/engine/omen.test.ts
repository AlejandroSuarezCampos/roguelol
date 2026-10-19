import { describe, expect, it } from 'vitest';
import { bonusActive, cardCost, forcedTarget, playCard, whyCannotPlay } from '../../src/engine/cards';
import { CARDS, give, makeState, u } from './fixtures';

const downLeona = (s: ReturnType<typeof makeState>) => Object.assign(u(s, 'leona'), { downed: true, hp: 0 });

describe('Presagio de los caídos', () => {
  it('las cartas de un derribado se pueden jugar', () => {
    const s = makeState();
    downLeona(s);
    expect(whyCannotPlay(s, CARDS.strike, u(s, 'e1'))).toBeNull();
  });

  it('Lamento: +6 de estrés a todos los aliados vivos', () => {
    const s = makeState({ omen: 'lament' });
    downLeona(s);
    const [id] = give(s, 'strike');
    playCard(s, id, 'e1');
    expect(u(s, 'yasuo').stress).toBe(6);
    expect(u(s, 'soraka').stress).toBe(6);
    expect(u(s, 'leona').stress).toBe(0);
  });

  it('Peso: la carta cuesta +1 de energía', () => {
    const s = makeState({ omen: 'weight' });
    downLeona(s);
    expect(cardCost(s, CARDS.strike)).toBe(2);
    const [id] = give(s, 'strike');
    playCard(s, id, 'e1');
    expect(s.energy).toBe(1);
  });

  it('Deriva: objetivo forzado y visible, se ignora el elegido', () => {
    const s = makeState({ omen: 'drift' });
    downLeona(s);
    expect(forcedTarget(s, CARDS.strike)?.id).toBe('e1');
    const [id] = give(s, 'strike');
    playCard(s, id, 'e2');
    expect(u(s, 'e1').hp).toBe(24);
    expect(u(s, 'e2').hp).toBe(30);
    Object.assign(u(s, 'lux'), { downed: true, hp: 0 });
    u(s, 'soraka').hp = 15;
    expect(forcedTarget(s, CARDS.barrier)?.id).toBe('soraka');
  });

  it('Sangría: el aliado vivo más adelantado recibe 4 de daño bloqueable', () => {
    const s = makeState({ omen: 'bleed' });
    downLeona(s);
    u(s, 'yasuo').block = 3;
    const [id] = give(s, 'strike');
    playCard(s, id, 'e1');
    expect(u(s, 'yasuo').block).toBe(0);
    expect(u(s, 'yasuo').hp).toBe(39);
  });

  it('un derribado nunca activa su bonus de posición', () => {
    const s = makeState();
    downLeona(s);
    expect(bonusActive(s, CARDS.strike)).toBe(false);
  });

  it('reanimar elimina el Presagio para ese campeón', () => {
    const s = makeState({ omen: 'lament', energy: 10 });
    downLeona(s);
    const [r, st] = give(s, 'rebirth', 'strike');
    playCard(s, r, 'leona');
    expect(u(s, 'leona').downed).toBe(false);
    playCard(s, st, 'e1');
    expect(u(s, 'yasuo').stress).toBe(0);
  });

  it('la virtud del dueño anula el estrés que generan sus cartas', () => {
    const s = makeState({ omen: 'lament' });
    downLeona(s);
    u(s, 'leona').virtueActive = true;
    const [id] = give(s, 'strike');
    playCard(s, id, 'e1');
    expect(u(s, 'yasuo').stress).toBe(0);
  });
});
