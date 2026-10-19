import { ChampionPortrait } from '../components/ChampionPortrait';
import { Hud } from '../components/Hud';
import { Icon } from '../components/Icon';
import { HpBar, StressMeter } from '../components/Meters';
import { CHAMPIONS } from '../data/champions';
import { CRISIS_INFO, OMEN_INFO } from '../data/glossary';
import { CRISIS } from '../data/champions';
import { CONFIG } from '../engine/config';
import type { Pos } from '../engine/types';
import { game, useGame } from '../state/gameStore';

export function PartySetupScreen() {
  const { expedition: e } = useGame();
  if (!e) return null;
  const order = [...e.run.champions].sort((a, b) => b.pos - a.pos); // 4 → 1: el frente mira al centro
  const omen = OMEN_INFO[e.run.omen];
  return (
    <div className="screen setup scene-bg">
      <Hud icon="flag" title="Preparación" subtitle="Islas de la Sombra" e={e} />
      <div className="setup-body">
        <section className="panel region">
          <h3>
            <Icon name="map" /> Región
          </h3>
          <div className="regimg" />
          <b className="fd">Islas de la Sombra</b>
          <p className="sub">La Niebla Negra lo cubre todo. Cada paso la espesa; los caídos no descansan.</p>
        </section>
        <section className="panel party">
          <h3>
            <Icon name="team" /> Orden de combate
          </h3>
          <p className="sub">Reordena libremente y gratis. Las cartas ganan su bonus en el punto fuerte de cada campeón.</p>
          <div className="lineup" role="list">
            {order.map((c, i) => {
              const def = CHAMPIONS[c.id];
              const crisis = CRISIS_INFO[CRISIS[c.id]];
              return (
                <article key={c.id} className="slotcard" role="listitem" aria-label={`${c.name}, posición ${c.pos}`}>
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
                </article>
              );
            })}
          </div>
        </section>
        <section className="panel rules">
          <h3>
            <Icon name="help" /> Reglas de la run
          </h3>
          <div className="col">
            <div className="warnbox">
              <Icon name="down" />
              <div>
                <b>Presagio de los caídos: {omen.name}</b>
                <p className="sub">{omen.text} Fijo toda la expedición.</p>
              </div>
            </div>
            <div className="warnbox red">
              <Icon name="wound" />
              <div>
                <b>Dificultad Normal</b>
                <p className="sub">
                  Un campeón derribado sobrevive a la victoria con una herida grave: −{CONFIG.expedition.wound.maxHpLoss * 100}% de vida máxima
                  (hasta {CONFIG.expedition.wound.cap}). Se trata en el descanso.
                </p>
              </div>
            </div>
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
