// Partidas completas como las jugaría una persona, con muchos equipos distintos, vigilando errores de consola, textos rotos,
// estados imposibles y pantallas atascadas. Uso: node tests/e2e/playtest.mjs <carpeta> [equipos] [semilla] [ascension]
import { open } from './play.mjs';

const [out = 'shots', teams = '6', seed0 = '1', asc = '0'] = process.argv.slice(2);
const s = await open(out, 1280, 800);
const { page } = s;
const problems = [];
const note = (m) => { if (!problems.includes(m)) problems.push(m); };

let a = Number(seed0) * 2654435761 >>> 0;
const rnd = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);

await page.goto('http://localhost:4173/?debug');
const names = await page.evaluate(() => window.__ids);
console.log('campeones:', names.length);

const invariants = () => page.evaluate(() => {
  const g = window.__game.getState();
  const bad = [];
  const c = g.combat;
  if (c) {
    if (c.energy < 0 || c.energy > 12) bad.push(`energía ${c.energy}`);
    for (const side of ['ally', 'enemy']) {
      const pos = c.units.filter((u) => u.side === side && !u.downed).map((u) => u.pos);
      if (new Set(pos).size !== pos.length) bad.push(`posiciones repetidas ${side}: ${pos}`);
    }
    for (const u of c.units) {
      if (!Number.isFinite(u.hp) || u.hp < 0 || u.hp > u.maxHp + 80) bad.push(`vida ${u.id} ${u.hp}/${u.maxHp}`);
      if (u.block < 0 || !Number.isFinite(u.block)) bad.push(`bloqueo ${u.id} ${u.block}`);
      if (u.stress < 0 || u.stress > 120 || !Number.isFinite(u.stress)) bad.push(`estrés ${u.id} ${u.stress}`);
      for (const [k, v] of Object.entries(u.statuses)) if (!Number.isInteger(v) || v < 0) bad.push(`estado ${u.id}.${k}=${v}`);
    }
    if (c.hand.length > 12) bad.push(`mano de ${c.hand.length}`);
  }
  if (g.expedition && g.expedition.run.gold < 0) bad.push(`oro ${g.expedition.run.gold}`);
  return bad;
});
const scan = () => page.evaluate(() => {
  const t = document.body.innerText;
  const m = t.match(/undefined|NaN|\[object|\bnull\b|Infinity/);
  return m ? m[0] : null;
});

async function playTeam(team, seed) {
  await page.goto('http://localhost:4173/?debug');
  await page.evaluate(([team, seed, asc]) => {
    const g = window.__game;
    const m = g.getState().meta;
    m.shards = 1e6;
    for (const id of team) g.buyUnlock('champion:' + id);
    m.maxAscension = Number(asc);
    g.newExpedition(seed, Number(asc));
    g.setParty(team);
    g.startExpedition();
  }, [team, seed, asc]);
  const label = team.join('+');
  let nodes = 0, turns = 0, stuck = 0, last = '';
  for (let step = 0; step < (process.env.GOD ? 4000 : 500); step++) {
    await page.waitForTimeout(25);
    if (process.env.GOD) await page.evaluate(() => {
      const st = window.__game.getState();
      for (const u of st.combat?.units ?? []) if (u.side === 'ally' && !u.downed) { u.hp = u.maxHp; u.stress = 0; }
      for (const c of st.expedition?.run.champions ?? []) if (!c.downed) { c.hp = c.maxHp; c.stress = 0; }
    });
    const bad = await invariants();
    for (const b of bad) note(`[${label}] invariante: ${b}`);
    const junk = await scan();
    if (junk) note(`[${label}] texto roto «${junk}» en ${await page.evaluate(() => document.querySelector('.screen')?.className)}`);
    const key = await page.evaluate(() => JSON.stringify([document.querySelector('.screen')?.className, document.querySelectorAll('.hand .card').length, document.querySelector('.orb b')?.textContent, document.querySelector('.turnb b')?.textContent, document.querySelectorAll('.modal').length, document.querySelector('.nd.picked') ? 1 : 0]));
    if (key === last) stuck++; else stuck = 0;
    last = key;
    if (stuck > 25) { note(`[${label}] atascado en ${key}`); await page.screenshot({ path: `${out}/stuck-${label}.png` }); return { nodes, turns, end: 'atascado' }; }
    if (await page.locator('.screen.result').count()) return { nodes, turns, end: (await page.locator('.result .banner h1').first().textContent().catch(() => '?')) + ' · acto ' + (await page.evaluate(() => window.__game.getState().expedition?.act + 1)) + ' · piso ' + (await page.evaluate(() => window.__game.getState().expedition?.visited.length)) };
    if (await page.locator('.modal.over').count()) { await page.locator('.modal.over .btn.pri').click(); continue; }
    if (await page.locator('.modal[role=alertdialog], .modal[role=dialog]').count() && !(await page.locator('.cb').count())) { /* ventanas de elegir carta/objeto: las gestiona la pantalla */ }
    if (await page.locator('.cb').count()) {
      turns++;
      // una persona: usa pociones si alguien está muy herido, juega lo que pueda con objetivo válido, a veces intercambia
      for (let k = 0; k < 10; k++) {
        const playable = page.locator('.hand .card:not(.dis)');
        const n = await playable.count();
        if (!n) break;
        await playable.nth(Math.floor(rnd() * n)).click();
        const legal = page.locator('.ftr.legal');
        if (await legal.count()) await legal.nth(Math.floor(rnd() * (await legal.count()))).click();
        else if (await page.locator('.playbtn').count()) await page.locator('.playbtn').click();
        else { await page.keyboard.press('Escape'); break; }
        if (await page.locator('.modal.over').count()) break;
        for (const b of await invariants()) note(`[${label}] invariante tras jugar: ${b}`);
      }
      if (await page.locator('.modal.over').count()) continue;
      if (rnd() < 0.15 && (await page.getByRole('button', { name: /Intercambiar/ }).isEnabled())) {
        await page.getByRole('button', { name: /Intercambiar/ }).click();
        const sw = page.locator('.ftr.swap-legal');
        if ((await sw.count()) >= 2) { await sw.nth(0).click(); const t = page.locator('.ftr.swap-legal'); if (await t.count()) await t.first().click(); }
        else await page.keyboard.press('Escape');
      }
      await page.locator('.endbtn').click({ timeout: 3000 }).catch(() => {});
      continue;
    }
    if (await page.locator('.mapscreen').count()) {
      const n = page.locator('.nd.available');
      if (!(await n.count())) { note(`[${label}] mapa sin nodos disponibles`); return { nodes, turns, end: 'sin nodos' }; }
      await n.nth(Math.floor(rnd() * (await n.count()))).click();
      await page.getByRole('button', { name: 'Entrar' }).click();
      nodes++;
      continue;
    }
    if (await page.locator('.screen.reward').count()) {
      if (await page.getByRole('button', { name: 'Elegir carta' }).count()) {
        await page.getByRole('button', { name: 'Elegir carta' }).click();
        const cs = page.locator('.choices .card');
        if (await cs.count()) { await cs.nth(Math.floor(rnd() * (await cs.count()))).click(); await page.getByRole('button', { name: 'Añadir al mazo' }).click(); }
      }
      if (await page.getByRole('button', { name: 'Elegir objeto' }).count()) {
        await page.getByRole('button', { name: 'Elegir objeto' }).click();
        await page.locator('.gearpick').first().click();
        const eq = page.locator('.equipon .btn:not([disabled])');
        if (await eq.count()) await eq.first().click();
        else await page.getByRole('button', { name: /Omitir|Cerrar/ }).first().click();
      }
      if (await page.getByRole('button', { name: 'Recoger', exact: true }).count()) await page.getByRole('button', { name: 'Recoger', exact: true }).click();
      await page.getByRole('button', { name: /Continuar|Ver resultado|Ir al acto/ }).click({ timeout: 3000 }).catch(() => {});
      continue;
    }
    if (await page.locator('.screen.chestscreen').count()) {
      if (await page.getByRole('button', { name: 'Abrir el cofre' }).count()) await page.getByRole('button', { name: 'Abrir el cofre' }).click();
      await page.getByRole('button', { name: 'Continuar' }).click({ timeout: 3000 }).catch(() => {});
      continue;
    }
    if (await page.locator('.screen.shop').count()) {
      // compra lo más barato que pueda y sale
      const buy = page.getByRole('button', { name: /Comprar/ });
      if (await buy.count()) { const b = buy.first(); if (await b.isEnabled()) await b.click(); }
      await page.getByRole('button', { name: 'Salir de la tienda' }).click();
      continue;
    }
    if (await page.locator('.screen.event').count()) {
      if (await page.getByRole('button', { name: 'Continuar' }).count()) { await page.getByRole('button', { name: 'Continuar' }).click(); continue; }
      const opts = page.locator('.evopt:not([disabled])');
      if (await opts.count()) await opts.nth(Math.floor(rnd() * (await opts.count()))).click();
      if (await page.getByRole('button', { name: 'Elegir', exact: true }).count()) await page.getByRole('button', { name: 'Elegir', exact: true }).click();
      continue;
    }
    if (await page.locator('.screen.rest').count()) {
      const forge = page.getByRole('button', { name: /Forjar/ });
      if (rnd() < 0.4 && (await forge.count()) && (await forge.first().isEnabled())) {
        await forge.first().click();
        const c = page.locator('.forgegrid .card, .modal .card');
        if (await c.count()) { await c.first().click(); const ok = page.getByRole('button', { name: /Forjar|Mejorar|Confirmar/ }); if (await ok.count()) await ok.last().click({ timeout: 2000 }).catch(() => {}); }
        await page.keyboard.press('Escape');
      }
      const heal = page.getByRole('button', { name: /Descansar/ });
      if (await heal.isEnabled()) await heal.click();
      await page.getByRole('button', { name: /Seguir/ }).click({ timeout: 3000 }).catch(() => {});
      continue;
    }
    if (await page.locator('.screen.teamscreen').count()) { await page.getByRole('button', { name: /Volver al mapa/ }).click(); continue; }
  }
  return { nodes, turns, end: 'límite de pasos' };
}

const results = [];
for (let t = 0; t < Number(teams); t++) {
  const team = [];
  while (team.length < 4) { const n = names[Math.floor(rnd() * names.length)]; if (!team.includes(n)) team.push(n); }
  const r = await playTeam(team, 1000 + t * 7 + Number(seed0));
  results.push({ team: team.join('+'), ...r });
  console.log(team.join('+').padEnd(46), JSON.stringify(r));
}
console.log('errores de consola:', s.errors());
console.log(problems.length ? `PROBLEMAS (${problems.length}):\n - ${problems.join('\n - ')}` : 'sin problemas');
await s.close();
if (problems.length || s.errors().length) process.exitCode = 1;
