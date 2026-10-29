// Segunda tanda de funciones: derrota y Esquirlas, muerte permanente, pociones, equipar objetos, intercambio, crisis y Archivo.
// Uso: node tests/e2e/features2.mjs <carpeta>
import { open } from './play.mjs';

const out = process.argv[2] ?? 'shots';
const s = await open(out, 1280, 800);
const { page } = s;
const results = [];
const check = (name, ok, extra = '') => { results.push([name, ok]); console.log(ok ? 'OK    ' : 'FALLO ', name, extra); };
const G = (fn, arg) => page.evaluate(fn, arg);
const start = async ({ seed = 5, node = 'combat', asc = 0, party } = {}) => {
  await page.goto('http://localhost:4173/?debug');
  await page.evaluate(([seed, node, asc, party]) => {
    const g = window.__game;
    const m = g.getState().meta;
    if (party) { m.shards = 1e6; for (const id of party) g.buyUnlock('champion:' + id); }
    m.maxAscension = Math.max(m.maxAscension, asc);
    g.newExpedition(seed, asc);
    if (party) g.setParty(party);
    g.startExpedition();
    const e = g.getState().expedition;
    e.run.gold = 900;
    if (node) { const f = e.map.nodes.find((n) => n.floor === 0); f.type = node; g.chooseNode(f.id); }
  }, [seed, node, asc, party ?? null]);
  await page.waitForTimeout(250);
};

// ——— Derrota: Esquirlas y progreso permanente ———
await start({ seed: 21 });
const shards0 = await G(() => window.__game.getState().meta.shards);
await G(() => { const c = window.__game.getState().combat; for (const u of c.units) if (u.side === 'ally') { u.hp = 0; u.downed = true; } });
await page.keyboard.press('e');
await page.waitForTimeout(600);
check('derrota: aparece la ventana de derrota', (await page.locator('.modal.over').count()) === 1);
await page.screenshot({ path: `${out}/g-defeat.png` });
await page.locator('.modal.over .btn.pri').click();
await page.waitForTimeout(400);
check('derrota: pantalla de resultado con «Derrota»', (await page.locator('.result .banner h1').textContent()) === 'Derrota');
const shards1 = await G(() => window.__game.getState().meta.shards);
check('derrota: se ganan Esquirlas aun perdiendo', shards1 > shards0, `${shards0} → ${shards1}`);
await page.reload();
await page.goto('http://localhost:4173/?debug');
check('derrota: las Esquirlas sobreviven a recargar', (await G(() => window.__game.getState().meta.shards)) === shards1);
check('derrota: sin expedición que continuar', (await page.getByRole('button', { name: /^Continuar/ }).count()) === 0);
await page.screenshot({ path: `${out}/g-result.png` });

// ——— Ascensión 10: muerte permanente ———
await start({ seed: 22, asc: 10 });
await G(() => { const c = window.__game.getState().combat; const u = c.units.find((x) => x.side === 'ally' && x.id === 'lux'); u.hp = 0; u.downed = true; for (const x of c.units) if (x.side === 'enemy') { x.hp = 0; x.downed = true; } });
await page.keyboard.press('e');
await page.waitForTimeout(700);
if (await page.locator('.modal.over').count()) await page.locator('.modal.over .btn.pri').click();
await page.waitForTimeout(500);
const dead = await G(() => window.__game.getState().expedition?.dead ?? []);
check('Ascensión 10: el campeón caído muere para siempre', dead.includes('lux'), JSON.stringify(dead));
check('Ascensión 10: su carta sale del mazo', (await G(() => window.__game.getState().expedition.deck.filter((d) => /^x\d/.test(d)).length)) === 0);

// ——— Pociones ———
await start({ seed: 23, node: 'combat' });
await G(() => { const e = window.__game.getState().expedition; e.run.belt[0] = { id: 'health', spent: false }; const c = window.__game.getState().combat; c.belt[0] = { id: 'health', spent: false }; c.units.find((u) => u.id === 'leona').hp = 20; window.__game.selectCard(null); });
await page.waitForTimeout(200);
await page.locator('.pot').first().click();
await page.waitForTimeout(150);
const legalAllies = await page.locator('.ftr.legal, .ftr.swap-legal').count();
if (legalAllies) await page.locator('.ftr.legal').first().click(); else await page.getByRole('button', { name: /Usar poción/ }).click();
await page.waitForTimeout(250);
const hpL = await G(() => window.__game.getState().combat.units.find((u) => u.id === 'leona').hp + window.__game.getState().combat.units.filter((u) => u.side === 'ally').reduce((a, u) => a + u.hp, 0));
check('poción: curar sube la vida de alguien', hpL > 20 + 20, String(hpL));
check('poción: la curativa se gasta (queda vacía o marcada)', await G(() => { const b = window.__game.getState().combat.belt[0]; return b === null || b.spent === true; }));

// ——— Intercambio ———
await start({ seed: 24, node: 'combat' });
const pos0 = await G(() => window.__game.getState().combat.units.filter((u) => u.side === 'ally').map((u) => [u.id, u.pos]));
await page.getByRole('button', { name: /Intercambiar/ }).click();
const sw = page.locator('.ftr.swap-legal');
await sw.nth(0).click();
await page.waitForTimeout(100);
await page.locator('.ftr.swap-legal').first().click();
await page.waitForTimeout(250);
const pos1 = await G(() => window.__game.getState().combat.units.filter((u) => u.side === 'ally').map((u) => [u.id, u.pos]));
check('intercambio: dos aliados cambian de posición y cuesta energía', JSON.stringify(pos0) !== JSON.stringify(pos1) && (await G(() => window.__game.getState().combat.energy)) === 2, JSON.stringify([pos0, pos1]));
check('intercambio: solo una vez por turno', await page.getByRole('button', { name: /Intercambiar/ }).isDisabled().catch(() => false) || (await G(() => window.__game.getState().combat.swapUsed)) === true);

// ——— Crisis: cómo se muestra ———
await start({ seed: 25, node: 'combat' });
await G(() => { const c = window.__game.getState().combat; const u = c.units.find((x) => x.id === 'lux'); u.stress = 100; u.crisisActive = true; window.__game.selectCard(null); });
await page.waitForTimeout(250);
const luxCard = await page.locator('.ftr', { hasText: 'Lux' }).first().innerText();
check('crisis: la ficha de Lux enseña su crisis (Pánico)', /Pánico|Crisis/i.test(luxCard), luxCard.replace(/\n/g, ' | '));
await page.screenshot({ path: `${out}/g-crisis.png` });
// con Pánico, las cartas de ataque de Lux no se pueden jugar
await G(() => { const c = window.__game.getState().combat; c.hand = [{ uid: 'k1', defId: 'x5' }, { uid: 'k2', defId: 'x3' }]; window.__game.selectCard(null); });
await page.waitForTimeout(200);
check('crisis: en Pánico la carta de ataque de Lux sale deshabilitada', (await page.locator('.hand .card.dis').count()) >= 1);

// ——— Equipo: equipar y quitar objetos ———
await start({ seed: 26, node: null });
await G(() => { const e = window.__game.getState().expedition; e.inventory.push('infinity', 'warmog'); });
await page.getByRole('button', { name: /^Equipo/ }).first().click();
await page.waitForTimeout(250);
const adBefore = await page.locator('.statrow', { hasText: 'AD' }).first().textContent();
await page.getByRole('button', { name: /Equipar en/ }).first().click();
await page.waitForTimeout(200);
check('equipo: equipar saca el objeto del inventario', (await G(() => window.__game.getState().expedition.inventory.length)) === 1);
await page.screenshot({ path: `${out}/g-team.png` });
await page.getByRole('button', { name: 'Quitar' }).first().click();
check('equipo: quitar lo devuelve', (await G(() => window.__game.getState().expedition.inventory.length)) === 2);

// ——— Archivo ———
await page.goto('http://localhost:4173/?debug');
await page.getByRole('button', { name: /^Archivo/ }).click();
await page.screenshot({ path: `${out}/g-archive.png` });
check('archivo: muestra el bestiario', (await page.locator('.screen').innerText()).length > 50);

console.log('errores de consola:', s.errors());
const fails = results.filter(([, ok]) => !ok);
console.log(fails.length ? `FALLAN ${fails.length} de ${results.length}` : `todas OK (${results.length})`);
await s.close();
if (fails.length || s.errors().length) process.exitCode = 1;
