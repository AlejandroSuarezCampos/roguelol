import { useRef, useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import { Icon } from '../components/Icon';
import { exportBackup, importBackup } from '../save/backup';
import { appStorage, game, useGame } from '../state/gameStore';

const SECTIONS = [
  { screen: 'roster', icon: 'team', name: 'Equipo', text: 'Campeones, cartas y objeto inicial' },
  { screen: 'upgrades', icon: 'up', name: 'Desbloqueos', text: 'Contenido nuevo' },
  { screen: 'archive', icon: 'book', name: 'Archivo', text: 'Bestiario e historial' },
] as const;

/** Exportar / importar la partida como archivo: para cambiar de navegador o por si se borran los datos del sitio. */
function BackupPanel() {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportBackup(appStorage)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `shattered-runeterra-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Copia descargada.');
  };
  const read = async (f: File | undefined) => {
    if (!f) return;
    setPending(await f.text());
    if (input.current) input.current.value = '';
  };
  const restore = () => {
    const r = importBackup(appStorage, pending ?? '');
    setPending(null);
    if (r.ok) location.reload();
    else setMsg(r.reason);
  };
  return (
    <div className="backup">
      <button className="btn sm" onClick={download}>Exportar copia</button>
      <button className="btn sm" onClick={() => input.current?.click()}>Importar copia</button>
      <input ref={input} type="file" accept="application/json,.json" hidden aria-label="Archivo de copia" onChange={(ev) => void read(ev.target.files?.[0])} />
      {msg && <small className="sub" role="status">{msg}</small>}
      {pending !== null && (
        <ConfirmModal title="¿Restaurar la copia?" confirmLabel="Restaurar" danger onCancel={() => setPending(null)} onConfirm={restore}>
          <p>La expedición y el progreso de la copia <b>sustituyen</b> a los actuales de este navegador.</p>
        </ConfirmModal>
      )}
    </div>
  );
}

export function MainMenuScreen() {
  const { saved, notice, meta } = useGame();
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
              Acto {saved.act} · {saved.floor ? `Piso ${saved.floor}` : 'Entrada'} · {saved.gold} de oro
            </span>
          </button>
        )}
        <button className={`mbtn ${saved ? '' : 'main'}`} onClick={newRun}>
          <Icon name="map" />
          <b>Expedición</b>
          <span>{saved ? 'Empezar una nueva' : 'Cruza las Islas de la Sombra'}</span>
        </button>
        {SECTIONS.map((s) => (
          <button key={s.name} className="mbtn" onClick={() => game.openMenuScreen(s.screen)}>
            <Icon name={s.icon} />
            <b>{s.name}</b>
            <span>{s.screen === 'upgrades' ? `${meta.shards} Esquirlas` : s.text}</span>
          </button>
        ))}
      </div>
      <BackupPanel />
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
