import { describe, expect, it } from 'vitest';
import { cardOf } from '../../src/engine/cards';
import { intentTarget } from '../../src/engine/combat';
import { give, makeState, u } from '../engine/fixtures';
import { cardAvailability, intentView } from '../../src/state/selectors';

const availability = (s: ReturnType<typeof makeState>, id: string) => cardAvailability(s, cardOf(s, s.hand.find((c) => c.defId === id)!));

describe('cardAvailability', () => {
  it('una carta de enemigo es jugable si hay un enemigo vivo y marca a cada objetivo', () => {
    const s = makeState();
    give(s, 'strike');
    const a = availability(s, 'strike');
    expect(a.playable).toBe(true);
    expect(a.targets).toEqual({ e1: null, e2: null });
  });

  it('un enemigo derrotado es un objetivo ilegal con su motivo', () => {
    const s = makeState();
    give(s, 'strike');
    u(s, 'e2').downed = true;
    const a = availability(s, 'strike');
    expect(a.targets.e2).toBe('Ya derrotado');
    expect(a.playable).toBe(true);
  });

  it('sin energía no es jugable y explica por qué', () => {
    const s = makeState({ energy: 0 });
    give(s, 'strike');
    const a = availability(s, 'strike');
    expect(a.playable).toBe(false);
    expect(a.reason).toBe('Energía insuficiente');
  });

  it('las cartas propias y de área no piden objetivo y señalan a quién afectan', () => {
    const s = makeState();
    give(s, 'guard', 'spark');
    expect(availability(s, 'guard')).toMatchObject({ playable: true, affects: ['leona'] });
    expect(availability(s, 'spark').affects.sort()).toEqual(['e1', 'e2']);
  });

  it('Pánico impide jugar ataques', () => {
    const s = makeState();
    give(s, 'bind');
    Object.assign(u(s, 'lux'), { crisisActive: true });
    const a = availability(s, 'bind');
    expect(a.playable).toBe(true); // Enlace de luz es habilidad
    const s2 = makeState();
    s2.cards = { ...s2.cards, atk: { ...s2.cards.bind, id: 'atk', type: 'attack' } };
    give(s2, 'atk');
    Object.assign(u(s2, 'lux'), { crisisActive: true });
    expect(availability(s2, 'atk')).toMatchObject({ playable: false });
    expect(availability(s2, 'atk').reason).toMatch(/Pánico/);
  });

  it('con Deriva, el objetivo forzado es el único legal', () => {
    const s = makeState({ omen: 'drift' });
    give(s, 'strike');
    u(s, 'leona').downed = true;
    const a = availability(s, 'strike');
    expect(a.targets.e1).toBeNull();
    expect(a.targets.e2).toMatch(/Deriva/);
  });

  it('Renacer solo apunta a derribados', () => {
    const s = makeState({ energy: 3 });
    give(s, 'rebirth');
    u(s, 'lux').downed = true;
    const a = availability(s, 'rebirth');
    expect(a.targets.lux).toBeNull();
    expect(a.targets.leona).toBe('Solo a un aliado derribado');
  });
});

describe('intentView', () => {
  it('resuelve el objetivo real, el valor y si es letal', () => {
    const s = makeState();
    s.intents = { e1: [{ kind: 'attack', amount: 8, target: 1 }], e2: [] };
    u(s, 'leona').hp = 5;
    const [v] = intentView(s, u(s, 'e1'));
    expect(v.target?.id).toBe('leona');
    expect(v.value).toBeGreaterThan(0);
    expect(v.lethal).toBe(true);
  });

  it('un ataque a una posición derribada va al aliado vivo más adelantado', () => {
    const s = makeState();
    u(s, 'leona').downed = true;
    expect(intentTarget(s, 1)!.id).toBe('yasuo');
  });

  it('no es letal si el bloqueo lo cubre', () => {
    const s = makeState();
    s.intents = { e1: [{ kind: 'attack', amount: 8, target: 1 }], e2: [] };
    u(s, 'leona').hp = 5;
    u(s, 'leona').block = 20;
    expect(intentView(s, u(s, 'e1'))[0].lethal).toBe(false);
  });
});
