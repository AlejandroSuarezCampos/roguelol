import { describe, expect, it } from 'vitest';
import { bonusActive, cardOf, isApCard, playCard, whyCannotPlay } from '../../src/engine/cards';
import { CARDS, SeqRng, give, makeState, u } from './fixtures';

describe('jugar cartas', () => {
  it('gasta energía, resuelve el efecto y va al descarte', () => {
    const s = makeState();
    const [id] = give(s, 'guard');
    playCard(s, id);
    expect(s.energy).toBe(2);
    expect(u(s, 'leona').block).toBe(8);
    expect(s.hand).toHaveLength(0);
    expect(s.discard.map((c) => c.defId)).toEqual(['guard']);
  });

  it('sin restricción de alcance: Golpe llega a cualquier posición', () => {
    const s = makeState();
    u(s, 'e2').pos = 4;
    const [id] = give(s, 'strike');
    expect(whyCannotPlay(s, CARDS.strike, u(s, 'e2'))).toBeNull();
    playCard(s, id, 'e2');
    expect(u(s, 'e2').hp).toBe(21);
  });

  it('el bonus de posición solo se aplica desde una posición ideal', () => {
    const s = makeState();
    expect(bonusActive(s, CARDS.strike)).toBe(true);
    const [a] = give(s, 'strike');
    playCard(s, a, 'e1');
    expect(u(s, 'e1').hp).toBe(21);
    u(s, 'leona').pos = 3;
    u(s, 'lux').pos = 1;
    expect(bonusActive(s, CARDS.strike)).toBe(false);
    const [b] = give(s, 'strike');
    playCard(s, b, 'e1');
    expect(u(s, 'e1').hp).toBe(15);
  });

  it('límite de 3 cartas por campeón y turno', () => {
    const s = makeState({ energy: 10 });
    const ids = give(s, 'guard', 'guard', 'guard', 'guard');
    ids.slice(0, 3).forEach((id) => playCard(s, id));
    expect(whyCannotPlay(s, CARDS.guard)).toBe('Límite de 3 cartas de Leona este turno');
  });

  it('valida energía y objetivos', () => {
    const s = makeState({ energy: 0 });
    expect(whyCannotPlay(s, CARDS.guard)).toBe('Energía insuficiente');
    s.energy = 3;
    expect(whyCannotPlay(s, CARDS.strike)).toBe('Elige un objetivo');
    expect(whyCannotPlay(s, CARDS.strike, u(s, 'yasuo'))).toBe('Debe ser un enemigo');
    u(s, 'yasuo').downed = true;
    expect(whyCannotPlay(s, CARDS.touch, u(s, 'yasuo'))).toBe('Derribado: no recibe efectos normales');
    expect(whyCannotPlay(s, CARDS.rebirth, u(s, 'leona'))).toBe('Solo a un aliado derribado');
  });

  it('desplazamiento: Hoja del cénit lleva a Leona a 1 intercambiando', () => {
    const s = makeState();
    u(s, 'leona').pos = 3;
    u(s, 'lux').pos = 1;
    const [id] = give(s, 'zenith');
    playCard(s, id, 'e1');
    expect(u(s, 'leona').pos).toBe(1);
    expect(u(s, 'lux').pos).toBe(3);
  });

  it('desplazamiento: Hoja cortante empuja al objetivo una posición atrás', () => {
    const s = makeState();
    const [id] = give(s, 'sweep');
    playCard(s, id, 'e1');
    expect(u(s, 'e1').pos).toBe(2);
    expect(u(s, 'e2').pos).toBe(1);
  });

  it('las cartas de área golpean a todos los enemigos vivos', () => {
    const s = makeState();
    const [id] = give(s, 'spark');
    playCard(s, id);
    expect(u(s, 'e1').hp).toBe(22);
    expect(u(s, 'e2').hp).toBe(22);
  });

  it('el crítico usa la probabilidad del lanzador y el RNG', () => {
    const s = makeState({ rng: new SeqRng([0]) });
    u(s, 'yasuo').stats.critChance = 0.5;
    const [id] = give(s, 'tempest');
    playCard(s, id, 'e1');
    expect(u(s, 'e1').hp).toBe(15);
  });

  it('Calma reduce el estrés del aliado objetivo', () => {
    const s = makeState();
    u(s, 'lux').stress = 30;
    const [id] = give(s, 'calm');
    playCard(s, id, 'lux');
    expect(u(s, 'lux').stress).toBe(18);
  });
});

describe('crisis al jugar cartas', () => {
  it('Ira: +3 de daño y no puede apuntar a aliados', () => {
    const s = makeState();
    Object.assign(u(s, 'lux'), { crisis: 'rage', crisisActive: true, stress: 100 });
    expect(whyCannotPlay(s, CARDS.barrier, u(s, 'leona'))).toBe('Lux en Ira: no puede apuntar a aliados');
    const [id] = give(s, 'bind');
    playCard(s, id, 'e1');
    expect(u(s, 'e1').hp).toBe(22);
  });

  it('Egoísmo: sus cartas cuestan 1 menos y solo 1 carta de otro campeón por turno', () => {
    const s = makeState();
    Object.assign(u(s, 'yasuo'), { crisisActive: true, stress: 100 });
    const [t, g1, g2] = give(s, 'tempest', 'guard', 'guard');
    playCard(s, t, 'e1');
    expect(s.energy).toBe(3);
    playCard(s, g1);
    expect(() => playCard(s, g2)).toThrow('Yasuo en Egoísmo: solo 1 carta de otro campeón por turno');
  });

  it('Pánico: no puede jugar ataques', () => {
    const s = makeState();
    Object.assign(u(s, 'leona'), { crisis: 'panic', crisisActive: true, stress: 100 });
    expect(whyCannotPlay(s, CARDS.strike, u(s, 'e1'))).toBe('Leona en Pánico: no puede atacar');
  });

  it('Desesperación: cura la mitad y suma +3 de estrés a sí misma', () => {
    const s = makeState();
    Object.assign(u(s, 'soraka'), { crisisActive: true, stress: 90 });
    u(s, 'leona').hp = 20;
    const [id] = give(s, 'touch');
    playCard(s, id, 'leona');
    expect(u(s, 'leona').hp).toBe(25);
    expect(u(s, 'soraka').stress).toBe(93);
  });

  it('Virtud: las cartas de un dueño con virtud no le generan estrés', () => {
    const s = makeState();
    Object.assign(u(s, 'soraka'), { crisisActive: true, virtueActive: true, stress: 90 });
    const [id] = give(s, 'touch');
    playCard(s, id, 'leona');
    expect(u(s, 'soraka').stress).toBe(90);
  });
});

describe('modelo de cartas (§9)', () => {
  it('consumir Carga del lanzador: +4 por acumulación y la elimina', () => {
    const s = makeState();
    s.cards = { ...CARDS, finisher: { id: 'finisher', name: 'Último aliento', owner: 'yasuo', cost: 1, type: 'attack', target: 'enemy',
      rarity: 'rare', keywords: ['charge'], text: 'Inflige 8 +4 por Carga.',
      effects: [{ type: 'damage', amount: 8, damageType: 'physical', consumeStatus: { status: 'charge', from: 'self', bonusPerStack: 4 } }] } };
    u(s, 'yasuo').statuses.charge = 3;
    const [id] = give(s, 'finisher');
    playCard(s, id, 'e1');
    expect(u(s, 'e1').hp).toBe(10);
    expect(u(s, 'yasuo').statuses.charge).toBeUndefined();
  });

  it('consumir Marca del objetivo: +4 por Marca de cada objetivo', () => {
    const s = makeState();
    s.cards = { ...CARDS, burst: { id: 'burst', name: 'Chispa final', owner: 'lux', cost: 2, type: 'skill', target: 'allEnemies',
      rarity: 'epic', keywords: ['mark'], text: 'Inflige 8 a todos. +4 por Marca consumida.',
      effects: [{ type: 'damage', amount: 8, damageType: 'magic', consumeStatus: { status: 'mark', from: 'target', bonusPerStack: 4 } }] } };
    u(s, 'e1').statuses.mark = 2;
    const [id] = give(s, 'burst');
    playCard(s, id);
    expect(u(s, 'e1').hp).toBe(14);
    expect(u(s, 'e2').hp).toBe(22);
    expect(u(s, 'e1').statuses.mark).toBeUndefined();
  });

  it('una carta mejorada usa el coste, los efectos y el texto de su mejora', () => {
    const s = makeState();
    s.cards = { ...CARDS, guard: { ...CARDS.guard, upgrade: { cost: 0, effects: [{ type: 'block', amount: 12 }], text: 'Gana 12 de bloqueo.' } } };
    s.hand.push({ uid: 'up1', defId: 'guard', upgraded: true });
    expect(cardOf(s, s.hand[0]).text).toBe('Gana 12 de bloqueo.');
    playCard(s, 'up1');
    expect(s.energy).toBe(3);
    expect(u(s, 'leona').block).toBe(12);
  });

  it('las cartas de AP se reconocen por el escalado de sus efectos', () => {
    expect(isApCard(CARDS.bind)).toBe(true);
    expect(isApCard(CARDS.strike)).toBe(false);
  });

  it('la armadura del enemigo mitiga el daño físico de las cartas', () => {
    const s = makeState();
    u(s, 'e1').stats.armor = 100;
    const [id] = give(s, 'strike');
    playCard(s, id, 'e1');
    expect(u(s, 'e1').hp).toBe(26);
  });
});
