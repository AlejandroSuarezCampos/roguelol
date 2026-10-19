import { describe, expect, it } from 'vitest';
import { playCard } from '../../src/engine/cards';
import { addPotion, emptyBelt, refreshBelt, resolveFullBelt, usePotion, usePotionOnMap, whyCannotUse } from '../../src/engine/potions';
import { give, makeState, u } from './fixtures';

describe('cinturón de pociones', () => {
  it('tiene 3 huecos y avisa cuando está lleno', () => {
    const belt = emptyBelt();
    expect(belt).toHaveLength(3);
    expect(addPotion(belt, 'health')).toBe(true);
    expect(addPotion(belt, 'iron')).toBe(true);
    expect(addPotion(belt, 'sorcery')).toBe(true);
    expect(addPotion(belt, 'refillable')).toBe(false);
  });

  it('con el cinturón lleno se descarta la nueva o se sustituye un hueco', () => {
    const belt = emptyBelt();
    ['health', 'iron', 'sorcery'].forEach((p) => addPotion(belt, p as 'health'));
    resolveFullBelt(belt, 'refillable', 'new');
    expect(belt.map((p) => p?.id)).toEqual(['health', 'iron', 'sorcery']);
    resolveFullBelt(belt, 'refillable', 1);
    expect(belt[1]).toEqual({ id: 'refillable', spent: false });
  });

  it('usar una poción no gasta energía', () => {
    const s = makeState({ belt: [{ id: 'health', spent: false }, null, null] });
    u(s, 'leona').hp = 10;
    usePotion(s, 0, 'leona');
    expect(u(s, 'leona').hp).toBe(30);
    expect(s.energy).toBe(3);
    expect(s.belt[0]).toBeNull();
  });

  it('ninguna poción afecta a derribados', () => {
    const s = makeState({ belt: [{ id: 'iron', spent: false }, null, null] });
    u(s, 'leona').downed = true;
    expect(whyCannotUse(s.belt, 0, u(s, 'leona'))).toBe('Derribado: no recibe curación normal');
  });

  it('la reutilizable se gasta y se rellena al empezar el siguiente combate', () => {
    const s = makeState({ belt: [{ id: 'refillable', spent: false }, null, null] });
    u(s, 'leona').hp = 10;
    usePotion(s, 0, 'leona');
    expect(u(s, 'leona').hp).toBe(18);
    expect(whyCannotUse(s.belt, 0, u(s, 'leona'))).toBe('Hueco vacío');
    refreshBelt(s.belt);
    expect(s.belt[0]).toEqual({ id: 'refillable', spent: false });
  });

  it('Elixir de hierro: +15 de bloqueo', () => {
    const s = makeState({ belt: [{ id: 'iron', spent: false }, null, null] });
    usePotion(s, 0, 'yasuo');
    expect(u(s, 'yasuo').block).toBe(15);
  });

  it('Elixir de brujería: la siguiente carta de AP aplica +2 Marca', () => {
    const s = makeState({ belt: [{ id: 'sorcery', spent: false }, null, null] });
    usePotion(s, 0);
    u(s, 'lux').pos = 1;
    u(s, 'leona').pos = 3;
    const [id] = give(s, 'bind');
    playCard(s, id, 'e1');
    expect(u(s, 'e1').statuses.mark).toBe(3);
    expect(s.pendingApMark).toBe(0);
  });

  it('en el mapa solo se usan las curativas', () => {
    const belt = emptyBelt();
    addPotion(belt, 'iron');
    addPotion(belt, 'health');
    const champ = { hp: 10, maxHp: 40, downed: false };
    expect(() => usePotionOnMap(belt, 0, champ)).toThrow('Solo pociones curativas fuera de combate');
    usePotionOnMap(belt, 1, champ);
    expect(champ.hp).toBe(30);
  });
});

describe('hueco del cinturón no válido', () => {
  it('un índice fuera de rango o no entero no hace crecer el cinturón', () => {
    const belt = [{ id: 'iron' as const, spent: false }, { id: 'iron' as const, spent: false }, { id: 'iron' as const, spent: false }];
    for (const bad of [5, -1, 1.5, Number.NaN]) {
      expect(() => resolveFullBelt(belt, 'health', bad)).toThrow(/no válido/);
    }
    expect(belt).toHaveLength(3);
  });
});
