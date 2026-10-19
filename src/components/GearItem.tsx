import { useState } from 'react';
import { GEAR, GEAR_RARITY_LABEL, SLOT_LABEL, gearIcon, type GearDef } from '../data/gear';
import { statLines } from '../ui/format';
import { Icon } from './Icon';

export function GearIcon({ gear, className = '' }: { gear: GearDef; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`gi ${gear.rarity} ${className}`}>
      {!failed && <img src={gearIcon(gear)} alt="" referrerPolicy="no-referrer" loading="lazy" onError={() => setFailed(true)} />}
      <Icon name={gear.slot === 'weapon' ? 'ad' : 'armor'} />
    </span>
  );
}

/** Objeto con su icono, slot, rareza y bonos. `delta` pinta la diferencia frente a lo equipado (verde sube, rojo baja). */
export function GearItem({ id, delta, compact }: { id: string; delta?: { stats: Parameters<typeof statLines>[0]; hp: number }; compact?: boolean }) {
  const g = GEAR[id];
  const lines = statLines(g.stats, g.hp ?? 0);
  const diff = delta ? statLines(delta.stats, delta.hp) : [];
  return (
    <div className={`gitem ${g.rarity} ${compact ? 'compact' : ''}`}>
      <GearIcon gear={g} />
      <div className="ginfo">
        <b>{g.name}</b>
        <small>
          {SLOT_LABEL[g.slot]} · {GEAR_RARITY_LABEL[g.rarity]}
        </small>
        <span className="gstats">
          {lines.map((l) => (
            <span key={l.key} className="gst">
              {l.label} {l.value}
            </span>
          ))}
        </span>
        {delta && (
          <span className="gdelta" aria-label="Cambio frente a lo equipado">
            {diff.length ? (
              diff.map((l) => (
                <span key={l.key} className={l.raw > 0 ? 'up' : 'down'}>
                  {l.raw > 0 ? '▲' : '▼'} {l.label} {l.value}
                </span>
              ))
            ) : (
              <span>Sin cambios</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
