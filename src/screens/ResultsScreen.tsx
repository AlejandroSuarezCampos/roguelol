import { ChampionPortrait } from '../components/ChampionPortrait';
import { Hud } from '../components/Hud';
import { Icon } from '../components/Icon';
import { HpBar } from '../components/Meters';
import { CHAMPIONS } from '../data/champions';
import { game, useGame } from '../state/gameStore';

const BANNER = {
  victory: { title: 'Victoria', text: 'Viego ha caído. La Niebla Negra se retira de las Islas de la Sombra.', icon: 'boss' },
  defeat: { title: 'Derrota', text: 'El equipo ha caído. Las Islas de la Sombra se cierran sobre vosotros.', icon: 'down' },
  retreat: { title: 'Retirada', text: 'Habéis abandonado la expedición con parte del botín.', icon: 'flag' },
  active: { title: 'Expedición', text: '', icon: 'flag' },
} as const;

export function ResultsScreen() {
  const { expedition: e } = useGame();
  if (!e) return null;
  const b = BANNER[e.status];
  const floors = e.visited.length;
  return (
    <div className={`screen result ${e.status}`}>
      <Hud icon={b.icon} title="Resultado" subtitle="Islas de la Sombra" e={e} />
      <div className="banner">
        <Icon name={b.icon} />
        <h1>{b.title}</h1>
        <p className="sub">{b.text}</p>
      </div>
      {e.status === 'retreat' && e.retreat && (
        <p className="warnbox notice" role="status">
          <Icon name="flag" />
          <span>
            <b>Consecuencias de la retirada:</b> conservas <b>{e.retreat.kept}</b> de {e.retreat.before} de oro y pierdes la recompensa de la victoria.
            {e.difficulty === 'nightmare' ? ' En Pesadilla la penalización es mayor.' : ''}
          </span>
        </p>
      )}
      <div className="result-grid">
        <section className="panel">
          <h3>
            <Icon name="team" /> Equipo
          </h3>
          <div className="row team-end">
            {e.dead.map((id) => (
              <article key={id} className="slotcard dead">
                <ChampionPortrait id={id} className="big" />
                <b className="fd">{CHAMPIONS[id].name}</b>
                <span className="tag bad"><Icon name="down" /> Muerto para siempre</span>
              </article>
            ))}
            {e.run.champions.map((c) => (
              <article key={c.id} className={`slotcard ${c.downed ? 'dead' : ''}`}>
                <ChampionPortrait id={c.id} className="big" />
                <b className="fd">{c.name}</b>
                <HpBar hp={c.hp} max={c.maxHp} />
                {c.downed && <span className="tag bad"><Icon name="down" /> Derribado</span>}
                {e.wounds[c.id] > 0 && <span className="tag"><Icon name="wound" /> Heridas {e.wounds[c.id]}</span>}
              </article>
            ))}
          </div>
        </section>
        <section className="panel">
          <h3>
            <Icon name="book" /> Estadísticas
          </h3>
          <dl className="stats">
            <dt>Nodos recorridos</dt><dd>{floors}</dd>
            <dt>Combates ganados</dt><dd>{e.stats.combats}</dd>
            <dt>Élites vencidas</dt><dd>{e.stats.elites}</dd>
            <dt>Oro conservado</dt><dd>{e.run.gold}</dd>
            <dt>Cartas en el mazo</dt><dd>{e.deck.length}</dd>
            <dt>Niebla final</dt><dd>{e.run.mist}</dd>
          </dl>
          <div className="row end">
            <button className="btn" onClick={() => game.toMenu()}>
              Menú principal
            </button>
            <button className="btn pri" onClick={() => game.newExpedition()}>
              Nueva expedición
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
