import type { Rng } from './rng';

export type Pos = 1 | 2 | 3 | 4;
export type Side = 'ally' | 'enemy';
export type ChampionId = 'leona' | 'yasuo' | 'lux' | 'soraka';
export type CrisisKind = 'rage' | 'selfish' | 'panic' | 'despair';
export type Omen = 'lament' | 'weight' | 'drift' | 'bleed';
export type StatusId = 'mark' | 'stun' | 'shadowMark' | 'burn' | 'charge' | 'vulnerable';
export type CardType = 'attack' | 'defense' | 'skill' | 'support' | 'control';
export type TargetKind = 'enemy' | 'ally' | 'self' | 'allEnemies' | 'allAllies';
export type DamageType = 'physical' | 'magic' | 'true';
export type Rarity = 'common' | 'rare' | 'epic';
export type Keyword = 'block' | 'mark' | 'burn' | 'charge' | 'displacement';
/** A quién afecta un efecto: al objetivo de la carta (por defecto) o al propio lanzador. */
export type EffectOn = 'target' | 'self';

/** Estadísticas que usa el cálculo de daño (§5.4). El gear se sumará en la fase 3 vía getFinalStats. */
export interface StatBlock {
  ad: number;
  ap: number;
  critChance: number;
  critDamage: number;
  penetration: number;
  armor: number;
  mr: number;
}

export type Effect =
  | {
      type: 'damage';
      amount: number;
      damageType: DamageType;
      scaling?: { stat: 'ad' | 'ap'; ratio: number };
      canCrit?: boolean;
      /** Consume todas las acumulaciones del estado (en el lanzador o en el objetivo) y suma daño por cada una. */
      consumeStatus?: { status: 'charge' | 'mark'; from: 'self' | 'target'; bonusPerStack: number };
      on?: EffectOn;
    }
  | { type: 'block'; amount: number; on?: EffectOn }
  | { type: 'heal'; amount: number; on?: EffectOn }
  | { type: 'applyStatus'; status: StatusId; stacks: number; on?: EffectOn }
  /** `to`: posición absoluta; `by`: relativa (+1 = una hacia atrás). */
  | { type: 'move'; to?: Pos; by?: number; on?: EffectOn }
  | { type: 'reduceStress'; amount: number; on?: EffectOn }
  | { type: 'revive'; hp: number; on?: EffectOn }
  /** Roba cartas (una vez por carta, no por objetivo). */
  | { type: 'draw'; amount: number }
  /** Consume todas las acumulaciones del estado del lanzador y gana `perStack` de bloqueo por cada una. */
  | { type: 'convertStatus'; status: 'charge' | 'mark'; perStack: number; into: 'block' };

export interface CardUpgrade {
  cost?: number;
  effects?: Effect[];
  positionBonus?: Effect[];
  text: string;
}

export interface CardDef {
  id: string;
  name: string;
  owner: ChampionId;
  cost: number;
  type: CardType;
  target: TargetKind;
  rarity: Rarity;
  keywords: Keyword[];
  text: string;
  effects: Effect[];
  idealPositions?: Pos[];
  positionBonus?: Effect[];
  upgrade?: CardUpgrade;
}

export interface CardInstance {
  uid: string;
  defId: string;
  upgraded?: boolean;
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
  stats: StatBlock;
  crisis?: CrisisKind;
  crisisActive: boolean;
  virtueActive: boolean;
}

export type Intent =
  | { kind: 'attack'; amount: number; target: Pos; crit?: boolean; damageType?: DamageType }
  | { kind: 'block'; amount: number }
  | { kind: 'stress'; amount: number; target: Pos }
  | { kind: 'reposition'; to: Pos };

export interface EnemyDef {
  id: string;
  name: string;
  maxHp: number;
  script: Intent[];
  stats?: Partial<StatBlock>;
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

/** Evento de combate que pueden escuchar las reliquias. Son datos planos: el motor los empuja a la cola sin conocer las reliquias. */
export type RelicEvent =
  | { type: 'combatStart' }
  | { type: 'turnStart' }
  | { type: 'cardPlayed'; owner: ChampionId; cardType: CardType }
  | { type: 'statusConsumed'; owner: ChampionId; status: StatusId; stacks: number }
  | { type: 'championDowned'; unit: string }
  /** Un campeón ha hecho un crítico con una carta. */
  | { type: 'criticalHit'; owner: ChampionId; target: string }
  /** Un enemigo ha golpeado a un campeón (aunque el bloqueo lo absorba). */
  | { type: 'allyHit'; unit: ChampionId; attacker: string; crit: boolean }
  /** El estrés de un campeón acaba de cruzar hacia arriba los 50 (agobiado) o los 75 (al límite). */
  | { type: 'stressThreshold'; unit: ChampionId; tier: 'overwhelmed' | 'edge' };

export interface RelicState {
  attacksThisTurn: number;
  ownersThisTurn: ChampionId[];
  /** Cuántas veces se activó cada reliquia este turno / en este combate (para sus límites). */
  turnUses: Record<string, number>;
  combatUses: Record<string, number>;
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
  /** Ids de las reliquias de la run, en orden de obtención. */
  relics: string[];
  relicState: RelicState;
  /** Cola de eventos pendientes de las reliquias: la vacía `processRelics` al final de cada acción. */
  relicQueue: RelicEvent[];
  /** Activaciones, en orden, para el feedback de la UI. */
  relicLog: { relic: string; turn: number }[];
  /** Aliados que han caído en algún momento del combate (aunque luego los reanimen). */
  fallen: string[];
  /** Gear equipado (para sus pasivas y desventajas). */
  gear: { wearer: ChampionId; gearId: string }[];
  /** Pasivas «una vez por expedición» ya gastadas (`campeón:objeto`); vuelve a la expedición al acabar. */
  spentGear: string[];
  /** Marcas que aplicará la siguiente carta de AP de este turno (Elixir de brujería). */
  pendingApMark: number;
  rng: Rng;
  outcome: 'ongoing' | 'won' | 'lost';
}
