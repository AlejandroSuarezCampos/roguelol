import { useState } from 'react';
import { Hud } from '../components/Hud';
import { Icon } from '../components/Icon';
import { game, useGame } from '../state/gameStore';
import { IMG } from '../ui/images';

const ART = { void: IMG.void, camp: IMG.camp, menu: IMG.menuBg } as const;

/** Ilustración enmarcada a la izquierda; texto narrativo y opciones `[Acción] ganancia · coste` a la derecha. */
export function EventScreen() {
  const { expedition: e, event, eventOutcome, hint } = useGame();
  const [pending, setPending] = useState<number | null>(null);
  if (!e || !event) return null;
  return (
    <div className="screen event scene-bg">
      <Hud icon="event" title={event.title} subtitle="Evento · Islas de la Sombra" e={e} />
      <div className="evlayout">
        <figure className="evart">
          <img src={ART[event.art]} alt="" />
        </figure>
        <section className="panel evtext">
          <h2 className="fd">{event.title}</h2>
          {event.text.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {eventOutcome ? (
            <div className="evout">
              <p>
                <Icon name="check" /> {eventOutcome.result}
              </p>
              {eventOutcome.lines.length > 0 && (
                <ul>
                  {eventOutcome.lines.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              )}
              <button className="btn pri" onClick={() => game.leaveEvent()}>
                Continuar
              </button>
            </div>
          ) : (
            <div className="evopts">
              {event.choices.map((c, i) => {
                const blocked = game.eventBlocked(i);
                return (
                  <button key={i} className="evopt" disabled={!!blocked} onClick={() => (c.irreversible ? setPending(i) : game.chooseEventOption(i))}>
                    <b>[{c.label}]</b> <span className="gain">{c.gain}</span> · <span className={`cost ${c.tone}`}>{c.cost}</span>
                    {blocked && <em>{blocked}</em>}
                  </button>
                );
              })}
            </div>
          )}
          {hint && <p className="hint-msg" role="status">{hint}</p>}
        </section>
      </div>
      {pending !== null && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Confirmar">
          <div className="panel">
            <h3>
              <Icon name="warn" /> {event.choices[pending].label}
            </h3>
            <p className="warnbox red">
              <Icon name="warn" /> <span>Perderás la oportunidad para siempre.</span>
            </p>
            <div className="row">
              <button className="btn" onClick={() => setPending(null)}>
                Volver
              </button>
              <button
                className="btn pri"
                onClick={() => {
                  game.chooseEventOption(pending);
                  setPending(null);
                }}
              >
                Elegir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
