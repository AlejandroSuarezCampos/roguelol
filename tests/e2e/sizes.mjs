// Capturas de varias pantallas en un tamaño dado para revisar la maquetación. Uso: node tests/e2e/sizes.mjs <carpeta> <ancho> <alto>
import { open } from './play.mjs';

const [out = 'shots', w = '1280', h = '720'] = process.argv.slice(2);
const s = await open(out, Number(w), Number(h));
const { page } = s;
await page.goto('http://localhost:4173/?debug');
await page.evaluate(() => {
  const g = window.__game;
  g.newExpedition(7);
  g.startExpedition();
  const e = g.getState().expedition;
  e.inventory.push('infinity', 'warmog');
  e.run.relics.push('stone', 'bowl', 'heart');
  e.run.gold = 400;
});
const shot = async (name) => { await page.waitForTimeout(250); await page.screenshot({ path: `${out}/${w}x${h}-${name}.png` }); };
await shot('map');
await page.evaluate(() => window.__game.openTeam());
await shot('team');
await page.evaluate(() => window.__game.closeTeam());
await page.evaluate(() => {
  const g = window.__game; const e = g.getState().expedition;
  const first = e.map.nodes.find((n) => n.floor === 0); first.type = 'shop'; g.chooseNode(first.id);
});
await shot('shop');
console.log('errores:', s.errors());
await s.close();
