import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { IMG } from './ui/images';
import './styles/index.css';

document.documentElement.style.setProperty('--menu-bg', `url(${IMG.menuBg})`);
document.documentElement.style.setProperty('--map-paper', `url(${IMG.mapPaper})`);
document.documentElement.style.setProperty('--camp-bg', `url(${IMG.camp})`);
document.documentElement.style.setProperty('--shop-bg', `url(${IMG.shop})`);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
