import { useEffect, useMemo, useRef, useState } from 'react';
import { Belt } from '../components/Belt';
import { Hud } from '../components/Hud';
import { RelicList } from '../components/RelicBar';
import { Icon } from '../components/Icon';
import { TeamStrip } from '../components/TeamStrip';
import { NODE_INFO } from '../data/glossary';
import { CONFIG } from '../engine/config';
import { availableNodes, type Expedition, type MapNode } from '../engine/expedition';
import { mistTier } from '../engine/mist';
import { previewNode } from '../engine/run';
import { game, useGame } from '../state/gameStore';

const FLOOR_H = 118;
const PAD_Y = 70;

/** Desplazamiento fijo por nodo para que parezca dibujado a mano (determinista por id). */
function jitter(id: string): { dx: number; dy: number } {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return { dx: ((h & 0xff) / 255 - 0.5) * 6, dy: (((h >> 8) & 0xff) / 255 - 0.5) * 30 };
}

function layout(e: Expedition) {
  const floors = CONFIG.expedition.floors;
  const height = PAD_Y * 2 + (floors - 1) * FLOOR_H;
  const pos = new Map<string, { x: number; y: number }>();
  for (const n of e.map.nodes) {
    const j = jitter(n.id);
    pos.set(n.id, { x: 10 + n.x * 80 + j.dx, y: height - PAD_Y - n.floor * FLOOR_H + j.dy });
  }
  return { height, pos };
}

type NodeState = 'visited' | 'current' | 'available' | 'locked';

export function ExpeditionMapScreen() {
  const { expedition: e, selectedPotion, hint } = useGame();
  const [picked, setPicked] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const currentFloor = useMemo(() => (e?.currentId ? e.map.nodes.find((n) => n.id === e.currentId)!.floor : -1), [e]);

  useEffect(() => {
    const el = scroller.current;
    if (!el || !e) return;
    // El jefe está arriba y el inicio abajo: al abrir se desplaza hasta el piso actual.
    const { height } = layout(e);
    const y = height - PAD_Y - (currentFloor + 1) * FLOOR_H;
    el.scrollTop = Math.max(0, y - el.clientHeight / 2);
  }, [e, currentFloor]);

  if (!e) return null;
  const { height, pos } = layout(e);
  const avail = new Set(availableNodes(e).map((n) => n.id));
  const stateOf = (n: MapNode): NodeState =>
    n.id === e.currentId ? 'current' : e.visited.includes(n.id) ? 'visited' : avail.has(n.id) ? 'available' : 'locked';
  const sel = picked && avail.has(picked) ? e.map.nodes.find((n) => n.id === picked)! : null;
  const prev = sel ? previewNode(e.run, sel.type) : null;
  const floorLabel = currentFloor < 0 ? 'Entrada' : `Piso ${currentFloor + 1} de ${CONFIG.expedition.floors}`;

  return (
    <div className="screen mapscreen">
      <Hud icon="map" title="Mapa de expedición" subtitle={`Islas de la Sombra · ${floorLabel}`} e={e}>
        <button className="btn" onClick={() => game.openTeam()}>
          <Icon name="team" /> Equipo{e.inventory.length ? ` (${e.inventory.length} sin equipar)` : ''}
        </button>
        <button className="btn dng" onClick={() => window.confirm('¿Retirarte? Conservas solo la mitad del oro y pierdes la expedición.') && game.retreat()}>
          <Icon name="flag" /> Retirada
        </button>
      </Hud>
      <div className="mapbody">
        <div className="mapscroll" ref={scroller}>
          <div className="parchment" style={{ height }}>
            <svg className="paths" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden>
              {e.map.nodes.flatMap((n) =>
                n.next.map((id) => {
                  const a = pos.get(n.id)!;
                  const b = pos.get(id)!;
                  const walked = e.visited.includes(n.id) && e.visited.includes(id);
                  const ahead = (n.id === e.currentId || (e.currentId === null && n.floor === -1)) && avail.has(id);
                  return (
                    <line key={`${n.id}-${id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={walked ? 'walked' : ahead ? 'ahead' : ''} vectorEffect="non-scaling-stroke" />
                  );
                }),
              )}
            </svg>
            {e.map.nodes.map((n) => {
              const st = stateOf(n);
              const info = NODE_INFO[n.type];
              const p = pos.get(n.id)!;
              return (
                <button
                  key={n.id}
                  className={`nd ${n.type} ${st} ${picked === n.id ? 'picked' : ''}`}
                  style={{ left: `${p.x}%`, top: p.y }}
                  disabled={st !== 'available'}
                  onClick={() => setPicked(n.id)}
                  aria-label={`${info.name}, piso ${n.floor + 1}${st === 'available' ? ', disponible' : st === 'visited' ? ', visitado' : st === 'current' ? ', estás aquí' : ', no alcanzable'}`}
                >
                  <Icon name={info.icon} />
                  {(st === 'available' || st === 'current') && <small>{st === 'current' ? 'Estás aquí' : info.name}</small>}
                </button>
              );
            })}
          </div>
        </div>
        <aside className="mapside">
          <section className="panel">
            <h3>
              <Icon name="team" /> Equipo
            </h3>
            <TeamStrip e={e} armed={selectedPotion !== null} onPick={selectedPotion !== null ? (id) => game.drinkPotion(id) : undefined} />
            <div className="row">
              <Icon name="potion" />
              <Belt belt={e.run.belt} selected={selectedPotion} onSelect={(i) => game.selectPotion(i)} healingOnly />
            </div>
            <p className="sub">{selectedPotion !== null ? 'Elige a quién curar.' : 'Selecciona una poción curativa para usarla.'}</p>
          </section>
          <section className="panel">
            <h3>
              <Icon name="flag" /> {sel ? NODE_INFO[sel.type].name : 'Siguiente paso'}
            </h3>
            {sel && prev ? (
              <div className="col">
                <p className="sub">{NODE_INFO[sel.type].text}</p>
                <span className="tag warn">
                  <Icon name="void" /> Niebla {e.run.mist} → {prev.mistAfter} ({['Bruma', 'Niebla', 'Niebla densa', 'Ruina'][['haze', 'mist', 'dense', 'ruin'].indexOf(mistTier(prev.mistAfter))]})
                </span>
                {prev.relicChance > 0 && <span className="tag gold">Reliquia: {Math.round(prev.relicChance * 100)}%</span>}
                <button className="btn pri" onClick={() => game.chooseNode(sel.id)}>
                  Entrar
                </button>
              </div>
            ) : (
              <p className="sub">Elige uno de los nodos que laten en el mapa.</p>
            )}
            {hint && <p className="hint-msg" role="status">{hint}</p>}
          </section>
          <section className="panel">
            <h3>
              <Icon name="relic" /> Reliquias ({e.run.relics.length})
            </h3>
            <RelicList relics={e.run.relics} empty="Las élites sueltan reliquias." />
          </section>
          <section className="panel legend">
            <h3>
              <Icon name="book" /> Leyenda
            </h3>
            <ul>
              {(['combat', 'elite', 'rest', 'shop', 'event', 'boss'] as const).map((t) => (
                <li key={t}>
                  <Icon name={NODE_INFO[t].icon} /> <b>{NODE_INFO[t].name}</b>
                </li>
              ))}
            </ul>
            <p className="sub">Tesoros y santuarios llegarán más adelante.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
