import { POTIONS } from '../engine/potions';
import type { BeltSlot } from '../engine/types';
import { Icon } from './Icon';

interface Props {
  belt: BeltSlot[];
  selected: number | null;
  onSelect: (slot: number) => void;
  /** Solo curativas (mapa) o todas (combate). */
  healingOnly?: boolean;
}

/** Cinturón de 3 pociones. El nombre y el estado van siempre en el texto accesible, no solo en el color. */
export function Belt({ belt, selected, onSelect, healingOnly }: Props) {
  return (
    <div className="belt" role="group" aria-label="Cinturón de pociones">
      {belt.map((p, i) => {
        const info = p ? POTIONS[p.id] : null;
        const usable = !!p && !p.spent && (!healingOnly || info!.healing);
        const label = !p ? `Hueco ${i + 1} vacío` : `${info!.name}${p.spent ? ' (gastada)' : ''}`;
        return (
          <button
            key={i}
            className={`pot ${p ? '' : 'empty'} ${selected === i ? 'sel' : ''} ${p?.spent ? 'spent' : ''}`}
            disabled={!usable}
            aria-pressed={selected === i}
            aria-label={label}
            title={label}
            onClick={() => onSelect(i)}
          >
            <Icon name="potion" />
            {p && <small>{info!.name.replace('Poción ', '').replace('Elixir de ', '')}</small>}
          </button>
        );
      })}
    </div>
  );
}
