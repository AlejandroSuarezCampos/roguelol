import { ENEMY_ART, ENEMY_COLOR, loadingArt } from '../data/art';
import { CHAMPIONS } from '../data/champions';
import { CRISIS_INFO } from '../data/glossary';
import type { CombatState, Unit } from '../engine/types';
import type { FxEvent } from '../state/gameStore';
import { Icon } from './Icon';
import { HpBar, StressMeter } from './Meters';
import { Portrait } from './Portrait';
import { StatusChip, statusEntries } from './Status';
import { EnemyIntent } from './EnemyIntent';

export type TargetMode = 'none' | 'legal' | 'illegal' | 'affected' | 'swap-from' | 'swap-legal';

interface Props {
  unit: Unit;
  s: CombatState;
  mode?: TargetMode;
  /** Motivo corto (ilegal) o etiqueta (legal). */
  tag?: string;
  fx?: FxEvent[];
  onClick?: () => void;
}

const FX_TEXT: Record<FxEvent['kind'], (n: number) => string> = {
  damage: (n) => `−${n}`, blocked: (n) => `Bloqueado ${n}`, heal: (n) => `+${n}`, block: (n) => `+${n}`, stress: (n) => `+${n}`, calm: (n) => `−${n}`,
};

export function Fighter({ unit, s, mode = 'none', tag, fx = [], onClick }: Props) {
  const ally = unit.side === 'ally';
  const champ = ally ? CHAMPIONS[unit.id as keyof typeof CHAMPIONS] : null;
  const defId = ally ? '' : s.enemyOf[unit.id];
  const crisis = unit.crisis ? CRISIS_INFO[unit.crisis] : null;
  const stateLabel = [
    unit.downed ? (ally ? 'derribado' : 'derrotado') : '',
    unit.crisisActive ? `en crisis: ${crisis?.name}` : '',
    unit.virtueActive ? 'con firmeza' : '',
  ].filter(Boolean).join(', ');
  const label = `${unit.name}, posición ${unit.pos}, vida ${unit.hp} de ${unit.maxHp}${unit.block ? `, bloqueo ${unit.block}` : ''}${ally ? `, estrés ${unit.stress}` : ''}${stateLabel ? `, ${stateLabel}` : ''}`;
  const hurt = !unit.downed && unit.hp <= unit.maxHp * 0.3;
  const clickable = mode !== 'none' && mode !== 'affected';
  return (
    <div
      className={`ftr ${ally ? 'ally' : 'foe'} ${unit.downed ? 'down' : ''} ${hurt ? 'hurt' : ''} ${mode}`}
      role={clickable ? 'button' : 'group'}
      tabIndex={clickable ? 0 : undefined}
      aria-label={label}
      aria-disabled={mode === 'illegal' ? true : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={clickable ? (ev) => (ev.key === 'Enter' || ev.key === ' ') && (ev.preventDefault(), onClick?.()) : undefined}
    >
      {!ally && !unit.downed && <EnemyIntent unit={unit} s={s} />}
      <div className="spr-wrap">
        <div className={`spr ${ally ? '' : 'mon'}`}>
          {ally ? (
            <Portrait src={loadingArt(champ!.ddragon)} mono={unit.name[0]} color={champ!.color} bg={champ!.bg} alt="" />
          ) : (
            <Portrait src={ENEMY_ART[defId]} mono={unit.name[0]} color={ENEMY_COLOR[defId] ?? '#fff'} fit="monster" alt="" />
          )}
        </div>
        {(mode === 'legal' || mode === 'illegal' || mode === 'swap-legal' || mode === 'swap-from') && tag && <span className="tg">{tag}</span>}
        {unit.downed && <span className="downlbl">{ally ? 'DERRIBADO' : 'DERROTADO'}</span>}
        <div className="fxs" aria-hidden>
          {fx.map((f) => (
            <span key={f.key} className={`fx ${f.kind}`}>
              {FX_TEXT[f.kind](f.amount)}
            </span>
          ))}
        </div>
      </div>
      <div className="gnd" />
      <div className="bars">
        <div className="nml">
          <span className="pn" aria-hidden>{unit.pos}</span> {unit.name}
        </div>
        <div className="hpl">
          <span className={`shd ${unit.block ? 'on' : ''}`} title="Bloqueo">
            <Icon name="block" />
            <b>{unit.block}</b>
          </span>
          <HpBar hp={unit.hp} max={unit.maxHp} />
        </div>
        {ally && <StressMeter value={unit.stress} />}
        {ally && (unit.crisisActive || unit.virtueActive) && (
          <span className={`tag ${unit.virtueActive ? 'ok' : 'bad'}`} title={crisis ? `${crisis.name}: ${crisis.text}` : undefined}>
            {unit.virtueActive ? 'Firmeza' : `Crisis: ${crisis?.name}`}
          </span>
        )}
        <div className="sts">
          {statusEntries(unit.statuses).map(([id, n]) => (
            <StatusChip key={id} id={id} stacks={n} />
          ))}
        </div>
      </div>
    </div>
  );
}
