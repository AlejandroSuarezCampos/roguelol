// Captura el combate con imágenes simuladas (sin red) para revisar proporciones de sprites y cartas.
import { open } from './play.mjs';

const out = process.argv[2] ?? 'shots';
const s = await open(out, Number(process.argv[3] ?? 1600), Number(process.argv[4] ?? 900));
const { page } = s;
await page.route(/ddragon|communitydragon/, (route) => {
  const url = route.request().url();
  const loading = /loading|splash/.test(url);
  const w = loading ? 308 : 128;
  const h = loading ? 560 : 128;
  const hue = [...url].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 0);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},60%,55%)"/><stop offset="1" stop-color="hsl(${hue + 60},50%,20%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w / 2}" cy="${h * 0.3}" r="${w * 0.18}" fill="#fff6"/><rect x="${w * 0.25}" y="${h * 0.5}" width="${w * 0.5}" height="${h * 0.5}" fill="#0006"/></svg>`;
  route.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg });
});
await page.getByRole('button', { name: /Expedición/ }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/s2-prep.png` });
await page.getByRole('button', { name: /Comenzar/ }).click();
await page.locator('.nd.available').first().click();
await page.getByRole('button', { name: 'Entrar' }).click();
await page.waitForTimeout(500);
await page.locator('.hand .card:not(.dis)').first().click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/s4-battle.png` });
console.log(s.errors());
await s.close();
