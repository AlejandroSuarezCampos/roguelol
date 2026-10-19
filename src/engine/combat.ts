import { CONFIG } from './config';
import { byPos, living, moveUnit, unitAt } from './formation';
import { computeDamage } from './damage';
import { refreshBelt } from './potions';
import { Rng } from './rng';
import { getFinalStats } from './stats';
import { addStress } from './stress';
import { applyDamage, checkOutcome, gainBlock } from './units';
import type { BeltSlot, CardDef, ChampionId, CombatMods, CombatState, CrisisKind, EnemyDef, Intent, Omen, Pos, StatBlock, Unit } from './types';

export interface AllySetup {
  id: ChampionId;
  name: string;
  pos: Pos;
  hp: number;
  maxHp: number;
  stress: number;
  crisis: CrisisKind;
  stats?: Partial<StatBlock>;
}

export interface EnemySetup {
  uid: string;
  defId: string;
  pos: Pos;
  boss?: boolean;
}

export interface CombatSetup {
  seed: number;
  allies: AllySetup[];
  enemies: EnemySetup[];
  /** Ids de CardDef del mazo combinado del equipo. */
  deck: string[];
  cards: Record<string, CardDef>;
  enemyDefs: Record<string, EnemyDef>;
  omen: Omen;
  mods: CombatMods;
  belt: BeltSlot[];
}

export function startCombat(cfg: CombatSetup): CombatState {
  const rng = new Rng(cfg.seed);
  const allies: Unit[] = cfg.allies.map((a) => ({
    id: a.id, side: 'ally', name: a.name, pos: a.pos, hp: a.hp, maxHp: a.maxHp, block: 0, stress: a.stress,
    downed: a.hp <= 0, statuses: {}, stats: getFinalStats(a.stats), crisis: a.crisis,
    crisisActive: a.stress >= CONFIG.stress.max, virtueActive: false,
  }));
  const enemies: Unit[] = cfg.enemies.map((e) => {
    const d = cfg.enemyDefs[e.defId];
    const hp = Math.round(d.maxHp * cfg.mods.hpMultiplier);
    return {
      id: e.uid, side: 'enemy', name: d.name, pos: e.pos, hp, maxHp: hp, block: 0, stress: 0, downed: false,
      statuses: cfg.mods.startShadowMark ? { shadowMark: 1 } : {}, stats: getFinalStats(d.stats), crisisActive: false, virtueActive: false,
    };
  });
  const s: CombatState = {
    units: [...allies, ...enemies],
    cards: cfg.cards,
    enemyDefs: cfg.enemyDefs,
    enemyOf: Object.fromEntries(cfg.enemies.map((e) => [e.uid, e.defId])),
    drawPile: rng.shuffle(cfg.deck.map((defId, i) => ({ uid: `c${i}`, defId }))),
    hand: [],
    discard: [],
    energy: 0,
    turn: 0,
    swapUsed: false,
    playedByOwner: {},
    otherCardsWhileSelfish: 0,
    omen: cfg.omen,
    intents: {},
    scriptIndex: {},
    mods: cfg.mods,
    belt: cfg.belt,
    pendingApMark: 0,
    rng,
    outcome: 'ongoing',
  };
  for (const e of cfg.enemies) {
    const sc = cfg.enemyDefs[e.defId].script;
    s.scriptIndex[e.uid] = 0;
    s.intents[e.uid] = cfg.mods.bossExtraIntent && e.boss ? [sc[0], sc[1 % sc.length]] : [sc[0]];
  }
  refreshBelt(s.belt);
  startTeamTurn(s);
  return s;
}

function draw(s: CombatState, n: number): void {
  for (let i = 0; i < n; i++) {
    if (!s.drawPile.length) {
      if (!s.discard.length) return;
      s.drawPile = s.rng.shuffle(s.discard);
      s.discard = [];
    }
    s.hand.push(s.drawPile.shift()!);
  }
}

/** Inicio del turno del equipo: bloqueo aliado a 0, energía, nueva mano de 5 y efectos de crisis/virtud. */
export function startTeamTurn(s: CombatState): void {
  s.turn++;
  s.energy = CONFIG.energyPerTurn;
  s.swapUsed = false;
  s.playedByOwner = {};
  s.otherCardsWhileSelfish = 0;
  s.pendingApMark = 0;
  for (const a of s.units) if (a.side === 'ally') {
    a.block = 0;
    vulnerableTick(a); // la ronda terminó: los enemigos ya actuaron
  }
  s.discard.push(...s.hand);
  s.hand = [];
  draw(s, CONFIG.handSize);
  for (const a of byPos(living(s, 'ally'))) burnTick(s, a);
  for (const a of byPos(living(s, 'ally'))) {
    if (a.virtueActive) gainBlock(a, CONFIG.virtue.blockPerTurn);
    if (a.crisisActive && a.crisis === 'rage')
      for (const o of living(s, 'ally')) if (o !== a) addStress(s, o, CONFIG.crisis.rageStressOthers);
    if (a.crisisActive && a.crisis === 'panic') moveUnit(s, a, a.pos + 1);
  }
}

/** Quemadura: al empezar el turno del afectado, daño verdadero igual a las acumulaciones y −1 acumulación. */
function burnTick(s: CombatState, u: Unit): void {
  const stacks = u.statuses.burn ?? 0;
  if (!stacks || u.downed) return;
  u.statuses.burn = stacks - 1;
  applyDamage(s, u, stacks);
}

/** Vulnerable: al final de cada ronda pierde 1 acumulación (aliados al empezar su turno, enemigos tras actuar). */
function vulnerableTick(u: Unit): void {
  if (u.statuses.vulnerable) u.statuses.vulnerable -= 1;
}

const allyAt = (s: CombatState, p: Pos): Unit | undefined => {
  const u = unitAt(s, 'ally', p);
  return u && !u.downed ? u : byPos(living(s, 'ally'))[0];
};

/** A quién golpeará de verdad una intención dirigida a la posición `p`: si está vacía o derribada, al aliado vivo más adelantado. */
export const intentTarget = allyAt;

/**
 * Valor que muestra la UI y que se aplica al resolver. Ataques: daño final contra su objetivo actual
 * (bonus de posición, crítico telegrafiado, defensa y vulnerable). Estrés: con el extra de niebla.
 */
export function intentValue(s: CombatState, enemy: Unit, i: Intent): number {
  const def = s.enemyDefs[s.enemyOf[enemy.id]];
  switch (i.kind) {
    case 'attack': {
      const additive = def.idealPositions?.includes(enemy.pos) ? (def.positionBonus ?? 0) : 0;
      const t = allyAt(s, i.target);
      if (!t) return 0;
      return computeDamage(s, enemy, t, {
        amount: i.amount, damageType: i.damageType ?? 'physical', additive, crit: i.crit ? 'always' : undefined,
      }).amount;
    }
    case 'stress':
      return i.amount + s.mods.intentStressBonus;
    case 'block':
      return i.amount;
    case 'reposition':
      return 0;
  }
}

function resolveIntent(s: CombatState, enemy: Unit, i: Intent): void {
  switch (i.kind) {
    case 'attack': {
      const t = allyAt(s, i.target);
      if (!t) return;
      applyDamage(s, t, intentValue(s, enemy, i), { crit: i.crit });
      if (enemy.statuses.shadowMark) addStress(s, t, CONFIG.mist.shadowMarkStress);
      break;
    }
    case 'block':
      gainBlock(enemy, i.amount);
      break;
    case 'stress': {
      const t = allyAt(s, i.target);
      if (t) addStress(s, t, intentValue(s, enemy, i));
      break;
    }
    case 'reposition':
      moveUnit(s, enemy, i.to);
      break;
  }
}

/** Fin del turno del equipo: cada enemigo vivo, de la posición 1 a la 4, resuelve sus intenciones visibles. */
export function endTeamTurn(s: CombatState): void {
  if (s.outcome !== 'ongoing') return;
  for (const e of byPos(living(s, 'enemy'))) {
    e.block = 0;
    burnTick(s, e);
    if (e.downed || s.outcome !== 'ongoing') continue;
    if (e.statuses.stun) {
      vulnerableTick(e);
      e.statuses.stun -= 1;
      continue;
    }
    for (const i of s.intents[e.id] ?? []) {
      if (s.outcome !== 'ongoing' || e.downed) break;
      resolveIntent(s, e, i);
    }
    vulnerableTick(e);
  }
  for (const e of living(s, 'enemy')) {
    const sc = s.enemyDefs[s.enemyOf[e.id]].script;
    s.scriptIndex[e.id] = (s.scriptIndex[e.id] + 1) % sc.length;
    s.intents[e.id] = [sc[s.scriptIndex[e.id]]];
  }
  checkOutcome(s);
  if (s.outcome === 'ongoing') startTeamTurn(s);
}

/** Estado de los aliados para volcarlo en la run al acabar el combate (la virtud no persiste). */
export function alliesAfter(s: CombatState): { id: string; hp: number; stress: number; downed: boolean }[] {
  return s.units.filter((u) => u.side === 'ally').map((u) => ({ id: u.id, hp: u.hp, stress: u.stress, downed: u.downed }));
}
