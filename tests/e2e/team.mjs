// Captura la pantalla de Equipo con gear y el botín de gear. Usa `?debug` para preparar el estado. Uso: node tests/e2e/team.mjs <carpeta>
import { open } from './play.mjs';

const out = process.argv[2] ?? 'shots';
const s = await open(out);
const { page } = s;
await page.goto('http://localhost:4173/?debug');
await page.evaluate(() => {
  const g = window.__game;
  g.newExpedition(7);
  g.startExpedition();
  const e = g.getState().expedition;
  e.inventory.push('infinity', 'rabadon', 'warmog', 'thornmail');
  e.run.gold = 140;
  e.wounds.lux = 1;
  e.run.champions[2].maxHp = 41;
  e.run.champions[2].hp = 30;
  g.openTeam();
});
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/t1-team.png`, fullPage: false });
await page.getByRole('button', { name: /^Yasuo/ }).click();
await page.getByRole('button', { name: 'Equipar en Yasuo' }).first().click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/t2-team-equipped.png` });
await page.evaluate(() => {
  const g = window.__game;
  const e = g.getState().expedition;
  e.run.relics.push('stone', 'clock', 'bowl', 'voidshard');
  g.closeTeam();
  const n = e.map.nodes.find((x) => x.floor === 0);
  g.chooseNode(n.id);
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/t3-battle-relics.png` });
await page.getByRole('button', { name: /Corazón|Talismán/ }).first().click().catch(() => {});
await page.screenshot({ path: `${out}/t4-relic-open.png` });
console.log('errores:', s.errors());
await s.close();
