import { useMemo, useState } from 'react';
import { Card } from '../components/Card';
import { RELICS, RELIC_RARITY_LABEL } from '../data/relics';
import { Hud } from '../components/Hud';
import { Icon } from '../components/Icon';
import { CARDS, applyUpgrade, deckCardDef, isUpgradedId } from '../data/cards';
import { POTIONS } from '../engine/potions';
import { minDeckFor, removalPrice } from '../engine/shop';
import { game, useGame } from '../state/gameStore';

function Price({ price, gold, sold, label, onBuy }: { price: number; gold: number; sold?: boolean; label: string; onBuy: () => void }) {
  const can = gold >= price;
  return (
    <>
      <button className={`price ${can ? '' : 'cant'}`} disabled={sold || !can} onClick={onBuy} aria-label={sold ? 'Vendido' : `Comprar ${label} por ${price} de oro`}>
        {sold ? 'Vendido' : (<><Icon name="gold" /> {price}</>)}
      </button>
      {!sold && !can && <small className="need">Faltan {price - gold}</small>}
    </>
  );
}

/** Mercancía expuesta a la vez sobre la alfombra, con precio visible; en rojo si no alcanza el oro. */
export function MerchantScreen() {
  const { expedition: e, hint } = useGame();
  const [slotFor, setSlotFor] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);
  const deckRows = useMemo(() => {
    if (!e) return [];
    const m = new Map<string, { first: number; n: number }>();
    e.deck.forEach((id, i) => m.set(id, { first: m.get(id)?.first ?? i, n: (m.get(id)?.n ?? 0) + 1 }));
    return [...m.entries()].map(([id, v]) => ({ id, def: isUpgradedId(id) ? applyUpgrade(deckCardDef(id)) : deckCardDef(id), up: isUpgradedId(id), ...v })).sort((a, b) => a.def.owner.localeCompare(b.def.owner) || a.def.name.localeCompare(b.def.name));
  }, [e, e?.deck.length]);
  if (!e || !e.shop) return null;
  const shop = e.shop;
  const gold = e.run.gold;
  const beltFull = !e.run.belt.includes(null);
  const price = removalPrice(e);
  return (
    <div className="screen shop scene-bg">
      <Hud icon="shop" title="Comerciante errante" subtitle="Una tienda entre la Niebla" e={e} />
      <div className="stall">
        <section className="sw">
          <h3 className="fd">Cartas</h3>
          <div className="wares">
            {shop.cards.map((c, i) => (
              <div key={i} className={`ware ${c.sold ? 'sold' : ''}`}>
                <Card card={CARDS[c.defId]} cost={CARDS[c.defId].cost} size="big" />
                <Price price={c.price} gold={gold} sold={c.sold} label={CARDS[c.defId].name} onBuy={() => game.buyCard(i)} />
              </div>
            ))}
          </div>
        </section>
        <section className="sw">
          <h3 className="fd">Reliquias</h3>
          <div className="wares">
            {shop.relics.map((r, i) => (
              <div key={i} className={`ware ${r.sold ? 'sold' : ''}`}>
                <div className="wcons wide">
                  <Icon name="relic" />
                  <b>{RELICS[r.id].name}</b>
                  <small>{RELIC_RARITY_LABEL[RELICS[r.id].rarity]} · {RELICS[r.id].text}</small>
                </div>
                <Price price={r.price} gold={gold} sold={r.sold} label={RELICS[r.id].name} onBuy={() => game.buyRelic(i)} />
              </div>
            ))}
            {!shop.relics.length && <p className="sub">Ya tienes todas las reliquias.</p>}
          </div>
        </section>
        <section className="sw">
          <h3 className="fd">Pociones</h3>
          <div className="wares">
            {shop.potions.map((p, i) => (
              <div key={i} className={`ware ${p.sold ? 'sold' : ''}`}>
                <div className="wcons">
                  <Icon name="potion" />
                  <b>{POTIONS[p.id].name}</b>
                  <small>{POTIONS[p.id].healing ? 'Curativa: también fuera de combate.' : 'Solo en combate.'}</small>
                </div>
                <Price price={p.price} gold={gold} sold={p.sold} label={POTIONS[p.id].name} onBuy={() => (beltFull ? setSlotFor(i) : game.buyPotion(i))} />
              </div>
            ))}
          </div>
        </section>
        <section className="sw">
          <h3 className="fd">Servicios</h3>
          <div className="wares">
            <div className="ware">
              <div className="wcons">
                <Icon name="x" />
                <b>Eliminar carta</b>
                <small>Quita una carta del mazo ({e.deck.length}, mínimo {minDeckFor(e)}). Cada eliminación encarece la siguiente.</small>
              </div>
              <Price price={price} gold={gold} sold={e.deck.length <= minDeckFor(e)} label="Eliminar carta" onBuy={() => setRemoving(true)} />
            </div>
          </div>
        </section>
        {hint && <p className="hint-msg" role="status">{hint}</p>}
        <div className="row end">
          <button className="btn pri" onClick={() => game.leaveShop()}>
            Salir de la tienda
          </button>
        </div>
      </div>

      {slotFor !== null && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Cinturón lleno">
          <div className="panel">
            <h3><Icon name="potion" /> Cinturón lleno</h3>
            <p className="sub">Elige qué poción sustituir por {POTIONS[shop.potions[slotFor].id].name}.</p>
            <div className="row">
              {e.run.belt.map((p, i) => (
                <button key={i} className="btn" onClick={() => { game.buyPotion(slotFor, i); setSlotFor(null); }}>
                  {p ? POTIONS[p.id].name : 'Vacío'}
                </button>
              ))}
            </div>
            <button className="btn" onClick={() => setSlotFor(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {removing && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Eliminar una carta">
          <div className="panel">
            <h3><Icon name="x" /> Eliminar una carta ({price} de oro)</h3>
            <ul className="pilelist">
              {deckRows.map(({ id, def, up, first, n }) => (
                <li key={id}>
                  <button className="btn sm" onClick={() => { game.removeCard(first); setRemoving(false); }}>Eliminar</button>
                  <b>{def.name}{up ? ' +' : ''}</b> <small>{def.owner} · coste {def.cost}</small> <span className="n">×{n}</span>
                </li>
              ))}
            </ul>
            <button className="btn" onClick={() => setRemoving(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
