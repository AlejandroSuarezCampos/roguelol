import { createExpedition } from '../../src/engine/expedition';
import type { DifficultyId } from '../../src/data/difficulty';
import { playExpedition } from './bot';

const N = Number(process.argv[2] ?? 300);
for (const difficulty of (process.argv[3] ? [process.argv[3]] : ['normal', 'nightmare']) as DifficultyId[]) {
  const by: Record<string, { n: number; won: number; turns: number }> = {};
  const status: Record<string, number> = {};
  let floors = 0;
  let deaths = 0;
  for (let i = 0; i < N; i++) {
    const e = createExpedition(1000 + i, difficulty);
    const r = playExpedition(e, 7 * i + 1);
    deaths += e.dead.length;
    status[r.status] = (status[r.status] ?? 0) + 1;
    floors += r.floorReached + 1;
    for (const f of r.fights) {
      const b = (by[f.kind] ??= { n: 0, won: 0, turns: 0 });
      b.n++;
      b.won += f.won ? 1 : 0;
      b.turns += f.turns;
    }
  }
  console.log(`\n== ${difficulty} · expediciones: ${N}`, status, `piso medio: ${(floors / N).toFixed(2)}`, `muertes por run: ${(deaths / N).toFixed(2)}`);
  for (const [k, b] of Object.entries(by)) console.log(k.padEnd(7), `combates ${b.n}`, `victorias ${(100 * b.won / b.n).toFixed(0)}%`, `turnos medios ${(b.turns / b.n).toFixed(1)}`);
}
