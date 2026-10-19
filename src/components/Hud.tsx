import type { ReactNode } from 'react';
import { MIST_INFO, OMEN_INFO } from '../data/glossary';
import { mistTier } from '../engine/mist';
import type { Expedition } from '../engine/expedition';
import { Icon } from './Icon';

export function Crest({ icon }: { icon: string }) {
  return (
    <span className="crest">
      <Icon name={icon} />
    </span>
  );
}

/** Niebla de la run con su tramo y los efectos acumulados. */
export function MistBadge({ mist }: { mist: number }) {
  const info = MIST_INFO[mistTier(mist)];
  return (
    <span className="tag warn" title={`${info.name}: ${info.text}`}>
      <Icon name="void" /> {info.name} · {mist}
    </span>
  );
}

export function OmenBadge({ omen }: { omen: Expedition['run']['omen'] }) {
  const info = OMEN_INFO[omen];
  return (
    <span className="tag" title={`Presagio de los caídos — ${info.name}: ${info.text}`}>
      <Icon name="down" /> Presagio: {info.name}
    </span>
  );
}

interface HudProps {
  icon: string;
  title: string;
  subtitle?: string;
  center?: ReactNode;
  e?: Expedition | null;
  children?: ReactNode;
}

/** Barra superior común a las pantallas de la expedición. */
export function Hud({ icon, title, subtitle, center, e, children }: HudProps) {
  return (
    <header className="hud">
      <Crest icon={icon} />
      <div className="where">
        <b>{title}</b>
        {subtitle && <small>{subtitle}</small>}
      </div>
      {center}
      <div className="hudr">
        {e && <OmenBadge omen={e.run.omen} />}
        {e && <MistBadge mist={e.run.mist} />}
        {e && (
          <span className="goldc" aria-label={`Oro ${e.run.gold}`}>
            <Icon name="gold" /> {e.run.gold}
          </span>
        )}
        {children}
      </div>
    </header>
  );
}
