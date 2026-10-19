import type { Expedition } from '../engine/expedition';
import { ChampionPortrait } from './ChampionPortrait';
import { Icon } from './Icon';
import { HpBar, StressMeter } from './Meters';

/** Los 4 campeones con vida, estrés y heridas. `onPick` permite usarlos como destino (pociones). */
export function TeamStrip({ e, onPick, armed }: { e: Expedition; onPick?: (id: Expedition['run']['champions'][number]['id']) => void; armed?: boolean }) {
  const order = [...e.run.champions].sort((a, b) => b.pos - a.pos);
  return (
    <div className="teamstrip">
      {order.map((c) => (
        <button
          key={c.id}
          className={`tcard ${c.downed ? 'down' : ''} ${armed && !c.downed ? 'armed' : ''}`}
          disabled={!onPick}
          onClick={() => onPick?.(c.id)}
          aria-label={`${c.name}: vida ${c.hp} de ${c.maxHp}, estrés ${c.stress}${e.wounds[c.id] ? `, ${e.wounds[c.id]} heridas` : ''}${c.downed ? ', derribado' : ''}`}
        >
          <ChampionPortrait id={c.id} className="mini" />
          <span className="tinfo">
            <b>
              {c.name} {e.wounds[c.id] > 0 && <span className="wd" title="Herida grave: vida máxima reducida"><Icon name="wound" />{e.wounds[c.id]}</span>}
            </b>
            <HpBar hp={c.hp} max={c.maxHp} />
            <StressMeter value={c.stress} />
          </span>
        </button>
      ))}
    </div>
  );
}
