// Juega un combate solo con el teclado (Tab, Enter, Espacio y atajos) y comprueba que todo es alcanzable. Uso: node tests/e2e/keyboard.mjs <carpeta>
import { open } from './play.mjs';

const s = await open(process.argv[2] ?? 'shots', 1280, 800);
const { page } = s;
const kb = page.keyboard;
const problems = [];

/** Tab hasta que el elemento enfocado cumpla `test` (dentro de `max` pulsaciones). */
async function tabTo(test, what, max = 80) {
  for (let i = 0; i < max; i++) {
    await kb.press('Tab');
    if (await page.evaluate(test)) return true;
  }
  problems.push(`no se llega con Tab a: ${what}`);
  return false;
}
const focusedText = () => page.evaluate(() => document.activeElement?.textContent ?? '');

await page.goto('http://localhost:4173/');
// Menú → Expedición
await tabTo(() => document.activeElement?.tagName === 'BUTTON' && /Expedición/.test(document.activeElement.textContent), 'Expedición');
await kb.press('Enter');
await tabTo(() => document.activeElement?.tagName === 'BUTTON' && /Comenzar/.test(document.activeElement.textContent), 'Comenzar');
await kb.press('Enter');
// Mapa: primer nodo disponible y Entrar
await tabTo(() => document.activeElement?.classList.contains('nd') && document.activeElement.classList.contains('available'), 'nodo del mapa');
await kb.press('Enter');
await tabTo(() => document.activeElement?.tagName === 'BUTTON' && /Entrar/.test(document.activeElement.textContent), 'Entrar');
await kb.press('Enter');
await page.waitForSelector('.cb', { timeout: 5000 });

// Combate: hasta 6 turnos, jugando con atajos y Tab para elegir objetivo
for (let turn = 0; turn < 6 && !(await page.locator('.modal.over').count()); turn++) {
  for (let k = 1; k <= 5; k++) {
    if (await page.locator('.modal.over').count()) break;
    await kb.press(String(k));
    if (!(await page.locator('.hand .card.sel').count())) continue;
    if (await page.getByRole('button', { name: 'Jugar carta' }).count()) { await page.getByRole('button', { name: 'Jugar carta' }).focus(); await kb.press('Enter'); continue; }
    if (await page.locator('.ftr.legal').count()) {
      const ok = await tabTo(() => document.activeElement?.classList.contains('legal'), 'objetivo válido');
      if (ok) await kb.press('Enter');
    }
    await kb.press('Escape');
  }
  if (await page.locator('.modal.over').count()) break;
  await kb.press('e');
  await page.waitForTimeout(150);
}
const state = await page.evaluate(() => ({ over: !!document.querySelector('.modal.over'), turn: document.querySelector('.turnb b')?.textContent }));
console.log('estado final:', state, '| errores de consola:', s.errors());
if (!state.over && Number(state.turn) < 2) problems.push('los atajos no hicieron avanzar el combate');
console.log(problems.length ? `PROBLEMAS:\n - ${problems.join('\n - ')}` : 'teclado: todo alcanzable');
await s.close();
if (problems.length || s.errors().length) process.exitCode = 1;
