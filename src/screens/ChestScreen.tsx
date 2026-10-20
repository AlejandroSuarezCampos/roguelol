import { Hud } from '../components/Hud';
import { Icon } from '../components/Icon';
import { RELICS, RELIC_RARITY_LABEL } from '../data/relics';
import type { ChestOffer } from '../engine/chest';
import { game, useGame } from '../state/gameStore';

function Offer({ o }: { o: ChestOffer }) {
  if (o.kind === 'gold')
    return (
      <>
        <Icon name="gold" />
        <b>{o.amount} de oro</b>
        <span className="sub">Ya tienes todas las reliquias: el cofre trae oro.</span>
      </>
    );
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

/** Tesoro (como en Slay the Spire): el cofre trae una reliquia y se coge sin elegir. */
export function ChestScreen() {
  const { expedition: e, hint } = useGame();
  if (!e || !e.chest) return null;
  const chest = e.chest;
  const open = chest.taken !== null;
  return (
    <div className="screen chestscreen scene-bg">
      <Hud icon="chest" title="Tesoro" subtitle="Un cofre entre la Niebla" e={e} />
      <div className="chest-body">
        <p className="sub">{open ? 'Te lo has llevado.' : 'Un cofre cerrado, intacto pese a la Niebla.'}</p>
        <div className="offers">
          {chest.offers.map((o, i) => (
            <article key={i} className={`panel offer ${open ? 'taken' : ''}`}>
              <Offer o={o} />
              {open ? (
                <span className="tag ok">
                  <Icon name="check" /> Recogido
                </span>
              ) : (
                <button className="btn pri" onClick={() => game.takeChestOffer(i)}>
                  Abrir el cofre
                </button>
              )}
            </article>
          ))}
        </div>
        {hint && <p className="hint-msg" role="status">{hint}</p>}
        <div className="row end">
          <button className="btn pri" onClick={() => game.leaveChest()}>
            {open ? 'Continuar' : 'Dejar el cofre'}
          </button>
        </div>
      </div>
    </div>
  );
}
