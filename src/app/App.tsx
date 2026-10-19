import { ExpeditionMapScreen } from '../screens/ExpeditionMapScreen';
import { MainMenuScreen } from '../screens/MainMenuScreen';
import { PartySetupScreen } from '../screens/PartySetupScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import { useGame } from '../state/gameStore';

export function App() {
  const { screen } = useGame();
  return (
    <div className="app">
      {screen === 'menu' && <MainMenuScreen />}
      {screen === 'prep' && <PartySetupScreen />}
      {screen === 'result' && <ResultsScreen />}
      {screen === 'map' && <ExpeditionMapScreen />}
      {(screen === 'battle' || screen === 'reward' || screen === 'rest') && <p>En construcción: {screen}</p>}
    </div>
  );
}
