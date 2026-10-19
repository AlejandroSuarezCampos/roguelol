import { Hud } from '../components/Hud';
import { Icon } from '../components/Icon';
import { TeamStrip } from '../components/TeamStrip';
import { DIFFICULTIES } from '../data/difficulty';
import { CONFIG } from '../engine/config';
import type { RestAction } from '../engine/expedition';
import { game, useGame } from '../state/gameStore';

const R = CONFIG.expedition.rest;

/** Una acción por parada (curar, calmar o tratar una herida); avivar la hoguera es aparte. */
export function RestScreen() {
  const { expedition: e, hint } = useGame();
  if (!e) return null;
  const woundsTotal = Object.values(e.wounds).reduce((a, b) => a + b, 0);
  const options: { id: RestAction; icon: string; name: string; text: string; disabled: boolean; extra?: boolean }[] = [
    { id: 'heal', icon: 'heal', name: 'Descansar', text: `Cura el ${Math.round(DIFFICULTIES[e.difficulty].restHeal * 100)}% de la vida máxima a quienes siguen en pie.`, disabled: e.restUsed },
    { id: 'calm', icon: 'stress', name: 'Meditar', text: `Reduce ${R.stressRelief} de estrés a todo el equipo.`, disabled: e.restUsed },
    {
      id: 'treat', icon: 'wound', name: 'Tratar herida',
      text: woundsTotal ? 'Cura la herida del campeón más herido y recupera su vida máxima.' : 'Nadie tiene heridas.',
      disabled: e.restUsed || woundsTotal === 0,
    },
    { id: 'stoke', icon: 'burn', name: 'Avivar la hoguera', text: `Baja ${-CONFIG.mist.stoke} de Niebla. No gasta tu descanso.`, disabled: e.stoked, extra: true },
  ];
  return (
    <div className="screen rest scene-bg">
      <Hud icon="rest" title="Descanso" subtitle="Una hoguera entre la Niebla" e={e} />
      <div className="rest-body">
        <section className="panel">
          <h3>
            <Icon name="rest" /> Elige una acción
          </h3>
          <div className="opts">
            {options.map((o) => (
              <button key={o.id} className={`opt ${o.extra ? 'extra' : ''}`} disabled={o.disabled} onClick={() => game.restAction(o.id)}>
                <Icon name={o.icon} />
                <b>{o.name}</b>
                <span>{o.text}</span>
                {o.disabled && <em>{o.id === 'stoke' ? 'Ya avivada' : e.restUsed ? 'Ya descansaste' : 'No disponible'}</em>}
              </button>
            ))}
          </div>
          {hint && <p className="hint-msg" role="status">{hint}</p>}
          <div className="row end">
            <button className="btn pri" onClick={() => game.leaveRest()}>
              {e.restUsed ? 'Seguir camino' : 'Seguir sin descansar'}
            </button>
          </div>
        </section>
        <section className="panel">
          <h3>
            <Icon name="team" /> Equipo
          </h3>
          <TeamStrip e={e} />
        </section>
      </div>
    </div>
  );
}
