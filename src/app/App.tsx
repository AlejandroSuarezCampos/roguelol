import { ArchiveScreen } from '../screens/ArchiveScreen';
import { BattleScreen } from '../screens/BattleScreen';
import { ChestScreen } from '../screens/ChestScreen';
import { EventScreen } from '../screens/EventScreen';
import { ExpeditionMapScreen } from '../screens/ExpeditionMapScreen';
import { MainMenuScreen } from '../screens/MainMenuScreen';
import { MerchantScreen } from '../screens/MerchantScreen';
import { PartySetupScreen } from '../screens/PartySetupScreen';
import { RewardScreen } from '../screens/RewardScreen';
import { RosterScreen } from '../screens/RosterScreen';
import { TeamScreen } from '../screens/TeamScreen';
import { RestScreen } from '../screens/RestScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import { UpgradesScreen } from '../screens/UpgradesScreen';
import { useGame } from '../state/gameStore';

export function App() {
  const { screen } = useGame();
  return (
    <main className="app">
      {screen === 'menu' && <MainMenuScreen />}
      {screen === 'prep' && <PartySetupScreen />}
      {screen === 'result' && <ResultsScreen />}
      {screen === 'map' && <ExpeditionMapScreen />}
      {screen === 'battle' && <BattleScreen />}
      {screen === 'reward' && <RewardScreen />}
      {screen === 'rest' && <RestScreen />}
      {screen === 'shop' && <MerchantScreen />}
      {screen === 'event' && <EventScreen />}
      {screen === 'chest' && <ChestScreen />}
      {screen === 'team' && <TeamScreen />}
      {screen === 'upgrades' && <UpgradesScreen />}
      {screen === 'archive' && <ArchiveScreen />}
      {screen === 'roster' && <RosterScreen />}
    </main>
  );
}
