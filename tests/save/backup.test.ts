import { describe, expect, it } from 'vitest';
import { availableNodes, createExpedition, enterNode } from '../../src/engine/expedition';
import { exportBackup, importBackup } from '../../src/save/backup';
import { META_KEY, createMetaManager } from '../../src/save/metaManager';
import { SAVE_KEY, createSaveManager, type StorageLike } from '../../src/save/saveManager';
import { newMeta } from '../../src/engine/meta';

function memory(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

function filled() {
  const s = memory();
  const e = createExpedition(9);
  enterNode(e, availableNodes(e)[0].id);
  e.run.gold = 123;
  createSaveManager(s).save(e);
  const meta = newMeta();
  meta.shards = 42;
  createMetaManager(s).save(meta);
  return s;
}

describe('copia de seguridad', () => {
  it('exportar e importar en otro navegador restaura expedición y progreso', () => {
    const a = filled();
    const b = memory();
    const r = importBackup(b, exportBackup(a));
    expect(r).toEqual({ ok: true, run: true, meta: true });
    const loaded = createSaveManager(b).load();
    expect(loaded.status === 'ok' && loaded.expedition.run.gold).toBe(123);
    expect(createMetaManager(b).load().meta.shards).toBe(42);
  });

  it('una copia solo con progreso permanente no toca la expedición existente', () => {
    const a = memory();
    createMetaManager(a).save({ ...newMeta(), shards: 7 });
    const b = filled();
    expect(importBackup(b, exportBackup(a))).toEqual({ ok: true, run: false, meta: true });
    expect(createMetaManager(b).load().meta.shards).toBe(7);
    expect(b.getItem(SAVE_KEY)).not.toBeNull();
  });

  it('rechaza JSON roto, otro formato, vacío y datos inválidos sin tocar lo que hay', () => {
    const b = filled();
    const before = [b.getItem(SAVE_KEY), b.getItem(META_KEY)];
    const bad = [
      'no es json',
      JSON.stringify({ hola: 1 }),
      JSON.stringify({ format: 'shattered-runeterra-backup', version: 1, run: null, meta: null }),
      JSON.stringify({ format: 'shattered-runeterra-backup', version: 1, run: '{"version":3}', meta: null }),
      JSON.stringify({ format: 'shattered-runeterra-backup', version: 1, run: null, meta: '{{' }),
      JSON.stringify({ format: 'shattered-runeterra-backup', version: 1, run: 5, meta: null }),
    ];
    for (const t of bad) expect(importBackup(b, t).ok).toBe(false);
    expect([b.getItem(SAVE_KEY), b.getItem(META_KEY)]).toEqual(before);
  });

  it('si la expedición es válida pero el progreso no, no se escribe nada', () => {
    const a = filled();
    const b = memory();
    const t = JSON.stringify({ ...JSON.parse(exportBackup(a)), meta: '{"version":99}' });
    expect(importBackup(b, t).ok).toBe(false);
    expect(b.data.size).toBe(0);
  });

  it('sin almacenamiento o con uno que falla no lanza', () => {
    expect(exportBackup(null)).toContain('shattered-runeterra-backup');
    expect(importBackup(null, exportBackup(filled())).ok).toBe(false);
    const full: StorageLike = { getItem: () => null, setItem: () => { throw new Error('cuota'); }, removeItem: () => {} };
    expect(importBackup(full, exportBackup(filled())).ok).toBe(false);
  });
});
