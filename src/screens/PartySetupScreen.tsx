import { ChampionPortrait } from '../components/ChampionPortrait';
import { Hud } from '../components/Hud';
import { Icon } from '../components/Icon';
import { HpBar, StressMeter } from '../components/Meters';
import { useState } from 'react';
import { CHAMPIONS, CHAMPION_IDS, PARTY_SIZE } from '../data/champions';
import { championAvailable } from '../engine/meta';
import { CRISIS_INFO, OMEN_INFO } from '../data/glossary';
import { CRISIS } from '../data/champions';
import { ASCENSION_LEVELS } from '../data/ascension';
import { CONFIG } from '../engine/config';
import { modsOf } from '../engine/expedition';
import type { ChampionId, Pos } from '../engine/types';
import { game, useGame } from '../state/gameStore';

export function PartySetupScreen() {
  const { expedition: e, meta, hint } = useGame();
  const [draft, setDraft] = useState<ChampionId[] | null>(null);
  if (!e) return null;
  const available = CHAMPION_IDS.filter((id) => championAvailable(meta, id));
  const picked = draft ?? e.party;
  const toggle = (id: ChampionId) => {
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
    if (next.length === PARTY_SIZE) {
      setDraft(null);
      game.setParty(next);
    } else setDraft(next.length > PARTY_SIZE ? picked : next);
  };
  const order = [...e.run.champions].sort((a, b) => b.pos - a.pos); // 4 → 1: el frente mira al centro
  const omen = OMEN_INFO[e.run.omen];
  return (
    <div className="screen setup scene-bg">
      <Hud icon="flag" title="Preparación" subtitle="Islas de la Sombra" e={e} />
      <div className="setup-body">
        <section className="panel region">
          <h2 className="sh">
            <Icon name="map" /> Región
          </h2>
          <div className="regimg" />
          <b className="fd">Islas de la Sombra</b>
          <p className="sub">La Niebla Negra lo cubre todo. Cada paso la espesa; los caídos no descansan.</p>
        </section>
        <section className="panel party">
          <h2 className="sh">
            <Icon name="team" /> Orden de combate
          </h2>
          {available.length > PARTY_SIZE && (
            <div className="partypick" role="group" aria-label="Campeones de la expedición">
              <small className="sub">Elige {PARTY_SIZE} campeones ({picked.length}/{PARTY_SIZE}):</small>
              {available.map((id) => (
                <button key={id} className={`btn sm ${picked.includes(id) ? 'pri' : ''}`} aria-pressed={picked.includes(id)} onClick={() => toggle(id)}>
                  {CHAMPIONS[id].name}
                </button>
              ))}
              {hint && <small className="hint-msg" role="status">{hint}</small>}
            </div>
          )}
          <p className="sub">Reordena libremente y gratis. Las cartas ganan su bonus en el punto fuerte de cada campeón.</p>
          <div className="lineup" role="list">
            {order.map((c, i) => {
              const def = CHAMPIONS[c.id];
              const crisis = CRISIS_INFO[CRISIS[c.id]];
              return (
                <div key={c.id} className="slotcard" role="listitem" aria-label={`${c.name}, posición ${c.pos}`}>
                  <header>
                    <span className="pn" aria-hidden>{c.pos}</span>
                    <small>{c.pos === 1 ? 'Frente' : c.pos === 4 ? 'Fondo' : `Posición ${c.pos}`}</small>
                  </header>
                  <ChampionPortrait id={c.id} className="big" />
                  <b className="fd">{c.name}</b>
                  <small className="sub">{def.role}</small>
                  <HpBar hp={c.hp} max={c.maxHp} />
                  <StressMeter value={c.stress} />
                  <span className={`tag ${def.sweetSpot.includes(c.pos) ? 'ok' : ''}`}>
                    Bonus en {def.sweetSpot.join('–')} {def.sweetSpot.includes(c.pos) ? '✓' : ''}
                  </span>
                  <span className="tag warn" title={`${crisis.name}: ${crisis.text}`}>
                    <Icon name="warn" /> Crisis: {crisis.name}
                  </span>
                  <div className="row mv">
                    <button className="btn" disabled={i === 0} onClick={() => game.reorderTeam(c.id, (c.pos + 1) as Pos)} aria-label={`Mover a ${c.name} hacia el fondo`}>
                      ←
                    </button>
                    <button className="btn" disabled={i === order.length - 1} onClick={() => game.reorderTeam(c.id, (c.pos - 1) as Pos)} aria-label={`Mover a ${c.name} hacia el frente`}>
                      →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel rules">
          <h2 className="sh">
            <Icon name="help" /> Reglas de la run
          </h2>
          <div className="col">
            <div className="warnbox">
              <Icon name="down" />
              <div>
                <b>Presagio de los caídos: {omen.name}</b>
                <p className="sub">{omen.text} Fijo toda la expedición.</p>
              </div>
            </div>
            <fieldset className="diffpick">
              <legend className="fd">Ascensión</legend>
              <div className="row">
                <button className="btn sm" aria-label="Bajar Ascensión" disabled={e.ascension === 0} onClick={() => game.setAscension(e.ascension - 1)}>
                  −
                </button>
                <b aria-live="polite">{e.ascension ? `Ascensión ${e.ascension}` : 'Sin Ascensión'}</b>
                <button className="btn sm" aria-label="Subir Ascensión" disabled={e.ascension >= meta.maxAscension} onClick={() => game.setAscension(e.ascension + 1)}>
                  +
                </button>
              </div>
              <small className="sub">
                {meta.maxAscension < ASCENSION_LEVELS.length
                  ? `Gana una expedición en Ascensión ${meta.maxAscension} para desbloquear la ${meta.maxAscension + 1}.`
                  : 'Has desbloqueado todos los niveles.'}
              </small>
              {e.ascension > 0 && (
                <ol className="sub ascrules">
                  {ASCENSION_LEVELS.filter((l) => l.level <= e.ascension).map((l) => (
                    <li key={l.level} value={l.level}>
                      {l.text}
                    </li>
                  ))}
                </ol>
              )}
            </fieldset>
            {!modsOf(e).permadeath ? (
              <div className="warnbox">
                <Icon name="wound" />
                <div>
                  <b>Herida grave</b>
                  <p className="sub">
                    Un campeón derribado al ganar un combate sobrevive con una herida grave: −{CONFIG.expedition.wound.maxHpLoss * 100}% de vida máxima (hasta{' '}
                    {CONFIG.expedition.wound.cap}). Se trata en el descanso.
                  </p>
                </div>
              </div>
            ) : (
              <div className="warnbox red" role="alert">
                <Icon name="down" />
                <div>
                  <b>Muerte permanente</b>
                  <p className="sub">
                    Si un campeón <b>sigue derribado</b> cuando termina un combate, <b>muere para siempre</b>: sale del equipo y sus cartas salen del mazo.
                    Si lo reanimas antes del final, sobrevive con una herida grave. Sin tiradas ocultas.
                  </p>
                </div>
              </div>
            )}
            <p className="sub">Mazo inicial: {e.deck.length} cartas. Máximo {CONFIG.cardsPerChampion} cartas por campeón y turno. Energía {CONFIG.energyPerTurn}.</p>
          </div>
          <div className="row end">
            <button className="btn" onClick={() => game.toMenu()}>
              Volver
            </button>
            <button className="btn pri" onClick={() => game.startExpedition()}>
              Comenzar
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
