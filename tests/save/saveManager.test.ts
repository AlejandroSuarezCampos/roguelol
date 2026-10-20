import { describe, expect, it } from 'vitest';
import { availableNodes, combatFromExpedition, createExpedition, enterNode } from '../../src/engine/expedition';
import { equip } from '../../src/engine/gear';
import { SAVE_KEY, SAVE_VERSION, createSaveManager, type StorageLike } from '../../src/save/saveManager';

function memory(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

const played = (seed = 4) => {
  const e = createExpedition(seed);
  enterNode(e, availableNodes(e)[0].id);
  e.run.gold = 77;
  e.run.champions[1].hp = 12;
  e.wounds.lux = 2;
  e.deck.push('x2');
  e.run.belt[0] = { id: 'health', spent: false };
  e.run.relics.push('stone');
  e.inventory.push('infinity', 'warmog');
  equip(e, 'yasuo', 'infinity');
  return e;
};

describe('guardar y cargar', () => {
  it('sin guardado no hay nada que cargar', () => {
    const m = createSaveManager(memory());
    expect(m.load()).toEqual({ status: 'none' });
    expect(m.summary()).toBeNull();
  });

  it('ida y vuelta: el estado cargado es igual y la run sigue siendo reproducible', () => {
    const store = memory();
    const m = createSaveManager(store);
    const e = played();
    m.save(e);
    const r = m.load();
    if (r.status !== 'ok') throw new Error(r.status);
    expect(r.expedition.run.gold).toBe(77);
    expect(r.expedition.run.champions[1].hp).toBe(12);
    expect(r.expedition.wounds.lux).toBe(2);
    expect(r.expedition.deck).toEqual(e.deck);
    expect(r.expedition.gear.yasuo[0]).toBe('infinity');
    expect(r.expedition.inventory).toEqual(['warmog']);
    expect(r.expedition.run.relics).toEqual(['stone']);
    expect(r.expedition.inCombat).toBe(false);
    expect(r.expedition.visited).toEqual(e.visited);
    // el RNG se restaura con su estado: el siguiente combate sale igual que sin guardar
    const a = combatFromExpedition(e, 'combat');
    const b = combatFromExpedition(r.expedition, 'combat');
    expect(b.hand.map((c) => c.defId)).toEqual(a.hand.map((c) => c.defId));
    expect(b.units.map((u) => u.id + u.pos)).toEqual(a.units.map((u) => u.id + u.pos));
  });

  it('las cartas mejoradas («+») se guardan y se cargan', () => {
    const m = createSaveManager(memory());
    const e = played();
    e.deck[0] = `${e.deck[0]}+`;
    m.save(e);
    const r = m.load();
    if (r.status !== 'ok') throw new Error(r.status);
    expect(r.expedition.deck[0].endsWith('+')).toBe(true);
  });

  it('el resumen da piso, oro y fecha para el menú', () => {
    const m = createSaveManager(memory());
    m.save(played());
    expect(m.summary()).toMatchObject({ floor: 1, gold: 77, champions: 4 });
  });

  it('borrar elimina el guardado', () => {
    const store = memory();
    const m = createSaveManager(store);
    m.save(played());
    m.clear();
    expect(m.load().status).toBe('none');
    expect(store.data.size).toBe(0);
  });

  it('el guardado lleva versión', () => {
    const store = memory();
    createSaveManager(store).save(played());
    expect(JSON.parse(store.data.get(SAVE_KEY)!).version).toBe(SAVE_VERSION);
  });
});

describe('datos corruptos', () => {
  it('JSON roto: devuelve «corrupt», conserva una copia y quita el guardado', () => {
    const store = memory();
    store.setItem(SAVE_KEY, '{no es json');
    const m = createSaveManager(store);
    expect(m.load().status).toBe('corrupt');
    expect(store.data.has(SAVE_KEY)).toBe(false);
    expect([...store.data.values()]).toContain('{no es json');
    expect(m.load().status).toBe('none');
  });

  it('versión desconocida: no se carga', () => {
    const store = memory();
    const m = createSaveManager(store);
    m.save(played());
    const raw = JSON.parse(store.data.get(SAVE_KEY)!);
    raw.version = 999;
    store.setItem(SAVE_KEY, JSON.stringify(raw));
    expect(m.load().status).toBe('corrupt');
  });

  it.each([
    ['una carta mejorada que no existe', (r: any) => (r.expedition.deck[0] = 'nope+')],
    ['una carta que no existe', (r: any) => (r.expedition.deck[0] = 'nope')],
    ['un campeón repetido', (r: any) => (r.expedition.run.champions[1].id = 'leona')],
    ['posiciones repetidas', (r: any) => (r.expedition.run.champions[1].pos = r.expedition.run.champions[0].pos)],
    ['vida mayor que el máximo', (r: any) => (r.expedition.run.champions[0].hp = 9999)],
    ['un nodo actual inexistente', (r: any) => (r.expedition.currentId = 'n9-9')],
    ['un camino a un nodo inexistente', (r: any) => r.expedition.map.nodes[0].next.push('zz')],
    ['oro negativo', (r: any) => (r.expedition.run.gold = -5)],
    ['un presagio inventado', (r: any) => (r.expedition.run.omen = 'nada')],
    ['un RNG que no es número', (r: any) => (r.expedition.run.rng.state = 'x')],
    ['un objeto de inventario inexistente', (r: any) => r.expedition.inventory.push('nope')],
    ['un objeto equipado inexistente', (r: any) => (r.expedition.gear.lux[3] = 'nope')],
    ['huecos de gear de menos', (r: any) => r.expedition.gear.lux.pop()],
    ['una reliquia inexistente', (r: any) => r.expedition.run.relics.push('nope')],
    ['una reliquia repetida', (r: any) => r.expedition.run.relics.push('heart', 'heart')],
    ['una dificultad inventada', (r: any) => (r.expedition.difficulty = 'facil')],
    ['un muerto en Normal', (r: any) => { r.expedition.dead = ['lux']; r.expedition.run.champions.splice(2, 1); }],
    ['un campeón vivo y muerto a la vez', (r: any) => { r.expedition.difficulty = 'nightmare'; r.expedition.dead = ['leona']; }],
    ['unas mejoras inventadas', (r: any) => (r.expedition.perks = { hp: 'mucho' })],
    ['un bestiario roto', (r: any) => (r.expedition.encounters = { wolf: { seen: -1, defeated: 0 } })],
    ['una expedición ya terminada', (r: any) => (r.expedition.status = 'defeat')],
  ])('rechaza %s', (_name, tamper) => {
    const store = memory();
    const m = createSaveManager(store);
    m.save(played());
    const raw = JSON.parse(store.data.get(SAVE_KEY)!);
    tamper(raw);
    store.setItem(SAVE_KEY, JSON.stringify(raw));
    expect(m.load().status).toBe('corrupt');
  });

  it('una expedición de Pesadilla con un muerto se guarda y se carga', () => {
    const store = memory();
    const m = createSaveManager(store);
    const e = createExpedition(4, 'nightmare');
    e.dead.push('lux');
    e.run.champions = e.run.champions.filter((c) => c.id !== 'lux');
    e.deck = e.deck.filter((id) => !id.startsWith('x'));
    m.save(e);
    const r = m.load();
    if (r.status !== 'ok') throw new Error(r.status);
    expect(r.expedition.difficulty).toBe('nightmare');
    expect(r.expedition.dead).toEqual(['lux']);
    expect(r.expedition.run.champions).toHaveLength(3);
  });

  it('una expedición con pocas cartas por muertes de Pesadilla se carga igualmente', () => {
    const store = memory();
    const m = createSaveManager(store);
    const e = createExpedition(4, 'nightmare');
    for (const dead of ['lux', 'soraka'] as const) {
      e.dead.push(dead);
      e.run.champions = e.run.champions.filter((c) => c.id !== dead);
    }
    e.deck = e.deck.filter((id) => !'xs'.includes(id[0]));
    expect(e.deck.length).toBeLessThan(12);
    m.save(e);
    expect(m.load().status).toBe('ok');
  });

  it('save devuelve el resumen calculado y null si no se pudo guardar', () => {
    const m = createSaveManager(memory(), () => 1234);
    expect(m.save(played())).toEqual({ floor: 1, gold: 77, champions: 4, savedAt: 1234 });
    const boom: StorageLike = { getItem: () => null, setItem: () => { throw new Error('cuota'); }, removeItem: () => undefined };
    expect(createSaveManager(boom).save(played())).toBeNull();
  });

  it('sin almacenamiento disponible nada falla', () => {
    const m = createSaveManager(null);
    expect(() => m.save(played())).not.toThrow();
    expect(m.load()).toEqual({ status: 'none' });
    expect(() => m.clear()).not.toThrow();
  });

  it('un almacenamiento que lanza errores (cuota, modo privado) no rompe el juego', () => {
    const boom: StorageLike = {
      getItem: () => { throw new Error('denegado'); },
      setItem: () => { throw new Error('cuota'); },
      removeItem: () => { throw new Error('denegado'); },
    };
    const m = createSaveManager(boom);
    expect(() => m.save(played())).not.toThrow();
    expect(m.load()).toEqual({ status: 'none' });
    expect(() => m.clear()).not.toThrow();
  });
});
