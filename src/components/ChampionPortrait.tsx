import { loadingArt } from '../data/art';
import { CHAMPIONS } from '../data/champions';
import type { ChampionId } from '../engine/types';
import { Portrait } from './Portrait';

export function ChampionPortrait({ id, className = '' }: { id: ChampionId; className?: string }) {
  const c = CHAMPIONS[id];
  return <Portrait src={loadingArt(c.ddragon)} mono={c.name[0]} color={c.color} bg={c.bg} alt={c.name} className={className} />;
}
