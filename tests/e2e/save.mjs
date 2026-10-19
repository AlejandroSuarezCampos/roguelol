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
await page.reload();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/save-menu.png` });
const cont = page.getByRole('button', { name: /Continuar/ });
console.log('botón continuar visible tras recargar:', await cont.count());
await cont.click();
console.log('de vuelta en el mapa:', await page.locator('.mapscreen').count());
console.log('errores:', s.errors());
await s.close();
