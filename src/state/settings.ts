import { browserStorage, type StorageLike } from '../save/saveManager';

export const SETTINGS_KEY = 'shattered-runeterra:settings';

/** Preferencias de accesibilidad y de interfaz (por navegador; no forman parte de la partida). */
export interface Settings {
  /** Sin animaciones ni transiciones (además de respetar `prefers-reduced-motion`). */
  calm: boolean;
  /** Más contraste en textos y bordes. */
  contrast: boolean;
}

export const DEFAULT_SETTINGS: Settings = { calm: false, contrast: false };

export function loadSettings(storage: StorageLike | null = browserStorage()): Settings {
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const d = JSON.parse(raw);
    return { calm: d?.calm === true, contrast: d?.contrast === true };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings, storage: StorageLike | null = browserStorage()): void {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* sin almacenamiento: la preferencia dura lo que la sesión */
  }
}

/** Pone o quita las clases del `body` que activan cada preferencia. */
export function applySettings(s: Settings, body: HTMLElement = document.body): void {
  body.classList.toggle('calm', s.calm);
  body.classList.toggle('hc', s.contrast);
}
