// Juega la app en Chromium real y captura pantallas. Uso: node tests/e2e/play.mjs <carpeta> [paso...]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

export async function open(out, w = 1600, h = 900) {
  mkdirSync(out, { recursive: true });
  const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  if (process.env.STUB !== '0') {
    // Sin red no cargan los retratos de Riot: se sirven imágenes simuladas para revisar proporciones.
    await page.route(/ddragon|communitydragon/, (route) => {
      const url = route.request().url();
      const tall = /loading|splash/.test(url);
      const [w, h] = tall ? [308, 560] : [128, 128];
      const hue = [...url].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 0);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},60%,55%)"/><stop offset="1" stop-color="hsl(${hue + 60},50%,20%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w / 2}" cy="${h * 0.3}" r="${w * 0.18}" fill="#fff6"/><rect x="${w * 0.25}" y="${h * 0.5}" width="${w * 0.5}" height="${h * 0.5}" fill="#0006"/></svg>`;
      route.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg });
    });
  }
  await page.goto('http://localhost:4173/');
  return { page, errors: () => errors.filter((e) => !/net::|Failed to load resource|ERR_/.test(e)), close: async () => { await browser.close(); server.kill(); } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2] ?? 'shots';
  const s = await open(out);
  const { page } = s;
  await page.getByRole('button', { name: /Expedición/ }).click();
  await page.getByRole('button', { name: /Comenzar/ }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/03-map.png` });
  await page.locator('.nd.available').first().click();
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/04-battle.png` });
  console.log('errores:', s.errors());
  await s.close();
}
