import { META_KEY, createMetaManager } from './metaManager';
import { SAVE_KEY, createSaveManager, type StorageLike } from './saveManager';

const FORMAT = 'shattered-runeterra-backup';

function memory(init: Record<string, string>): StorageLike {
  const data = new Map(Object.entries(init));
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

/** Copia de seguridad en un solo texto: la expedición en curso (si hay) y el progreso permanente, tal como están guardados. */
export function exportBackup(storage: StorageLike | null, now: () => number = Date.now): string {
  let run: string | null = null;
  let meta: string | null = null;
  try {
    run = storage?.getItem(SAVE_KEY) ?? null;
    meta = storage?.getItem(META_KEY) ?? null;
  } catch {
    /* sin almacenamiento: copia vacía */
  }
  return JSON.stringify({ format: FORMAT, version: 1, exportedAt: now(), run, meta });
}

export type ImportResult = { ok: true; run: boolean; meta: boolean } | { ok: false; reason: string };

/**
 * Restaura una copia. Se valida todo en memoria con los mismos gestores del juego y solo si TODO es válido se escribe:
 * una copia dañada o de otro programa nunca pisa lo que ya hay.
 */
export function importBackup(storage: StorageLike | null, text: string): ImportResult {
  if (!storage) return { ok: false, reason: 'No hay almacenamiento disponible en este navegador.' };
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'El archivo no es una copia válida (JSON inválido).' };
  }
  if (typeof data !== 'object' || data === null || data.format !== FORMAT || data.version !== 1) return { ok: false, reason: 'El archivo no es una copia de Shattered Runeterra.' };
  const run = data.run;
  const meta = data.meta;
  if ((run !== null && typeof run !== 'string') || (meta !== null && typeof meta !== 'string')) return { ok: false, reason: 'La copia tiene un formato inesperado.' };
  if (run === null && meta === null) return { ok: false, reason: 'La copia está vacía: no hay nada que restaurar.' };
  if (run !== null) {
    const r = createSaveManager(memory({ [SAVE_KEY]: run })).inspect();
    if (r.corrupt) return { ok: false, reason: `La expedición de la copia no es válida (${r.corrupt}).` };
  }
  if (meta !== null) {
    const m = createMetaManager(memory({ [META_KEY]: meta })).load();
    if (m.corrupt) return { ok: false, reason: `El progreso de la copia no es válido (${m.corrupt}).` };
  }
  try {
    if (run !== null) storage.setItem(SAVE_KEY, run);
    if (meta !== null) storage.setItem(META_KEY, meta);
  } catch {
    return { ok: false, reason: 'No se pudo escribir en el almacenamiento (¿está lleno?).' };
  }
  return { ok: true, run: run !== null, meta: meta !== null };
}
