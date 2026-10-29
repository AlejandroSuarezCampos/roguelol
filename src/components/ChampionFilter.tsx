import { CHAMPIONS, LANE_OF, LANES, type Lane } from '../data/champions';
import type { ChampionId } from '../engine/types';

export interface ChampFilter {
  q: string;
  lane: Lane | 'Todas';
}
export const NO_FILTER: ChampFilter = { q: '', lane: 'Todas' };

const plain = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** ¿Cumple el campeón el filtro de texto (nombre, rol o rasgos) y de línea? */
export function matchChampion(id: ChampionId, f: ChampFilter): boolean {
  if (f.lane !== 'Todas' && LANE_OF[id] !== f.lane) return false;
  const q = plain(f.q.trim());
  if (!q) return true;
  const c = CHAMPIONS[id];
  return plain(`${c.name} ${c.role} ${c.traits.join(' ')} ${LANE_OF[id]}`).includes(q);
}

/** Búsqueda y líneas para las listas largas de campeones (hay 167). */
export function ChampionFilter({ value, onChange, shown, total }: { value: ChampFilter; onChange: (f: ChampFilter) => void; shown: number; total: number }) {
  const lanes: (Lane | 'Todas')[] = ['Todas', ...(Object.keys(LANES) as Lane[])];
  return (
    <div className="cfilter" role="search">
      <input
        type="search"
        className="csearch"
        placeholder="Buscar campeón, rol o rasgo…"
        aria-label="Buscar campeón"
        value={value.q}
        onChange={(ev) => onChange({ ...value, q: ev.target.value })}
      />
      <div className="row lanes" role="group" aria-label="Línea">
        {lanes.map((l) => (
          <button key={l} className={`btn sm ${value.lane === l ? 'pri' : ''}`} aria-pressed={value.lane === l} onClick={() => onChange({ ...value, lane: l })}>
            {l}
          </button>
        ))}
      </div>
      <small className="sub" role="status">{shown === total ? `${total} campeones` : `${shown} de ${total}`}</small>
    </div>
  );
}
