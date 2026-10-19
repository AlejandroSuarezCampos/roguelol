// Comprueba en Chromium real que la expedición se guarda y se retoma al recargar. Uso: node tests/e2e/save.mjs <carpeta>
import { open } from './play.mjs';

const out = process.argv[2] ?? 'shots';
const s = await open(out);
const { page } = s;
await page.getByRole('button', { name: /Expedición/ }).click();
await page.getByRole('button', { name: /Comenzar/ }).click();
await page.locator('.nd.available').first().click();
await page.getByRole('button', { name: 'Entrar' }).click();
await page.locator('.cb').waitFor();
await page.locator('.hand .card:not(.dis)').first().click();
const turnBefore = await page.locator('.turnb').innerText();
const energyBefore = await page.locator('.orb').innerText();
await page.reload();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/save-menu.png` });
const cont = page.getByRole('button', { name: /Continuar/ });
console.log('botón continuar visible tras recargar:', await cont.count());
await cont.click();
await page.locator('.cb').waitFor();
console.log('reanudado en pleno combate:', await page.locator('.cb').count(), '| mismo turno:', (await page.locator('.turnb').innerText()) === turnBefore, '| misma energía:', (await page.locator('.orb').innerText()) === energyBefore);
console.log('errores:', s.errors());
await s.close();
