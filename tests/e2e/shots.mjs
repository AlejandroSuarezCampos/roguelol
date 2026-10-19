// Capturas de las pantallas con Chromium real. Uso: node tests/e2e/shots.mjs <carpeta de salida>
// Requiere `npm run build` y sirve dist/ con `vite preview`.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'shots';
mkdirSync(out, { recursive: true });
const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:4173/');
await page.screenshot({ path: `${out}/01-menu.png` });
await page.getByRole('button', { name: /Expedición/ }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/02-prep.png` });
console.log('errores de consola:', errors.filter((e) => !/net::|Failed to load resource/.test(e)));
await browser.close();
server.kill();
