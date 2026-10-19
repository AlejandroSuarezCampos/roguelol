import { Icon } from '../components/Icon';
import { game } from '../state/gameStore';

const SOON = [
  { icon: 'team', name: 'Equipo', text: 'Fichas, gear y mazo' },
  { icon: 'up', name: 'Mejoras', text: 'Forja de cartas' },
  { icon: 'book', name: 'Archivo', text: 'Campeones y bestiario' },
];

export function MainMenuScreen() {
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
      <div className="mainbtns">
        <button className="mbtn main" onClick={() => game.newExpedition()}>
          <Icon name="map" />
          <b>Expedición</b>
          <span>Cruza las Islas de la Sombra</span>
        </button>
        {SOON.map((s) => (
          <button key={s.name} className="mbtn" disabled aria-disabled="true">
            <Icon name={s.icon} />
            <b>{s.name}</b>
            <span>Próximamente</span>
          </button>
        ))}
      </div>
      <p className="credit">
        Proyecto fan no comercial. Arte de campeones y monstruos © Riot Games, enlazado desde Data Dragon y CommunityDragon.
      </p>
    </div>
  );
}
