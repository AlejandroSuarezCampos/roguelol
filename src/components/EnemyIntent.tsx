import type { CombatState, Intent, Unit } from '../engine/types';
import { intentView } from '../state/selectors';
import { Icon } from './Icon';

const KIND: Record<Intent['kind'], { icon: string; cls: string; verb: string }> = {
  attack: { icon: 'ad', cls: 'atk', verb: 'Ataque' },
  block: { icon: 'block', cls: 'def', verb: 'Bloqueo' },
  stress: { icon: 'stress', cls: 'deb', verb: 'Estrés' },
  reposition: { icon: 'swap', cls: 'deb', verb: 'Se adelanta' },
};

/** Intención telegráfica: icono con el valor final, texto «Ataque → Leona» y sellos de peligro / letal. */
export function EnemyIntent({ unit, s }: { unit: Unit; s: CombatState }) {
  const views = intentView(s, unit);
  if (!views.length) return null;
  return (
    <div className="intents">
      {views.map((v, i) => {
        const k = KIND[v.intent.kind];
        const text =
          v.intent.kind === 'reposition'
            ? `Se adelanta a la posición ${v.intent.to}`
            : v.intent.kind === 'block'
              ? `Gana ${v.value} de bloqueo`
              : `${k.verb}${v.intent.kind === 'attack' && v.intent.crit ? ' crítico' : ''} → ${v.target?.name ?? '—'}`;
        return (
          <div key={i} className={`intent ${k.cls} ${v.danger ? 'danger' : ''} ${v.skipped ? 'skipped' : ''}`} aria-label={`Intención de ${unit.name}: ${text}${v.value && v.intent.kind !== 'block' ? `, ${v.value}` : ''}${v.lethal ? ', letal' : ''}${v.skipped ? ', aturdido: no actúa este turno' : ''}`}>
            <span className="ii">
              <Icon name={k.icon} />
              {v.intent.kind !== 'reposition' && <b>{v.value}</b>}
            </span>
            <span className="it">{text}</span>
            {v.skipped ? <em className="sk">Aturdido: no actúa</em> : v.lethal ? <em>¡LETAL!</em> : v.danger ? <em className="dg">Peligro</em> : null}
          </div>
        );
      })}
    </div>
  );
}
