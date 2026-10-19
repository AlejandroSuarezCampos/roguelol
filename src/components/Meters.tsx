import { STRESS_LABEL } from '../data/glossary';
import { stressTier } from '../engine/stress';
import { Icon } from './Icon';

export function HpBar({ hp, max }: { hp: number; max: number }) {
  return (
    <div className="hpbar" role="img" aria-label={`Vida ${hp} de ${max}`}>
      <i style={{ width: `${Math.max(0, (hp / max) * 100)}%` }} />
      <span>
        <Icon name="hp" /> {Math.max(0, hp)}/{max}
      </span>
    </div>
  );
}

const TIER_INDEX = { calm: 0, uneasy: 1, overwhelmed: 2, edge: 3, crisis: 4 } as const;

/** Barra de estrés 0–100 con marcas en 25/50/75, cifra y estado (nunca solo color). */
export function StressMeter({ value }: { value: number }) {
  const tier = stressTier(value);
  return (
    <div className={`stress s${TIER_INDEX[tier]}`} role="img" aria-label={`Estrés ${value} de 100, ${STRESS_LABEL[tier]}`}>
      <div className="bar">
        <i style={{ width: `${Math.min(value, 100)}%` }} />
        <b style={{ left: '25%' }} />
        <b style={{ left: '50%' }} />
        <b style={{ left: '75%' }} />
      </div>
      <div className="lbl">
        <Icon name="stress" /> <b>{value}</b> · {STRESS_LABEL[tier]}
        {tier === 'crisis' ? ' ⚠' : ''}
      </div>
    </div>
  );
}
