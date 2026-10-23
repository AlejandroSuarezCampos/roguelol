// Recorre las pantallas en un tamaño de móvil y avisa de botones fuera de la pantalla o de desbordamiento horizontal.
// Uso: node tests/e2e/mobile.mjs <carpeta> [ancho] [alto]
import { open } from './play.mjs';

const [out = 'shots', w = '390', h = '844'] = process.argv.slice(2);
const s = await open(out, Number(w), Number(h));
const { page } = s;
const problems = [];
const check = async (name) => {
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${out}/m${w}x${h}-${name}.png` });
  const r = await page.evaluate(() => {
    const over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const out = [];
    for (const b of document.querySelectorAll('button, [role=button]')) {
      if (b.closest('.hand')) continue; // la mano se desplaza
      const rc = b.getBoundingClientRect();
      if (!rc.width || !rc.height || getComputedStyle(b).visibility === 'hidden') continue;
      if (rc.right > innerWidth + 1 || rc.left < -1) out.push((b.getAttribute('aria-label') || b.textContent || b.className).trim().slice(0, 30));
    }
    return { over, out };
  });
  if (r.over > 1) problems.push(`${name}: desborda +${r.over}px`);
  if (r.out.length) problems.push(`${name}: fuera de pantalla → ${r.out.join(' | ')}`);
};
const fresh = async (types = {}) => {
  await page.goto('http://localhost:4173/?debug');
  await page.evaluate((t) => {
    const g = window.__game;
    g.newExpedition(7);
    g.startExpedition();
    const e = g.getState().expedition;
    e.inventory.push('infinity', 'warmog');
    e.run.relics.push('stone', 'bowl', 'heart');
    e.run.gold = 400;
    if (t.node) { const f = e.map.nodes.find((n) => n.floor === 0); f.type = t.node; g.chooseNode(f.id); }
  }, types);
};

await page.goto('http://localhost:4173/');
await check('menu');
await page.getByRole('button', { name: /Expedición/ }).click();
await check('preparacion');
await page.getByRole('button', { name: 'Comenzar' }).click();
await check('mapa');
for (const node of ['combat', 'elite', 'boss', 'shop', 'event', 'rest', 'chest', 'shrine']) {
  await fresh({ node });
  await check(node);
}
await fresh();
await page.evaluate(() => window.__game.openTeam());
await check('equipo');
for (const sc of ['roster', 'upgrades', 'archive']) {
  await page.goto('http://localhost:4173/?debug');
  await page.evaluate((x) => window.__game.openMenuScreen(x), sc);
  await check(sc);
}
console.log('errores de consola:', s.errors());
console.log(problems.length ? `PROBLEMAS (${w}x${h}):\n - ${problems.join('\n - ')}` : `sin problemas (${w}x${h})`);
await s.close();
if (problems.length || s.errors().length) process.exitCode = 1;
