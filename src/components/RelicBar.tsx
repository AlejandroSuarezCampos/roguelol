import { useState } from 'react';
import { RELICS, RELIC_RARITY_LABEL } from '../data/relics';
import { Icon } from './Icon';

/** Orbes de reliquias del equipo. Pulsar uno muestra su texto; el que se activa en la última acción pulsa. */
export function RelicBar({ relics, active = [] }: { relics: string[]; active?: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!relics.length) return <span className="relbar empty sub" aria-label="Sin reliquias">Sin reliquias</span>;
  const shown = open ? RELICS[open] : null;
  return (
    <div className="relbar" role="group" aria-label="Reliquias">
      {relics.map((id) => {
        const r = RELICS[id];
        return (
          <button
            key={id}
            className={`rel ${r.rarity} ${active.includes(id) ? 'active' : ''} ${open === id ? 'open' : ''}`}
            onClick={() => setOpen(open === id ? null : id)}
            aria-pressed={open === id}
            aria-label={`${r.name}. ${r.text}${active.includes(id) ? ' Se ha activado.' : ''}`}
            title={`${r.name}: ${r.text}`}
          >
            <Icon name="relic" />
          </button>
        );
      })}
      {shown && (
        <div className="relpop" role="status">
          <b>{shown.name}</b> <small>{RELIC_RARITY_LABEL[shown.rarity]}</small>
          <span>{shown.text}</span>
        </div>
      )}
    </div>
  );
}

/** Lista con el texto siempre visible (mapa, equipo, botín): la información crítica no vive solo en un tooltip. */
export function RelicList({ relics, empty = 'Aún no tienes reliquias.' }: { relics: string[]; empty?: string }) {
  if (!relics.length) return <p className="sub">{empty}</p>;
  return (
    <ul className="rellist">
      {relics.map((id) => (
        <li key={id} className={RELICS[id].rarity}>
          <Icon name="relic" />
          <span>
            <b>{RELICS[id].name}</b> <small>{RELIC_RARITY_LABEL[RELICS[id].rarity]}</small>
            <br />
            {RELICS[id].text}
          </span>
        </li>
      ))}
    </ul>
  );
}
