import { useState } from 'react';
import { ChampionPortrait } from '../components/ChampionPortrait';
import { Hud } from '../components/Hud';
import { Icon } from '../components/Icon';
import { Portrait } from '../components/Portrait';
import { ENEMY_ART, ENEMY_COLOR } from '../data/art';
import { CHAMPIONS, CHAMPION_IDS, CRISIS } from '../data/champions';
import { ENEMIES } from '../data/enemies';
import { CRISIS_INFO } from '../data/glossary';
import type { Intent } from '../engine/types';
import { game, useGame } from '../state/gameStore';

type Tab = 'champions' | 'bestiary' | 'history';
const TABS: { id: Tab; label: string }[] = [
  { id: 'champions', label: 'Campeones' },
  { id: 'bestiary', label: 'Bestiario' },
  { id: 'history', label: 'Historial' },
];

const intentText = (i: Intent): string =>
  i.kind === 'attack' ? `Ataque ${i.amount}${i.crit ? ' (crítico)' : ''} a la posición ${i.target}` : i.kind === 'block' ? `Bloqueo ${i.amount}` : i.kind === 'stress' ? `Estrés ${i.amount} a la posición ${i.target}` : `Se adelanta a la posición ${i.to}`;

/** Archivo: campeones, bestiario (lo no visto sale como «???») e historial de expediciones. */
export function ArchiveScreen() {
  const { meta } = useGame();
  const [tab, setTab] = useState<Tab>('champions');
  const h = meta.history;
  return (
    <div className="screen archive scene-bg">
      <Hud icon="book" title="Archivo" subtitle="Lo que recuerdan las Islas">
        <button className="btn" onClick={() => game.toMenu()}>
          Volver al menú
        </button>
      </Hud>
      <div className="archive-body">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'champions' && (
          <div className="grid4">
            {CHAMPION_IDS.map((id) => {
              const c = CHAMPIONS[id];
              const crisis = CRISIS_INFO[CRISIS[id]];
              return (
                <article key={id} className="panel entry">
                  <ChampionPortrait id={id} className="big" />
                  <h2 className="sh">{c.name}</h2>
                  <p className="sub">{c.role}</p>
                  <p className="sub">Rasgos: {c.traits.join(' · ')}</p>
                  <span className="tag warn" title={crisis.text}>
                    <Icon name="warn" /> Crisis: {crisis.name}
                  </span>
                </article>
              );
            })}
          </div>
        )}
        {tab === 'bestiary' && (
          <div className="grid4">
            {Object.values(ENEMIES).map((d) => {
              const b = meta.bestiary[d.id];
              if (!b || !b.seen)
                return (
                  <article key={d.id} className="panel entry locked" aria-label="Enemigo sin descubrir">
                    <div className="port big mystery" aria-hidden><Icon name="lock" /></div>
                    <h2 className="sh">???</h2>
                    <p className="sub">Aún no te has enfrentado a este enemigo.</p>
                  </article>
                );
              return (
                <article key={d.id} className="panel entry">
                  <Portrait src={ENEMY_ART[d.id]} mono={d.name[0]} color={ENEMY_COLOR[d.id] ?? '#fff'} fit="monster" className="big" />
                  <h2 className="sh">{d.name}</h2>
                  <p className="sub">
                    Visto {b.seen} {b.seen === 1 ? 'vez' : 'veces'} · derrotado {b.defeated}
                  </p>
                  <p className="sub">Vida {d.maxHp}</p>
                  {b.defeated > 0 ? (
                    <ul className="sub">
                      {d.script.map((i, k) => (
                        <li key={k}>{intentText(i)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="sub">Derrótalo para conocer sus intenciones.</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
        {tab === 'history' && (
          <section className="panel">
            <dl className="stats">
              <dt>Expediciones</dt><dd>{h.runs}</dd>
              <dt>Victorias</dt><dd>{h.victories}</dd>
              <dt>Derrotas</dt><dd>{h.defeats}</dd>
              <dt>Retiradas</dt><dd>{h.retreats}</dd>
              <dt>Mejor piso alcanzado</dt><dd>{h.bestFloor}</dd>
              <dt>Combates ganados</dt><dd>{h.combatsWon}</dd>
              <dt>Campeones perdidos para siempre</dt><dd>{h.deaths}</dd>
            </dl>
          </section>
        )}
      </div>
    </div>
  );
}
