import { useMemo, useState } from 'react';
import { ChampionPortrait } from '../components/ChampionPortrait';
import { GearItem } from '../components/GearItem';
import { Hud } from '../components/Hud';
import { RelicList } from '../components/RelicBar';
import { Icon } from '../components/Icon';
import { HpBar, StressMeter } from '../components/Meters';
import { applyUpgrade, deckCardDef, isUpgradedId } from '../data/cards';
import { CHAMPIONS, CRISIS } from '../data/champions';
import { GEAR } from '../data/gear';
import { CRISIS_INFO } from '../data/glossary';
import { compareGear, finalStatsFor, freeSlot } from '../engine/gear';
import type { ChampionId, Pos } from '../engine/types';
import { game, useGame } from '../state/gameStore';
import { statLines } from '../ui/format';

/** Equipo: ficha del campeón con sus estadísticas finales, gear (equipar/quitar con comparación) y el mazo. */
export function TeamScreen() {
  const { expedition: e, hint } = useGame();
  const [selected, setSel] = useState<ChampionId>('leona');
  /** Objeto del inventario esperando hueco (el campeón tiene los 6 llenos). */
  const [replacing, setReplacing] = useState<string | null>(null);
  const deck = useMemo(() => {
    if (!e) return [];
    const m = new Map<string, number>();
    for (const id of e.deck) m.set(id, (m.get(id) ?? 0) + 1);
    return [...m.entries()].map(([id, n]) => ({ id, def: isUpgradedId(id) ? applyUpgrade(deckCardDef(id)) : deckCardDef(id), up: isUpgradedId(id), n }));
  }, [e, e?.deck.length]);
  if (!e) return null;
  // si el seleccionado ha muerto, se muestra el primero que siga vivo
  const sel: ChampionId = e.run.champions.some((x) => x.id === selected) ? selected : e.run.champions[0].id;
  const c = e.run.champions.find((x) => x.id === sel)!;
  const def = CHAMPIONS[sel];
  const crisis = CRISIS_INFO[CRISIS[sel]];
  const stats = finalStatsFor(e, sel);
  const lines = statLines({ ...stats, critDamage: stats.critDamage }, c.maxHp, true);
  const own = deck.filter((d) => d.def.owner === sel).sort((a, b) => a.def.cost - b.def.cost || a.def.name.localeCompare(b.def.name));
  const ownCount = own.reduce((a, d) => a + d.n, 0);
  return (
    <div className="screen teamscreen scene-bg">
      <Hud icon="team" title="Equipo" subtitle="Fichas, gear y mazo" e={e}>
        <button className="btn" onClick={() => game.closeTeam()}>
          Volver al mapa
        </button>
      </Hud>
      <div className="team-body">
        <nav className="panel champlist" aria-label="Campeones">
          {e.dead.map((id) => (
            <div key={id} className="tcard down" aria-label={`${CHAMPIONS[id].name}: muerto`}>
              <ChampionPortrait id={id} className="mini" />
              <span className="tinfo">
                <b>{CHAMPIONS[id].name}</b>
                <span className="tag bad"><Icon name="down" /> Muerto</span>
              </span>
            </div>
          ))}
          {e.run.champions.map((ch) => {
            const id = ch.id;
            return (
              <button key={id} className={`tcard ${id === sel ? 'on' : ''}`} aria-pressed={id === sel} onClick={() => setSel(id)}>
                <ChampionPortrait id={id} className="mini" />
                <span className="tinfo">
                  <b>{ch.name}</b>
                  <HpBar hp={ch.hp} max={ch.maxHp} />
                </span>
              </button>
            );
          })}
        </nav>
        <section className="panel sheet">
          <h2 className="sh">
            <Icon name="team" /> {def.name} · {def.role}
          </h2>
          <div className="sheetrow">
            <ChampionPortrait id={sel} className="big" />
            <div className="col grow">
              <p className="sub">Rasgos: {def.traits.join(' · ')}</p>
              <HpBar hp={c.hp} max={c.maxHp} />
              <StressMeter value={c.stress} />
              {e.wounds[sel] > 0 && (
                <span className="tag bad">
                  <Icon name="wound" /> Herida grave ×{e.wounds[sel]} · vida máxima −{e.wounds[sel] * 10}%
                </span>
              )}
              <span className="tag warn" title={crisis.text}>
                <Icon name="warn" /> Crisis: {crisis.name}
              </span>
              <p className="sub small">{crisis.text}</p>
              <span className="tag">Bonus de posición en {def.sweetSpot.join('–')}</span>
              <div className="row" role="group" aria-label={`Posición de ${def.name}`}>
                <span className="tag">Posición {c.pos}</span>
                <button className="btn sm" disabled={c.pos === 1} onClick={() => game.reorderTeam(sel, (c.pos - 1) as Pos)}>
                  Hacia el frente
                </button>
                <button className="btn sm" disabled={c.pos === 4} onClick={() => game.reorderTeam(sel, (c.pos + 1) as Pos)}>
                  Hacia el fondo
                </button>
              </div>
            </div>
          </div>
          <h3 className="fd">Estadísticas finales</h3>
          <dl className="statlist">
            {lines.map((l) => (
              <div key={l.key} className="statrow">
                <dt>{l.label}</dt>
                <dd>{l.value}</dd>
              </div>
            ))}
          </dl>
          <p className="sub small">Base + gear. Son las mismas que usa el combate.</p>
        </section>
        <section className="panel gearpanel">
          <h2 className="sh">
            <Icon name="relic" /> Gear
          </h2>
          {replacing && (
            <p className="sub" role="status">
              Huecos llenos: elige qué objeto sustituir por <b>{GEAR[replacing].name}</b>.{' '}
              <button className="btn sm" onClick={() => setReplacing(null)}>Cancelar</button>
            </p>
          )}
          <div className="slots">
            {e.gear[sel].map((id, slot) => (
              <div key={slot} className="gslot">
                <small className="sub">Hueco {slot + 1}</small>
                {id ? (
                  <>
                    <GearItem id={id} compact />
                    {replacing ? (
                      <button className="btn sm pri" onClick={() => { game.equipGear(sel, replacing, slot); setReplacing(null); }}>
                        Sustituir
                      </button>
                    ) : (
                      <button className="btn sm" onClick={() => game.unequipGear(sel, slot)}>
                        Quitar
                      </button>
                    )}
                  </>
                ) : (
                  <p className="empty sub">Vacío</p>
                )}
              </div>
            ))}
          </div>
          <h3 className="fd">Inventario ({e.inventory.length})</h3>
          {e.inventory.length === 0 && <p className="sub">Sin objetos. Los sueltan los combates, las élites y los jefes.</p>}
          <ul className="inv">
            {e.inventory.map((id, i) => (
              <li key={`${id}-${i}`}>
                <GearItem id={id} delta={compareGear(e, sel, id)} />
                <button className="btn sm" onClick={() => (freeSlot(e, sel) === null ? setReplacing(id) : game.equipGear(sel, id))}>
                  Equipar en {def.name}
                </button>
              </li>
            ))}
          </ul>
          {hint && <p className="hint-msg" role="status">{hint}</p>}
        </section>
      </div>
      <section className="panel deckview">
        <h2 className="sh">
          <Icon name="relic" /> Reliquias ({e.run.relics.length})
        </h2>
        <RelicList relics={e.run.relics} />
      </section>
      <section className="panel deckview">
        <h2 className="sh">
          <Icon name="card" /> Mazo de {def.name} ({ownCount} de {e.deck.length})
        </h2>
        <ul className="pilelist cols">
          {own.map(({ id, def: d, up, n }) => (
            <li key={id}>
              <b>{d.name}{up ? ' +' : ''}</b> <small>coste {d.cost} · {d.text}</small> <span className="n">×{n}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
