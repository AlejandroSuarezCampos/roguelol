// Auditoría de accesibilidad con axe-core en cada pantalla. Uso: node tests/e2e/a11y.mjs [carpeta]
// Requiere axe-core (`npm i --no-save axe-core`): no es dependencia del proyecto.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { open } from './play.mjs';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const s = await open(process.argv[2] ?? 'shots', 1280, 800);
const { page } = s;
const found = new Map();
const audit = async (name) => {
  await page.waitForTimeout(300);
  await page.evaluate(axeSource);
  const r = await page.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }));
  for (const v of r.violations) {
    const k = `${v.id} (${v.impact})`;
    if (!found.has(k)) found.set(k, { help: v.help, where: [] });
    found.get(k).where.push(`${name}: ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' ; ')} [${v.nodes.length}]`);
  }
};
const fresh = async (node) => {
  await page.goto('http://localhost:4173/?debug');
  await page.evaluate((t) => {
    const g = window.__game;
    g.newExpedition(7);
    g.startExpedition();
    const e = g.getState().expedition;
    e.inventory.push('infinity', 'warmog');
    e.run.relics.push('stone', 'bowl', 'heart');
    e.run.gold = 400;
    if (t) { const f = e.map.nodes.find((n) => n.floor === 0); f.type = t; g.chooseNode(f.id); }
  }, node);
};
await page.goto('http://localhost:4173/');
await audit('menu');
await page.getByRole('button', { name: /Expedición/ }).click();
await audit('preparacion');
await page.getByRole('button', { name: 'Comenzar' }).click();
await audit('mapa');
for (const n of ['combat', 'shop', 'event', 'rest', 'chest', 'shrine']) { await fresh(n); await audit(n); }
await fresh();
await page.evaluate(() => window.__game.openTeam());
await audit('equipo');
for (const sc of ['roster', 'upgrades', 'archive']) {
  await page.goto('http://localhost:4173/?debug');
  await page.evaluate((x) => window.__game.openMenuScreen(x), sc);
  await audit(sc);
}
for (const [k, v] of found) console.log(`\n${k}: ${v.help}\n  ${v.where.join('\n  ')}`);
console.log(found.size ? `\n${found.size} tipos de problema` : 'sin violaciones');
await s.close();
if (found.size) process.exitCode = 1;
