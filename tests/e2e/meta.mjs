// Captura las pantallas de metaprogresión (menú, Mejoras, Archivo, Equipo). Uso: node tests/e2e/meta.mjs <carpeta>
import { open } from './play.mjs';

const out = process.argv[2] ?? 'shots';
const s = await open(out);
const { page } = s;
await page.goto('http://localhost:4173/?debug');
await page.evaluate(() => {
  const m = window.__game.getState().meta;
  m.shards = 130;
  m.perks.vigor = 1;
  m.bestiary.wolf = { seen: 4, defeated: 3 };
  m.bestiary.gromp = { seen: 1, defeated: 0 };
  m.history = { runs: 6, victories: 1, defeats: 3, retreats: 2, bestFloor: 7, combatsWon: 19, nightmareDeaths: 2 };
  window.__game.toMenu();
});
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/m1-menu.png` });
await page.getByRole('button', { name: /^Mejoras/ }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/m2-upgrades.png` });
await page.getByRole('button', { name: 'Volver al menú' }).click();
await page.getByRole('button', { name: /^Archivo/ }).click();
await page.getByRole('tab', { name: 'Bestiario' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/m3-archive.png` });
await page.getByRole('button', { name: 'Volver al menú' }).click();
await page.getByRole('button', { name: /^Equipo/ }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/m4-roster.png`, fullPage: false });
console.log('errores:', s.errors());
await s.close();
