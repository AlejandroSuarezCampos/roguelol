import { useState } from 'react';
import { Card } from '../components/Card';
import { Hud } from '../components/Hud';
import { Icon } from '../components/Icon';
import { CARDS } from '../data/cards';
import { CONFIG } from '../engine/config';
import { POTIONS } from '../engine/potions';
import { game, useGame } from '../state/gameStore';

/** Botín en un único panel, como Slay the Spire: oro, carta (elige 1 de N o salta) y poción. */
export function RewardScreen() {
  const { expedition: e, rewards: r, cardClaimed, potionClaimed, hint, combatKind } = useGame();
  const [choosing, setChoosing] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  if (!e || !r) return null;
  const potion = r.potion ? POTIONS[r.potion] : null;
  const beltFull = !e.run.belt.includes(null);
  const last = combatKind === 'boss';
  return (
    <div className="screen reward scene-bg">
      <Hud icon="chest" title="Botín" subtitle={last ? 'Jefe vencido' : 'Combate ganado'} e={e} />
      <div className="reward-body">
        <section className="panel rewardlist">
          <h3>
            <Icon name="chest" /> Recompensas
          </h3>
          <ul>
            <li className="done">
              <Icon name="gold" /> <b>{r.gold} de oro</b> <span className="tag ok">Recogido</span>
            </li>
            <li className={cardClaimed ? 'done' : ''}>
              <Icon name="card" /> <b>Una carta nueva</b> <small className="sub">elige 1 de {r.cardOptions} para el mazo (o salta)</small>
              {cardClaimed ? <span className="tag ok">Elegida</span> : <button className="btn" onClick={() => setChoosing(true)}>Elegir carta</button>}
            </li>
            {potion && (
              <li className={potionClaimed ? 'done' : ''}>
                <Icon name="potion" /> <b>{potion.name}</b>
                {potionClaimed ? (
                  <span className="tag ok">Recogida</span>
                ) : beltFull ? (
                  <span className="belt-swap">
                    <small className="sub">Cinturón lleno. Sustituye:</small>
                    {e.run.belt.map((p, i) => (
                      <button key={i} className="btn sm" onClick={() => game.claimPotion(i)}>
                        {p ? POTIONS[p.id].name : 'Vacío'}
                      </button>
                    ))}
                    <button className="btn sm" onClick={() => game.claimPotion('new')}>Descartar la nueva</button>
                  </span>
                ) : (
                  <button className="btn" onClick={() => game.claimPotion()}>Recoger</button>
                )}
              </li>
            )}
          </ul>
          {hint && <p className="hint-msg" role="status">{hint}</p>}
          {!cardClaimed && <p className="warnbox"><Icon name="warn" /> <span>Si continúas sin elegir, pierdes la carta.</span></p>}
          <div className="row end">
            <button className="btn pri" onClick={() => game.finishRewards()}>
              {last ? 'Ver resultado' : 'Continuar'}
            </button>
          </div>
        </section>
        <section className="panel summary">
          <h3>
            <Icon name="book" /> Resumen
          </h3>
          <p className="sub">Oro total: <b>{e.run.gold}</b></p>
          <p className="sub">Mazo: <b>{e.deck.length}</b> cartas</p>
          <p className="sub">Niebla: <b>{e.run.mist}</b></p>
        </section>
      </div>
      {choosing && !cardClaimed && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Elige una carta">
          <div className="choose">
            <h2 className="fd">Elige una carta</h2>
            <div className="choices">
              {r.cards.map((id) => (
                <Card key={id} card={CARDS[id]} cost={CARDS[id].cost} selected={picked === id} size="big" onClick={() => setPicked(id === picked ? null : id)} />
              ))}
            </div>
            <div className="row">
              <button className="btn" onClick={() => { game.claimCard(null); setChoosing(false); }}>
                Omitir
              </button>
              <button
                className="btn pri"
                disabled={!picked}
                onClick={() => {
                  game.claimCard(picked);
                  setChoosing(false);
                }}
              >
                Añadir al mazo
              </button>
            </div>
            <p className="sub">Mazo actual: {e.deck.length} cartas (máx. {CONFIG.cardsPerChampion} por campeón y turno).</p>
          </div>
        </div>
      )}
    </div>
  );
}
