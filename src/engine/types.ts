import type { Rng } from './rng';

export type Pos = 1 | 2 | 3 | 4;
export type Side = 'ally' | 'enemy';
export type ChampionId = 'leona' | 'yasuo' | 'lux' | 'soraka';
export type CrisisKind = 'rage' | 'selfish' | 'panic' | 'despair';
export type Omen = 'lament' | 'weight' | 'drift' | 'bleed';
export type StatusId = 'mark' | 'stun' | 'shadowMark';
export type CardType = 'attack' | 'defense' | 'skill' | 'support' | 'control';
export type TargetKind = 'enemy' | 'ally' | 'self' | 'allEnemies' | 'allAllies';
/** A quién afecta un efecto: al objetivo de la carta (por defecto) o al propio lanzador. */
export type EffectOn = 'target' | 'self';

export type Effect =
  | { type: 'damage'; amount: number; canCrit?: boolean; on?: EffectOn }
  | { type: 'block'; amount: number; on?: EffectOn }
  | { type: 'heal'; amount: number; on?: EffectOn }
  | { type: 'applyStatus'; status: StatusId; stacks: number; on?: EffectOn }
  /** `to`: posición absoluta; `by`: relativa (+1 = una hacia atrás). */
  | { type: 'move'; to?: Pos; by?: number; on?: EffectOn }
  | { type: 'reduceStress'; amount: number; on?: EffectOn }
  | { type: 'revive'; hp: number; on?: EffectOn };

export interface CardDef {
  id: string;
  name: string;
  owner: ChampionId;
  cost: number;
  type: CardType;
  target: TargetKind;
  effects: Effect[];
  scaling?: 'ad' | 'ap';
  idealPositions?: Pos[];
  positionBonus?: Effect[];
}

export interface CardInstance {
  uid: string;
  defId: string;
}

export interface Unit {
  /** Para aliados, el id del campeón (coincide con `CardDef.owner`). */
  id: string;
  side: Side;
  name: string;
  pos: Pos;
  hp: number;
  maxHp: number;
  block: number;
  stress: number;
  /** Aliado: derribado. Enemigo: derrotado. */
  downed: boolean;
  statuses: Partial<Record<StatusId, number>>;
  critChance: number;
  crisis?: CrisisKind;
  crisisActive: boolean;
  virtueActive: boolean;
}

export type Intent =
  | { kind: 'attack'; amount: number; target: Pos; crit?: boolean }
  | { kind: 'block'; amount: number }
  | { kind: 'stress'; amount: number; target: Pos }
  | { kind: 'reposition'; to: Pos };

export interface EnemyDef {
  id: string;
  name: string;
  maxHp: number;
  script: Intent[];
  idealPositions?: Pos[];
  /** Daño extra de sus ataques desde una posición ideal. */
  positionBonus?: number;
}

export type PotionId = 'health' | 'refillable' | 'iron' | 'sorcery';
export type BeltSlot = { id: PotionId; spent: boolean } | null;

/** Modificadores de combate que vienen de la Niebla Negra. */
export interface CombatMods {
  intentStressBonus: number;
  startShadowMark: boolean;
  hpMultiplier: number;
  bossExtraIntent: boolean;
}

export interface CombatState {
  units: Unit[];
  cards: Record<string, CardDef>;
  enemyDefs: Record<string, EnemyDef>;
  /** uid del enemigo → id de su EnemyDef. */
  enemyOf: Record<string, string>;
  drawPile: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  energy: number;
  turn: number;
  swapUsed: boolean;
  playedByOwner: Partial<Record<ChampionId, number>>;
  otherCardsWhileSelfish: number;
  omen: Omen;
  /** Intenciones visibles por enemigo (más de una si el jefe gana la intención extra). */
  intents: Record<string, Intent[]>;
  scriptIndex: Record<string, number>;
  mods: CombatMods;
  belt: BeltSlot[];
  /** Marcas que aplicará la siguiente carta de AP de este turno (Elixir de brujería). */
  pendingApMark: number;
  rng: Rng;
  outcome: 'ongoing' | 'won' | 'lost';
}
