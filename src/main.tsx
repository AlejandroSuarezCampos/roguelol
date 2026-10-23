import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { game } from './state/gameStore';
import { applySettings, loadSettings } from './state/settings';
import { IMG } from './ui/images';
import './styles/index.css';

document.documentElement.style.setProperty('--menu-bg', `url(${IMG.menuBg})`);
document.documentElement.style.setProperty('--map-paper', `url(${IMG.mapPaper})`);
document.documentElement.style.setProperty('--camp-bg', `url(${IMG.camp})`);
document.documentElement.style.setProperty('--shop-bg', `url(${IMG.shop})`);

applySettings(loadSettings());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Atajo para pruebas e2e y depuración: `?debug` expone el store en `window.__game`.
if (new URLSearchParams(location.search).has('debug')) (window as unknown as { __game: typeof game }).__game = game;
