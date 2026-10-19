import { useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import { Hud } from '../components/Hud';
import { Icon } from '../components/Icon';
import { PERKS, PERK_IDS } from '../data/perks';
import { perkCost } from '../engine/meta';
import { game, useGame } from '../state/gameStore';

/** Mejoras permanentes: se compran con Esquirlas y se aplican al empezar cada expedición. */
export function UpgradesScreen() {
  const { meta, hint } = useGame();
  const [resetting, setResetting] = useState(false);
  return (
    <div className="screen perks scene-bg">
      <Hud icon="up" title="Mejoras" subtitle="Forja permanente">
        <span className="tag gold" aria-label={`${meta.shards} Esquirlas`}>
          <Icon name="relic" /> {meta.shards} Esquirlas
        </span>
        <button className="btn" onClick={() => game.toMenu()}>
          Volver al menú
        </button>
      </Hud>
      <div className="perk-body">
        <p className="sub">Moderadas a propósito: ayudan, pero no resuelven la expedición. Las Esquirlas se ganan al terminar cada una (ganes o pierdas).</p>
        <div className="perklist">
          {PERK_IDS.map((id) => {
            const def = PERKS[id];
            const level = meta.perks[id];
            const cost = perkCost(meta, id);
            const can = cost !== null && meta.shards >= cost;
            return (
              <article key={id} className="perk panel">
                <header>
                  <Icon name={def.icon} />
                  <h3>{def.name}</h3>
                  <span className="pips" role="img" aria-label={`Nivel ${level} de 3`}>
                    {[1, 2, 3].map((n) => (
                      <i key={n} className={n <= level ? 'on' : ''} />
                    ))}
                  </span>
                </header>
                <p className="now">{level ? def.text(def.values[level - 1]) : 'Sin comprar'}</p>
                {cost !== null ? (
                  <>
                    <p className="sub">Siguiente: {def.text(def.values[level])}</p>
                    <button className={`btn ${can ? 'pri' : ''}`} disabled={!can} onClick={() => game.buyPerk(id)} aria-label={`Comprar ${def.name} nivel ${level + 1} por ${cost} Esquirlas`}>
                      Nivel {level + 1} · {cost} Esquirlas
                    </button>
                    {!can && <small className="need">Faltan {cost - meta.shards}</small>}
                  </>
                ) : (
                  <span className="tag ok">
                    <Icon name="check" /> Nivel máximo
                  </span>
                )}
              </article>
            );
          })}
        </div>
        {hint && <p className="hint-msg" role="status">{hint}</p>}
        <div className="row end">
          <button className="btn dng" onClick={() => setResetting(true)}>
            Borrar progreso
          </button>
        </div>
      </div>
      {resetting && (
        <ConfirmModal title="¿Borrar todo el progreso?" confirmLabel="Borrar todo" danger onCancel={() => setResetting(false)} onConfirm={() => { game.resetProgress(); setResetting(false); }}>
          <p>Pierdes las <b>Esquirlas</b>, las <b>mejoras</b>, el <b>bestiario</b> y el <b>historial</b>. No se puede deshacer.</p>
        </ConfirmModal>
      )}
    </div>
  );
}
