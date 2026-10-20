import { useState } from 'react';
import { Card } from '../components/Card';
import { ConfirmModal } from '../components/ConfirmModal';
import { GearItem } from '../components/GearItem';
import { Hud } from '../components/Hud';
import { Icon } from '../components/Icon';
import { CARDS } from '../data/cards';
import { GEAR } from '../data/gear';
import { RELICS, RELIC_RARITY_LABEL } from '../data/relics';
import { UNLOCKS, UNLOCK_KIND_LABEL, type UnlockDef, type UnlockKind } from '../data/unlocks';
import { game, useGame } from '../state/gameStore';

function Content({ u }: { u: UnlockDef }) {
  if (u.kind === 'starter') return <GearItem id={u.ref} />;
  if (u.kind === 'card') return <Card card={CARDS[u.ref]} cost={CARDS[u.ref].cost} />;
  const r = RELICS[u.ref];
  return (
    <div className="wcons">
      <Icon name="relic" />
      <b>{r.name}</b>
      <small>{RELIC_RARITY_LABEL[r.rarity]} · {r.text}</small>
    </div>
  );
}

const nameOf = (u: UnlockDef) => (u.kind === 'card' ? CARDS[u.ref].name : u.kind === 'relic' ? RELICS[u.ref].name : GEAR[u.ref].name);

/** Desbloqueos permanentes: se compran con Esquirlas. Los objetos iniciales se eligen luego en Equipo. */
export function UpgradesScreen() {
  const { meta, hint } = useGame();
  const [resetting, setResetting] = useState(false);
  return (
    <div className="screen perks scene-bg">
      <Hud icon="up" title="Desbloqueos" subtitle="Lo que la Niebla te deja recordar">
        <span className="tag gold" aria-label={`${meta.shards} Esquirlas`}>
          <Icon name="relic" /> {meta.shards} Esquirlas
        </span>
        <button className="btn" onClick={() => game.toMenu()}>
          Volver al menú
        </button>
      </Hud>
      <div className="perk-body">
        <p className="sub">
          Las Esquirlas se ganan al terminar cada expedición (ganes o pierdas). Desbloquean contenido nuevo, no estadísticas. Los objetos iniciales
          desbloqueados se eligen para cada campeón en Equipo.
        </p>
        {(['starter', 'card', 'relic'] as UnlockKind[]).map((kind) => (
          <section key={kind}>
            <h3 className="fd">{UNLOCK_KIND_LABEL[kind]}</h3>
            <div className="perklist">
              {UNLOCKS.filter((u) => u.kind === kind).map((u) => {
                const owned = meta.unlocked.includes(u.id);
                const can = !owned && meta.shards >= u.cost;
                const label = nameOf(u);
                return (
                  <article key={u.id} className={`perk panel ${owned ? 'owned' : ''}`}>
                    <Content u={u} />
                    {owned ? (
                      <span className="tag ok">
                        <Icon name="check" /> Desbloqueado
                      </span>
                    ) : (
                      <>
                        <button className={`btn ${can ? 'pri' : ''}`} disabled={!can} onClick={() => game.buyUnlock(u.id)} aria-label={`Desbloquear ${label} por ${u.cost} Esquirlas`}>
                          Desbloquear · {u.cost} Esquirlas
                        </button>
                        {!can && <small className="need">Faltan {u.cost - meta.shards}</small>}
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
        {hint && <p className="hint-msg" role="status">{hint}</p>}
        <div className="row end">
          <button className="btn dng" onClick={() => setResetting(true)}>
            Borrar progreso
          </button>
        </div>
      </div>
      {resetting && (
        <ConfirmModal title="¿Borrar todo el progreso?" confirmLabel="Borrar todo" danger onCancel={() => setResetting(false)} onConfirm={() => { game.resetProgress(); setResetting(false); }}>
          <p>Pierdes las <b>Esquirlas</b>, los <b>desbloqueos</b>, la <b>Ascensión</b>, el <b>bestiario</b> y el <b>historial</b>. No se puede deshacer.</p>
        </ConfirmModal>
      )}
    </div>
  );
}
