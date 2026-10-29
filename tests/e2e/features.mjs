// Prueba funciones concretas como las usaría una persona: tienda, forja, descanso, guardado, retirada, copia de seguridad, ajustes,
// teclado, equipo y filtros. Imprime OK/FALLO por cada una. Uso: node tests/e2e/features.mjs <carpeta>
import { readFileSync } from 'node:fs';
import { open } from './play.mjs';

const out = process.argv[2] ?? 'shots';
const s = await open(out, 1280, 800);
const { page } = s;
const results = [];
const check = (name, ok, extra = '') => { results.push([name, ok]); console.log(ok ? 'OK    ' : 'FALLO ', name, extra); };
const st = () => page.evaluate(() => { const g = window.__game.getState(); return { screen: g.screen, gold: g.expedition?.run.gold, deck: g.expedition?.deck.length, relics: g.expedition?.run.relics.length, belt: g.expedition?.run.belt.filter(Boolean).length }; });
const start = async (seed = 5, node) => {
  await page.goto('http://localhost:4173/?debug');
  await page.evaluate(([seed, node]) => {
    const g = window.__game;
    g.newExpedition(seed);
    g.startExpedition();
    const e = g.getState().expedition;
    e.run.gold = 900;
    if (node) { const f = e.map.nodes.find((n) => n.floor === 0); f.type = node; g.chooseNode(f.id); }
  }, [seed, node]);
  await page.waitForTimeout(250);
};

// ——— Tienda ———
await start(5, 'shop');
check('tienda: se abre', (await st()).screen === 'shop');
const before = await st();
await page.getByRole('button', { name: /^Comprar .* por \d+ de oro/ }).first().click();
const mid = await st();
check('tienda: comprar descuenta oro y añade algo', mid.gold < before.gold && (mid.deck > before.deck || mid.relics > before.relics || mid.belt > before.belt), JSON.stringify([before, mid]));
await page.getByRole('button', { name: /Eliminar carta/ }).click({ timeout: 2000 }).catch(() => {});
await page.getByRole('button', { name: /^Comprar Eliminar carta/ }).click().catch(() => {});
if (await page.locator('.modal[aria-label="Eliminar una carta"]').count()) {
  await page.locator('.modal[aria-label="Eliminar una carta"] .btn.sm').first().click();
  check('tienda: eliminar carta', (await st()).deck === mid.deck - 1);
} else check('tienda: eliminar carta (modal)', false);
await page.screenshot({ path: `${out}/f-shop.png` });
await page.getByRole('button', { name: /Salir de la tienda|Seguir/ }).first().click();
check('tienda: salir vuelve al mapa', (await st()).screen === 'map');

// ——— Descanso y forja ———
await start(6, 'rest');
await page.locator('.opt', { hasText: 'Forjar' }).click();
await page.locator('.modal .forgegrid .card, .modal .card').first().click();
const forgeBtn = page.locator('.modal .btn.pri');
await forgeBtn.click();
check('descanso: forjar mejora una carta del mazo', await page.evaluate(() => window.__game.getState().expedition.deck.some((d) => d.endsWith('+'))));
check('descanso: tras forjar no se puede descansar más', await page.locator('.opt', { hasText: 'Descansar' }).isDisabled());
await page.locator('.opt', { hasText: 'Avivar la hoguera' }).click();
check('descanso: avivar la hoguera no gasta el descanso', (await page.evaluate(() => window.__game.getState().expedition.stoked)) === true);
await page.getByRole('button', { name: /Seguir camino|Seguir sin descansar/ }).click();
check('descanso: salir vuelve al mapa', (await st()).screen === 'map');
await start(6, 'rest');
await page.evaluate(() => { const e = window.__game.getState().expedition; e.run.champions[0].hp = 10; });
await page.locator('.opt', { hasText: 'Descansar' }).click();
check('descanso: curar sube la vida', (await page.evaluate(() => window.__game.getState().expedition.run.champions[0].hp)) > 10);

// ——— Evento, tesoro y santuario ———
for (const node of ['event', 'chest', 'shrine']) {
  await start(7, node);
  const sc = (await st()).screen;
  check(`${node}: abre su pantalla`, ['event', 'chest'].includes(sc), sc);
  if (sc === 'event') {
    const opts = page.locator('.evopt:not([disabled])');
    if (await opts.count()) await opts.first().click();
    if (await page.getByRole('button', { name: 'Elegir', exact: true }).count()) await page.getByRole('button', { name: 'Elegir', exact: true }).click();
    await page.getByRole('button', { name: 'Continuar' }).click({ timeout: 2000 }).catch(() => {});
  } else {
    if (await page.getByRole('button', { name: 'Abrir el cofre' }).count()) await page.getByRole('button', { name: 'Abrir el cofre' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click({ timeout: 2000 }).catch(() => {});
  }
  check(`${node}: se sale al mapa`, (await st()).screen === 'map', (await st()).screen);
}

// ——— Combate: teclado, pociones, retirada ———
await start(8, 'combat');
const e0 = await page.evaluate(() => window.__game.getState().combat.energy);
await page.keyboard.press('1');
const sel = await page.locator('.hand .card.sel').count();
check('teclado: la tecla 1 elige la primera carta', sel === 1);
await page.keyboard.press('Escape');
check('teclado: Esc deselecciona', (await page.locator('.hand .card.sel').count()) === 0);
await page.keyboard.press('e');
await page.waitForTimeout(300);
check('teclado: E termina el turno', (await page.evaluate(() => window.__game.getState().combat?.turn ?? 99)) >= 2);
await page.getByRole('button', { name: /Retirada/ }).click();
check('retirada: pide confirmación', (await page.locator('.modal[role=alertdialog]').count()) === 1);
await page.screenshot({ path: `${out}/f-retreat.png` });
await page.getByRole('button', { name: /Volver|Cancelar/ }).first().click();
check('retirada: cancelar sigue en combate', (await page.locator('.cb').count()) === 1);
await page.getByRole('button', { name: /Retirada/ }).click();
await page.locator('.modal[role=alertdialog] .btn.dng, .modal[role=alertdialog] .btn.pri').last().click();
await page.waitForTimeout(400);
check('retirada: confirmar lleva al resultado', (await st()).screen === 'result');

// ——— Guardado y continuar ———
await start(9, 'combat');
await page.keyboard.press('2'); await page.keyboard.press('Escape');
await page.locator('.hand .card:not(.dis)').first().click();
const legal = page.locator('.ftr.legal');
if (await legal.count()) await legal.first().click(); else if (await page.locator('.playbtn').count()) await page.locator('.playbtn').click();
const snap = await page.evaluate(() => { const c = window.__game.getState().combat; return { turn: c.turn, energy: c.energy, hand: c.hand.length }; });
await page.reload();
await page.goto('http://localhost:4173/?debug');
await page.waitForTimeout(300);
const cont = page.getByRole('button', { name: /Continuar/ });
check('guardado: tras recargar aparece «Continuar»', (await cont.count()) === 1);
await cont.click();
await page.waitForTimeout(400);
const snap2 = await page.evaluate(() => { const c = window.__game.getState().combat; return c ? { turn: c.turn, energy: c.energy, hand: c.hand.length } : null; });
check('guardado: el combate reanudado es idéntico', JSON.stringify(snap) === JSON.stringify(snap2), JSON.stringify([snap, snap2]));

// ——— Copia de seguridad y ajustes ———
await page.evaluate(() => window.__game.toMenu());
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar copia' }).click()]);
const path = await dl.path();
const backup = JSON.parse(readFileSync(path, 'utf8'));
check('copia: se exporta un archivo válido con la partida', backup.format === 'shattered-runeterra-backup' && typeof backup.run === 'string');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.goto('http://localhost:4173/?debug');
check('copia: sin datos no hay «Continuar»', (await page.getByRole('button', { name: /^Continuar/ }).count()) === 0);
await page.locator('input[type=file]').setInputFiles(path);
await page.getByRole('button', { name: 'Restaurar' }).click();
await page.waitForLoadState();
await page.waitForTimeout(600);
check('copia: al importar vuelve la partida', (await page.getByRole('button', { name: /^Continuar/ }).count()) === 1);
await page.getByLabel('Reducir movimiento').check();
await page.getByLabel('Alto contraste').check();
check('ajustes: movimiento reducido y alto contraste se aplican', await page.evaluate(() => document.body.classList.contains('calm') && document.body.classList.contains('hc')));
await page.screenshot({ path: `${out}/f-menu-hc.png` });
await page.reload();
check('ajustes: se recuerdan al recargar', await page.evaluate(() => document.body.classList.contains('calm') && document.body.classList.contains('hc')));
await page.getByLabel('Reducir movimiento').uncheck();
await page.getByLabel('Alto contraste').uncheck();

// ——— Equipo, Archivo, Desbloqueos y filtros ———
await page.goto('http://localhost:4173/?debug');
await page.evaluate(() => { window.__game.getState().meta.shards = 5000; });
await page.getByRole('button', { name: /^Desbloqueos/ }).click();
const total = await page.getByRole('button', { name: /Desbloquear · 120 Esquirlas \(/ }).count();
await page.getByLabel('Buscar campeón').fill('zed');
check('filtro: «zed» deja un solo campeón', (await page.getByRole('button', { name: /Desbloquear · 120 Esquirlas \(/ }).count()) === 1, `de ${total}`);
await page.getByLabel('Buscar campeón').fill('');
await page.getByRole('group', { name: 'Línea' }).getByRole('button', { name: 'Tirador' }).click();
check('filtro: la línea Tirador deja 22', (await page.getByRole('button', { name: /Desbloquear · 120 Esquirlas \(/ }).count()) === 22);
await page.getByRole('button', { name: /Desbloquear · 120 Esquirlas \(Jinx\)/ }).click();
await page.screenshot({ path: `${out}/f-unlocks.png` });
check('desbloqueos: comprar Jinx gasta 120', (await page.evaluate(() => window.__game.getState().meta.shards)) === 4880);
await page.getByRole('button', { name: 'Volver al menú' }).click();
await page.getByRole('button', { name: /^Equipo/ }).click();
await page.getByLabel('Buscar campeón').fill('jinx');
await page.locator('.champlist .tcard', { hasText: 'Jinx' }).click();
check('equipo: se ven las 20 cartas de Jinx', (await page.locator('.cardsview .card').count()) === 20);
await page.getByLabel('Ver versión mejorada').check();
check('equipo: versión mejorada marca las 20', (await page.getByText('Mejorada', { exact: true }).count()) === 20);
await page.screenshot({ path: `${out}/f-roster.png` });
await page.getByRole('button', { name: 'Volver al menú' }).click();
await page.getByRole('button', { name: /^Archivo/ }).click();
check('archivo: abre su pantalla', (await page.locator('.screen').count()) === 1);
await page.screenshot({ path: `${out}/f-archive.png` });

console.log('errores de consola:', s.errors());
const fails = results.filter(([, ok]) => !ok);
console.log(fails.length ? `FALLAN ${fails.length} de ${results.length}` : `todas OK (${results.length})`);
await s.close();
if (fails.length || s.errors().length) process.exitCode = 1;
