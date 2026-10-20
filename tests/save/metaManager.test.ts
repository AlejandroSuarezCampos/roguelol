import { describe, expect, it } from 'vitest';
import { newMeta } from '../../src/engine/meta';
import { META_CORRUPT_KEY, META_KEY, META_VERSION, createMetaManager } from '../../src/save/metaManager';
import type { StorageLike } from '../../src/save/saveManager';

function memory(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

describe('guardado del progreso permanente', () => {
  it('sin nada guardado devuelve un progreso nuevo', () => {
    const r = createMetaManager(memory()).load();
    expect(r.meta).toEqual(newMeta());
    expect(r.corrupt).toBeNull();
  });

  it('ida y vuelta, con versión', () => {
    const store = memory();
    const m = createMetaManager(store);
    const meta = newMeta();
    meta.shards = 120;
    meta.perks.vigor = 2;
    meta.bestiary.wolf = { seen: 4, defeated: 3 };
    meta.history.runs = 5;
    m.save(meta);
    expect(JSON.parse(store.data.get(META_KEY)!).version).toBe(META_VERSION);
    expect(m.load().meta).toEqual(meta);
  });

  it('un progreso dañado se descarta con copia de seguridad y se empieza de cero', () => {
    const store = memory();
    store.setItem(META_KEY, '{roto');
    const r = createMetaManager(store).load();
    expect(r.meta).toEqual(newMeta());
    expect(r.corrupt).toMatch(/JSON/);
    expect(store.data.get(META_CORRUPT_KEY)).toBe('{roto');
    expect(store.data.has(META_KEY)).toBe(false);
  });

  it.each([
    ['Esquirlas negativas', (r: any) => (r.meta.shards = -1)],
    ['un nivel de mejora de 7', (r: any) => (r.meta.perks.vigor = 7)],
    ['una mejora que no existe', (r: any) => delete r.meta.perks.vigor],
    ['un bestiario con basura', (r: any) => (r.meta.bestiary.wolf = { seen: 'x' })],
    ['un historial incompleto', (r: any) => delete r.meta.history.runs],
    ['una Ascensión de 11', (r: any) => (r.meta.maxAscension = 11)],
    ['otra versión', (r: any) => (r.version = 99)],
  ])('rechaza %s', (_n, tamper) => {
    const store = memory();
    const m = createMetaManager(store);
    m.save(newMeta());
    const raw = JSON.parse(store.data.get(META_KEY)!);
    tamper(raw);
    store.setItem(META_KEY, JSON.stringify(raw));
    expect(m.load().corrupt).not.toBeNull();
  });

  it('un progreso de la versión 1 (con Pesadilla) se migra sin perder Esquirlas ni historial', () => {
    const store = memory();
    const old = newMeta() as any;
    delete old.maxAscension;
    const { deaths, ...history } = old.history;
    old.shards = 77;
    old.history = { ...history, runs: 3, nightmareDeaths: 2 };
    store.setItem(META_KEY, JSON.stringify({ version: 1, meta: old }));
    const r = createMetaManager(store).load();
    expect(r.corrupt).toBeNull();
    expect(r.meta.shards).toBe(77);
    expect(r.meta.maxAscension).toBe(0);
    expect(r.meta.history).toMatchObject({ runs: 3, deaths: 2 });
    void deaths;
  });

  it('sin almacenamiento, o con uno que falla, nada lanza', () => {
    const none = createMetaManager(null);
    expect(() => none.save(newMeta())).not.toThrow();
    expect(none.load().meta).toEqual(newMeta());
    const boom: StorageLike = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => { throw new Error('x'); } };
    const m = createMetaManager(boom);
    expect(() => m.save(newMeta())).not.toThrow();
    expect(m.load().meta).toEqual(newMeta());
    expect(() => m.clear()).not.toThrow();
  });

  it('borrar elimina el progreso', () => {
    const store = memory();
    const m = createMetaManager(store);
    const meta = newMeta();
    meta.shards = 9;
    m.save(meta);
    m.clear();
    expect(m.load().meta.shards).toBe(0);
  });
});
