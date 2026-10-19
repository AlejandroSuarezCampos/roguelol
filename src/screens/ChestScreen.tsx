import { useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import { GearItem } from '../components/GearItem';
import { Hud } from '../components/Hud';
import { Icon } from '../components/Icon';
import { RELICS, RELIC_RARITY_LABEL } from '../data/relics';
import type { ChestOffer } from '../engine/chest';
import { offerName } from '../engine/chest';
import { game, useGame } from '../state/gameStore';

function Offer({ o }: { o: ChestOffer }) {
  if (o.kind === 'gold')
    return (
      <>
        <Icon name="gold" />
        <b>{o.amount} de oro</b>
        <span className="sub">Para el comerciante o para lo que venga.</span>
      </>
    );
  if (o.kind === 'relic') {
    const r = RELICS[o.id];
    return (
      <>
        <Icon name="relic" />
        <b>{r.name}</b>
        <small className="sub">Reliquia · {RELIC_RARITY_LABEL[r.rarity]}</small>
        <span>{r.text}</span>
      </>
    );
  }
  return (
    <>
      <Icon name="chest" />
      <GearItem id={o.id} />
    </>
  );
}

/** Tesoro: tres ofertas a la vista, se elige una y el cofre se cierra (irreversible, se confirma). */
export function ChestScreen() {
  const { expedition: e, hint } = useGame();
  const [pending, setPending] = useState<number | null>(null);
  if (!e || !e.chest) return null;
  const chest = e.chest;
  const taken = chest.taken !== null ? chest.offers[chest.taken] : null;
  return (
    <div className="screen chestscreen scene-bg">
      <Hud icon="chest" title="Tesoro" subtitle="Un cofre entre la Niebla" e={e} />
      <div className="chest-body">
        <p className="sub">{taken ? 'El cofre se ha cerrado.' : 'Solo puedes llevarte una cosa. Elige con cuidado: no se puede deshacer.'}</p>
        <div className="offers">
          {chest.offers.map((o, i) => (
            <article key={i} className={`panel offer ${chest.taken === i ? 'taken' : chest.taken !== null ? 'gone' : ''}`}>
              <Offer o={o} />
              {chest.taken === null ? (
                <button className="btn pri" onClick={() => setPending(i)}>
                  Llevármelo
                </button>
              ) : chest.taken === i ? (
                <span className="tag ok">
                  <Icon name="check" /> Elegido
                </span>
              ) : null}
            </article>
          ))}
        </div>
        {hint && <p className="hint-msg" role="status">{hint}</p>}
        <div className="row end">
          <button className="btn pri" disabled={chest.taken === null} onClick={() => game.leaveChest()}>
            {chest.taken === null ? 'Elige una oferta' : 'Continuar'}
          </button>
          {chest.taken === null && (
            <button className="btn" onClick={() => game.leaveChest()}>
              Dejar el cofre
            </button>
          )}
        </div>
      </div>
      {pending !== null && (
        <ConfirmModal title="¿Llevarte esto?" confirmLabel="Llevármelo" onCancel={() => setPending(null)} onConfirm={() => { game.takeChestOffer(pending); setPending(null); }}>
          <p>
            Eliges <b>{offerName(chest.offers[pending])}</b>. El cofre se cerrará y perderás las otras dos ofertas.
          </p>
        </ConfirmModal>
      )}
    </div>
  );
}
