// Captura la preparación y el combate de Pesadilla con un campeón derribado. Uso: node tests/e2e/nightmare.mjs <carpeta>
import { open } from './play.mjs';

const out = process.argv[2] ?? 'shots';
const s = await open(out);
const { page } = s;
await page.goto('http://localhost:4173/?debug');
await page.evaluate(() => window.__game.newExpedition(5));
await page.getByRole('radio', { name: /Pesadilla/ }).click({ force: true });
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/n1-prep.png` });
await page.evaluate(() => {
  const g = window.__game;
  g.startExpedition();
  const e = g.getState().expedition;
  g.chooseNode(e.map.nodes.find((n) => n.floor === 0).id);
  const lux = g.getState().combat.units.find((u) => u.id === 'lux');
  lux.hp = 0;
  lux.downed = true;
  g.notify(null);
});
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/n2-battle.png` });
console.log('errores:', s.errors());
await s.close();
