import { useState } from 'react';
import { ChampionPortrait } from '../components/ChampionPortrait';
import { Hud } from '../components/Hud';
import { Icon } from '../components/Icon';
import { CHAMPIONS } from '../data/champions';
import { ASCENSION_LEVELS } from '../data/ascension';
import { customKey, dailyPlan, dateKey, isDateKey } from '../engine/daily';
import { streakOf } from '../save/dailyManager';
import { game, useGame } from '../state/gameStore';

/** Retos con equipo, Ascensión y modificador fijos por fecha (o por semilla propia): se comparan puntuaciones solo contigo mismo. */
export function DailyScreen() {
  const { daily } = useGame();
  const [text, setText] = useState('');
  const today = dateKey();
  const plan = dailyPlan(today);
  const mine = daily[today];
  const streak = streakOf(daily, today);
  const history = Object.entries(daily).sort((a, b) => b[1].last - a[1].last).slice(0, 10);
  const key = text.trim() ? customKey(text) : null;
  return (
    <div className="screen perks scene-bg">
      <Hud icon="flag" title="Desafío diario" subtitle="El mismo reto para todos los días">
        <button className="btn" onClick={() => game.toMenu()}>Volver al menú</button>
      </Hud>
      <div className="perk-body">
        <section className="panel dailybox">
          <h2 className="fd sh">Hoy · {today}</h2>
          <div className="row">
            {plan.party.map((id) => (
              <div key={id} className="col" aria-label={CHAMPIONS[id].name}>
                <ChampionPortrait id={id} className="mini" />
                <b>{CHAMPIONS[id].name}</b>
                <small className="sub">{CHAMPIONS[id].role}</small>
              </div>
            ))}
          </div>
          <p>
            <b>{plan.modifier.name}:</b> {plan.modifier.text}
          </p>
          <p className="sub">
            {plan.ascension ? `Ascensión ${plan.ascension}: ${ASCENSION_LEVELS.filter((l) => l.level <= plan.ascension).map((l) => l.text).join(' · ')}` : 'Sin Ascensión.'}
          </p>
          <p className="tag gold" role="status">
            <Icon name="relic" /> Racha: {streak} {streak === 1 ? 'día' : 'días'}
            {mine ? ` · Mejor hoy: ${mine.best}${mine.won ? ' (victoria)' : ''} · ${mine.attempts} ${mine.attempts === 1 ? 'intento' : 'intentos'}` : ' · Aún sin intentar'}
          </p>
          <div className="row end">
            <button className="btn pri" onClick={() => game.startDaily(today)}>{mine ? 'Jugar otra vez' : 'Jugar el reto de hoy'}</button>
          </div>
        </section>
        <section className="panel dailybox">
          <h2 className="fd sh">Semilla propia</h2>
          <p className="sub">Cualquier texto fija el equipo, el mapa y el modificador: compártelo para repetir la misma expedición.</p>
          <label className="row">
            <span>Semilla</span>
            <input value={text} maxLength={24} onChange={(ev) => setText(ev.target.value)} placeholder="p. ej. brumaverde" />
          </label>
          {key && (
            <p className="sub" role="status">
              {dailyPlan(key).party.map((id) => CHAMPIONS[id].name).join(', ')} · {dailyPlan(key).modifier.name}
            </p>
          )}
          <div className="row end">
            <button className="btn" disabled={!key} onClick={() => key && game.startDaily(key)}>Jugar esta semilla</button>
          </div>
        </section>
        {history.length > 0 && (
          <section className="panel dailybox">
            <h2 className="fd sh">Historial</h2>
            <ul className="dailyhist">
              {history.map(([k, r]) => (
                <li key={k}>
                  <b>{isDateKey(k) ? k : `Semilla «${k.slice(5)}»`}</b> · {r.best} puntos · {r.won ? 'victoria' : 'derrota'} · {r.attempts} {r.attempts === 1 ? 'intento' : 'intentos'}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
