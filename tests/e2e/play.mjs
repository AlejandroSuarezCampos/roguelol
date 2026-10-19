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
  console.log('errores:', s.errors());
  await s.close();
}
