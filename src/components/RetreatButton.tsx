import { useState } from 'react';
import { modsOf, type Expedition } from '../engine/expedition';
import { game } from '../state/gameStore';
import { ConfirmModal } from './ConfirmModal';
import { Icon } from './Icon';

/** Botón de retirada con su confirmación: muestra cuánto oro se conserva y qué se pierde, según la Ascensión. */
export function RetreatButton({ e, disabled }: { e: Expedition; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const pct = modsOf(e).retreatGold;
  const kept = Math.floor(e.run.gold * pct);
  return (
    <>
      <button className="btn dng" disabled={disabled} onClick={() => setOpen(true)}>
        <Icon name="flag" /> Retirada
      </button>
      {open && (
        <ConfirmModal title="¿Retirarte de la expedición?" confirmLabel="Retirarme" danger onCancel={() => setOpen(false)} onConfirm={() => game.retreat()}>
          <p>
            Conservas el <b>{Math.round(pct * 100)}%</b> del oro (<b>{kept}</b> de {e.run.gold}).
          </p>
          <p>
            Pierdes <b>la recompensa de la victoria</b> y la expedición termina ahora. Esto no se puede deshacer.
          </p>
          {pct < 0.5 && <p className="sub">En esta Ascensión la penalización es mayor.</p>}
        </ConfirmModal>
      )}
    </>
  );
}
