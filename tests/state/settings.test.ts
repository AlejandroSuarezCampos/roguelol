// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { StorageLike } from '../../src/save/saveManager';
import { DEFAULT_SETTINGS, SETTINGS_KEY, applySettings, loadSettings, saveSettings } from '../../src/state/settings';

function memory(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

describe('preferencias', () => {
  it('sin nada guardado, valores por defecto', () => {
    expect(loadSettings(memory())).toEqual(DEFAULT_SETTINGS);
  });
  it('ida y vuelta', () => {
    const m = memory();
    saveSettings({ calm: true, contrast: true }, m);
    expect(loadSettings(m)).toEqual({ calm: true, contrast: true });
  });
  it('datos dañados o de otro tipo no rompen: se vuelve a los valores por defecto', () => {
    const m = memory();
    m.setItem(SETTINGS_KEY, '{{');
    expect(loadSettings(m)).toEqual(DEFAULT_SETTINGS);
    m.setItem(SETTINGS_KEY, JSON.stringify({ calm: 'sí', contrast: 1 }));
    expect(loadSettings(m)).toEqual(DEFAULT_SETTINGS);
  });
  it('sin almacenamiento, o con uno que lanza, no falla', () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS, null)).not.toThrow();
    const bad: StorageLike = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => {} };
    expect(loadSettings(bad)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS, bad)).not.toThrow();
  });
  it('aplicar pone y quita las clases del body', () => {
    applySettings({ calm: true, contrast: true });
    expect(document.body.classList.contains('calm') && document.body.classList.contains('hc')).toBe(true);
    applySettings(DEFAULT_SETTINGS);
    expect(document.body.classList.contains('calm') || document.body.classList.contains('hc')).toBe(false);
  });
});
