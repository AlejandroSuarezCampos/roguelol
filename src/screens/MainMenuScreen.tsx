import { useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import { Icon } from '../components/Icon';
import { game, useGame } from '../state/gameStore';

const SOON = [
  { icon: 'team', name: 'Equipo', text: 'Fichas, gear y mazo' },
  { icon: 'up', name: 'Mejoras', text: 'Forja de cartas' },
  { icon: 'book', name: 'Archivo', text: 'Campeones y bestiario' },
];

export function MainMenuScreen() {
  const { saved, notice } = useGame();
  const [confirming, setConfirming] = useState(false);
  const newRun = () => (saved ? setConfirming(true) : game.newExpedition());
  return (
    <div className="screen menu">
      <div className="menubg" />
      <h1 className="logo">
        <small>League of Legends</small>
        Shattered
        <br />
        Runeterra
      </h1>
      <p className="sub">Roguelike táctico de cartas · Islas de la Sombra</p>
      {notice && (
        <p className="warnbox red notice" role="alert">
          <Icon name="warn" /> <span>{notice}</span>
          <button className="btn sm" onClick={() => game.dismissNotice()}>Entendido</button>
        </p>
      )}
      <div className="mainbtns">
        {saved && (
          <button className="mbtn main" onClick={() => game.continueExpedition()}>
            <Icon name="flag" />
            <b>Continuar</b>
            <span>
              {saved.floor ? `Piso ${saved.floor}` : 'Entrada'} · {saved.gold} de oro
            </span>
          </button>
        )}
        <button className={`mbtn ${saved ? '' : 'main'}`} onClick={newRun}>
          <Icon name="map" />
          <b>Expedición</b>
          <span>{saved ? 'Empezar una nueva' : 'Cruza las Islas de la Sombra'}</span>
        </button>
        {SOON.map((s) => (
          <button key={s.name} className="mbtn" disabled aria-disabled="true">
            <Icon name={s.icon} />
            <b>{s.name}</b>
            <span>Próximamente</span>
          </button>
        ))}
      </div>
      {confirming && (
        <ConfirmModal title="¿Empezar otra expedición?" confirmLabel="Empezar otra" danger onCancel={() => setConfirming(false)} onConfirm={() => game.newExpedition()}>
          <p>Ya tienes una expedición guardada. Si empiezas otra, <b>se perderá</b>.</p>
        </ConfirmModal>
      )}
      <p className="credit">
        Proyecto fan no comercial. Arte de campeones y monstruos © Riot Games, enlazado desde Data Dragon y CommunityDragon.
      </p>
    </div>
  );
}
