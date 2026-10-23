import { splashArt } from '../data/art';
import { CHAMPIONS } from '../data/champions';
import type { CardDef, CardType, Rarity, TargetKind } from '../engine/types';
import { Icon } from './Icon';

export const TYPE_LABEL: Record<CardType, string> = { attack: 'Ataque', defense: 'Defensa', skill: 'Habilidad', support: 'Apoyo', control: 'Control' };
export const RARITY_LABEL: Record<Rarity, string> = { common: 'Común', rare: 'Rara', epic: 'Épica' };
const TARGET_LABEL: Record<TargetKind, string> = {
  enemy: 'Un enemigo', ally: 'Un aliado', self: 'Propio', allEnemies: 'Todos los enemigos', allAllies: 'Todos los aliados',
};

interface Props {
  card: CardDef;
  /** Coste real (Peso, Egoísmo…), no el impreso. */
  cost: number;
  upgraded?: boolean;
  selected?: boolean;
  /** Motivo por el que no se puede jugar: se muestra siempre sobre la carta. */
  reason?: string | null;
  /** El dueño está en una posición ideal: el bonus se aplicará. */
  bonus?: boolean;
  hotkey?: number;
  onClick?: () => void;
  size?: 'std' | 'big';
}

/** Carta: orbe de coste, estandarte con nombre (color = rareza), arte, caja de texto y pie con dueño y rareza. */
export function Card({ card, cost, upgraded, selected, reason, bonus, hotkey, onClick, size = 'std' }: Props) {
  const owner = CHAMPIONS[card.owner];
  // El nombre accesible es el texto visible (WCAG 2.5.3) más, al final, el contexto que solo se ve en el dibujo.
  const extra = `Coste ${cost} de energía.${bonus ? ' Bonus de posición activo.' : ''}${reason ? ` No jugable: ${reason}.` : ''}`;
  return (
    <button
      className={`card t-${card.type} ${card.rarity} ${selected ? 'sel' : ''} ${reason ? 'dis' : ''} ${size}`}
      aria-pressed={selected ?? false}
      aria-disabled={reason ? true : undefined}
      data-why={reason ?? undefined}
      onClick={onClick}
    >
      <span className="art" style={{ backgroundImage: `url(${splashArt(owner.ddragon)}), linear-gradient(135deg, ${owner.bg}, #05060a)` }} />
      <span className="ban">
        <span>{card.name}</span>
      </span>
      <span className="cost">
        <b>{cost}</b>
      </span>
      <span className="type">{TYPE_LABEL[card.type]}</span>
      <span className="tx">
        <small>
          <Icon name="mark" /> {TARGET_LABEL[card.target]}
        </small>
        {card.text}
        {bonus && <em className="bonus">Posición ideal ✓</em>}
      </span>
      <span className="ft">
        <span className="own">
          <i style={{ backgroundImage: `url(${splashArt(owner.ddragon)})`, backgroundColor: owner.color }} />
          {owner.name}
        </span>
        <span className="rar">
          <Icon name="relic" /> {RARITY_LABEL[card.rarity]}
        </span>
      </span>
      {upgraded && <span className="upb">Mejorada</span>}
      <span className="sr">. {extra}</span>
      {hotkey !== undefined && <span className="hk" aria-hidden>{hotkey}</span>}
    </button>
  );
}
