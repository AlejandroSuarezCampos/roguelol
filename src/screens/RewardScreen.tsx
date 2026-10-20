import { useState } from 'react';
import { Card } from '../components/Card';
import { Hud } from '../components/Hud';
import { Icon } from '../components/Icon';
import { GearItem } from '../components/GearItem';
import { RelicList } from '../components/RelicBar';
import { CARDS } from '../data/cards';
import { CHAMPIONS } from '../data/champions';
import { compareGear, freeSlot } from '../engine/gear';
import { CONFIG } from '../engine/config';
import { POTIONS } from '../engine/potions';
import { game, useGame } from '../state/gameStore';
import { statLines } from '../ui/format';

/** Botín en un único panel, como Slay the Spire: oro, carta (elige 1 de N o salta) y poción. */
export function RewardScreen() {
  const { expedition: e, rewards: r, cardClaimed, potionClaimed, gearClaimed, hint, combatKind } = useGame();
  const [choosing, setChoosing] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [choosingGear, setChoosingGear] = useState(false);
  const [pickedGear, setPickedGear] = useState<string | null>(null);
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
            {(r.relicIds?.length || r.relicNotes?.length) ? (
              <li className="done relics">
                <Icon name="relic" />
                <div className="grow">
                  {r.relicIds?.length ? (<><b>{r.relicIds.length > 1 ? 'Reliquias nuevas' : 'Reliquia nueva'}</b><RelicList relics={r.relicIds} /></>) : null}
                  {r.relicNotes?.map((n, i) => <p key={i} className="sub">{n}</p>)}
                </div>
                <span className="tag ok">Recogida</span>
              </li>
            ) : null}
            {r.gear && (
              <li className={gearClaimed ? 'done' : ''}>
                <Icon name="relic" /> <b>Un objeto</b> <small className="sub">elige 1 de {r.gear.length}; compáralo y equípalo (o salta)</small>
                {gearClaimed ? <span className="tag ok">Elegido</span> : <button className="btn" onClick={() => setChoosingGear(true)}>Elegir objeto</button>}
              </li>
            )}
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
          {(!cardClaimed || (r.gear && !gearClaimed)) && <p className="warnbox"><Icon name="warn" /> <span>Si continúas sin elegir, pierdes lo que dejes sin recoger.</span></p>}
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
      {choosingGear && r.gear && !gearClaimed && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Elige un objeto">
          <div className="choose">
            <h2 className="fd">Elige un objeto</h2>
            <div className="gearchoices">
              {r.gear.map((id) => (
                <div key={id} className={`gearchoice ${pickedGear === id ? 'on' : ''}`}>
                  <button className="gearpick" aria-pressed={pickedGear === id} onClick={() => setPickedGear(pickedGear === id ? null : id)}>
                    <GearItem id={id} />
                  </button>
                  {pickedGear === id && (
                    <div className="equipon">
                      <small className="sub">Equipar ahora en…</small>
                      {e.run.champions.map((ch) => {
                        const c = ch.id;
                        const d = compareGear(e, c, id);
                        const sum = statLines(d.stats, d.hp).map((l) => `${l.raw > 0 ? '▲' : '▼'} ${l.label} ${l.value}`).join(' · ') || 'sin cambios';
                        return (
                          <button key={c} className="btn sm" disabled={freeSlot(e, c) === null} onClick={() => { game.claimGear(id, c); setChoosingGear(false); }} title={freeSlot(e, c) === null ? 'Sin huecos libres: equípalo desde Equipo' : sum}>
                            {CHAMPIONS[c].name}
                          </button>
                        );
                      })}
                      <button className="btn sm" onClick={() => { game.claimGear(id); setChoosingGear(false); }}>
                        Al inventario
                      </button>
                    </div>
                  )}
                  {pickedGear === id && (
                    <div className="cmp">
                      {e.run.champions.map((ch) => (
                        <GearCompareRow key={ch.id} champ={ch.id} id={id} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="row">
              <button className="btn" onClick={() => { game.claimGear(null); setChoosingGear(false); }}>
                Omitir
              </button>
              <button className="btn" onClick={() => setChoosingGear(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
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

/** Fila de comparación: lo que cambia en ese campeón si equipa el objeto (verde sube, rojo baja). */
function GearCompareRow({ champ, id }: { champ: keyof typeof CHAMPIONS; id: string }) {
  const { expedition: e } = useGame();
  if (!e) return null;
  const d = compareGear(e, champ, id);
  const lines = statLines(d.stats, d.hp);
  return (
    <p className="cmprow">
      <b>{CHAMPIONS[champ].name}</b>{' '}
      {lines.length ? lines.map((l) => <span key={l.key} className={l.raw > 0 ? 'up' : 'down'}>{l.raw > 0 ? '▲' : '▼'} {l.label} {l.value} </span>) : <span>sin cambios</span>}
    </p>
  );
}
