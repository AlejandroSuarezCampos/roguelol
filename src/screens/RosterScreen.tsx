import { useState } from 'react';
import { Card } from '../components/Card';
import { ChampionPortrait } from '../components/ChampionPortrait';
import { Hud } from '../components/Hud';
import { Icon } from '../components/Icon';
import { CARD_LIST, applyUpgrade } from '../data/cards';
import { CHAMPIONS, CHAMPION_IDS, CRISIS } from '../data/champions';
import { CRISIS_INFO } from '../data/glossary';
import { GEAR_LIST } from '../data/gear';
import { championAvailable } from '../engine/meta';
import { GearItem } from '../components/GearItem';
import { DEFAULT_STATS } from '../engine/stats';
import type { ChampionId, StatBlock } from '../engine/types';
import { game, useGame } from '../state/gameStore';
import { statLines } from '../ui/format';

/** Equipo (menú): fichas de los campeones, su objeto inicial y su colección de cartas. El resto del gear se gestiona dentro de una expedición. */
export function RosterScreen() {
  const { meta } = useGame();
  const [sel, setSel] = useState<ChampionId>('leona');
  const [upgraded, setUpgraded] = useState(false);
  const c = CHAMPIONS[sel];
  const crisis = CRISIS_INFO[CRISIS[sel]];
  const base: StatBlock = { ...DEFAULT_STATS, ...c.stats };
  const starters = GEAR_LIST.filter((g) => g.starter && meta.unlocked.includes(`starter:${g.id}`));
  const chosen = meta.loadout[sel] ?? null;
  const cards = CARD_LIST.filter((x) => x.owner === sel);
  return (
    <div className="screen roster scene-bg">
      <Hud icon="team" title="Equipo" subtitle="Campeones y cartas">
        <button className="btn" onClick={() => game.toMenu()}>
          Volver al menú
        </button>
      </Hud>
      <div className="roster-body">
        <nav className="panel champlist" aria-label="Campeones">
          {CHAMPION_IDS.map((id) => (
            <button key={id} className={`tcard ${id === sel ? 'on' : ''}`} aria-pressed={id === sel} onClick={() => setSel(id)}>
              <ChampionPortrait id={id} className="mini" />
              <span className="tinfo">
                <b>{CHAMPIONS[id].name}</b>
                <small className="sub">{championAvailable(meta, id) ? CHAMPIONS[id].role : 'Bloqueado: se desbloquea en Desbloqueos'}</small>
              </span>
            </button>
          ))}
        </nav>
        <section className="panel sheet">
          <h3>
            <Icon name="team" /> {c.name} · {c.role}
          </h3>
          <div className="sheetrow">
            <ChampionPortrait id={sel} className="big" />
            <div className="col grow">
              <p className="sub">Rasgos: {c.traits.join(' · ')}</p>
              <span className="tag">Vida máxima {c.maxHp}</span>
              <span className="tag">Bonus de posición en {c.sweetSpot.join('–')}</span>
              <span className="tag warn" title={crisis.text}>
                <Icon name="warn" /> Crisis: {crisis.name}
              </span>
              <p className="sub small">{crisis.text}</p>
            </div>
          </div>
          <h4 className="fd">Objeto inicial</h4>
          {starters.length ? (
            <div className="col" role="radiogroup" aria-label={`Objeto inicial de ${c.name}`}>
              <label className="row">
                <input type="radio" name="starter" checked={chosen === null} onChange={() => game.setStarter(sel, null)} /> Ninguno
              </label>
              {starters.map((g) => (
                <label key={g.id} className="row">
                  <input type="radio" name="starter" checked={chosen === g.id} onChange={() => game.setStarter(sel, g.id)} aria-label={g.name} />
                  <GearItem id={g.id} compact />
                </label>
              ))}
              <small className="sub">Empieza la expedición equipado en el primer hueco.</small>
            </div>
          ) : (
            <p className="sub">Desbloquea objetos iniciales en Desbloqueos para elegir con cuál empieza cada campeón.</p>
          )}
          <h4 className="fd">Estadísticas base</h4>
          <dl className="statlist">
            {statLines(base, 0, true).map((l) => (
              <div key={l.key} className="statrow">
                <dt>{l.label}</dt>
                <dd>{l.value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="panel cardsview">
          <h3>
            <Icon name="card" /> Cartas de {c.name}
          </h3>
          <label className="row">
            <input type="checkbox" checked={upgraded} onChange={(ev) => setUpgraded(ev.target.checked)} /> Ver versión mejorada
          </label>
          <div className="forgegrid">
            {cards.map((x) => {
              const d = upgraded ? applyUpgrade(x) : x;
              return <Card key={x.id} card={d} cost={d.cost} upgraded={upgraded} />;
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
