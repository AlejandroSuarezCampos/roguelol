// Juega una expedición entera haciendo clic como un jugador. Uso: node tests/e2e/full.mjs <carpeta> [maxPasos]
import { open } from './play.mjs';

const out = process.argv[2] ?? 'shots';
const max = Number(process.argv[3] ?? 600);
const s = await open(out);
const { page } = s;
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
await page.getByRole('button', { name: /Expedición/ }).click();
await page.getByRole('button', { name: /Comenzar/ }).click();
const seen = new Set();
const once = async (name) => { if (!seen.has(name)) { seen.add(name); await shot(name); } };
let fights = 0;

for (let step = 0; step < max; step++) {
  await page.waitForTimeout(60);
  if (await page.locator('.screen.result').count()) { await once('90-result'); break; }
  if (await page.locator('.modal.over').count()) {
    await once('50-over');
    await page.locator('.modal.over .btn.pri').click();
    continue;
  }
  if (await page.locator('.cb').count()) {
    // jugar cartas mientras haya alguna jugable
    for (let k = 0; k < 8; k++) {
      const playable = page.locator('.hand .card:not(.dis)');
      if (!(await playable.count())) break;
      await playable.first().click();
      if (k === 0) await once('10-selected');
      const legal = page.locator('.ftr.legal');
      if (await legal.count()) { await legal.first().click(); }
      else if (await page.getByRole('button', { name: 'Jugar carta' }).count()) await page.getByRole('button', { name: 'Jugar carta' }).click();
      else break;
      if (await page.locator('.modal.over').count()) break;
    }
    if (await page.locator('.modal.over').count()) continue;
    await once('20-played');
    await page.getByRole('button', { name: 'Terminar turno' }).click();
    continue;
  }
  if (await page.locator('.mapscreen').count()) {
    await once('30-map');
    const n = page.locator('.nd.available');
    await n.nth(Math.floor(Math.random() * (await n.count()))).click();
    await page.getByRole('button', { name: 'Entrar' }).click();
    fights++;
    continue;
  }
  if (await page.locator('.screen.reward').count()) {
    await once('60-reward');
    if (await page.getByRole('button', { name: 'Elegir carta' }).count()) {
      await page.getByRole('button', { name: 'Elegir carta' }).click();
      await once('61-choose');
      await page.locator('.choices .card').first().click();
      await page.getByRole('button', { name: 'Añadir al mazo' }).click();
    }
    if (await page.getByRole('button', { name: 'Recoger', exact: true }).count()) await page.getByRole('button', { name: 'Recoger', exact: true }).click();
    await page.getByRole('button', { name: /Continuar|Ver resultado/ }).click();
    continue;
  }
  if (await page.locator('.screen.shop').count()) {
    await once('80-shop');
    await page.getByRole('button', { name: 'Salir de la tienda' }).click();
    continue;
  }
  if (await page.locator('.screen.event').count()) {
    await once('85-event');
    if (await page.getByRole('button', { name: 'Continuar' }).count()) { await page.getByRole('button', { name: 'Continuar' }).click(); continue; }
    const opts = page.locator('.evopt:not([disabled])');
    await opts.last().click();
    if (await page.getByRole('button', { name: 'Elegir', exact: true }).count()) await page.getByRole('button', { name: 'Elegir', exact: true }).click();
    await once('86-event-result');
    continue;
  }
  if (await page.locator('.screen.rest').count()) {
    await once('70-rest');
    const heal = page.getByRole('button', { name: /Descansar/ });
    if (await heal.isEnabled()) await heal.click();
    await page.getByRole('button', { name: /Seguir/ }).click();
    continue;
  }
}
await shot('99-final');
console.log('nodos recorridos:', fights, '| errores de consola:', s.errors());
console.log('pantalla final:', await page.locator('.screen.result').count() ? 'resultado' : 'sin terminar');
await s.close();
