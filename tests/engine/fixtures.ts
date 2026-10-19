import { CRISIS } from '../../src/data/champions';
import { Rng } from '../../src/engine/rng';
import type { CardDef, ChampionId, CombatState, EnemyDef, Pos, Unit } from '../../src/engine/types';

/** RNG de test: devuelve los valores dados en orden y después 0.99 (crisis, sin crítico, sin reliquia). */
export class SeqRng extends Rng {
  constructor(private seq: number[]) {
    super(1);
  }
  override next(): number {
    return this.seq.length ? this.seq.shift()! : 0.99;
  }
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export const ally = (id: ChampionId, pos: Pos, over: Partial<Unit> = {}): Unit => ({
  id, side: 'ally', name: cap(id), pos, hp: 40, maxHp: 40, block: 0, stress: 0, downed: false, statuses: {},
  critChance: 0, crisis: CRISIS[id], crisisActive: false, virtueActive: false, ...over,
});

export const enemy = (id: string, pos: Pos, over: Partial<Unit> = {}): Unit => ({
  id, side: 'enemy', name: id, pos, hp: 30, maxHp: 30, block: 0, stress: 0, downed: false, statuses: {},
  critChance: 0, crisisActive: false, virtueActive: false, ...over,
});

export const CARDS: Record<string, CardDef> = {
  strike: { id: 'strike', name: 'Golpe', owner: 'leona', cost: 1, type: 'attack', target: 'enemy',
    effects: [{ type: 'damage', amount: 6 }], idealPositions: [1, 2], positionBonus: [{ type: 'damage', amount: 3 }] },
  guard: { id: 'guard', name: 'Guardia', owner: 'leona', cost: 1, type: 'defense', target: 'self', effects: [{ type: 'block', amount: 8 }] },
  zenith: { id: 'zenith', name: 'Hoja del cénit', owner: 'leona', cost: 2, type: 'attack', target: 'enemy',
    effects: [{ type: 'damage', amount: 9 }, { type: 'move', to: 1, on: 'self' }] },
  sweep: { id: 'sweep', name: 'Hoja cortante', owner: 'yasuo', cost: 0, type: 'attack', target: 'enemy',
    effects: [{ type: 'damage', amount: 4 }, { type: 'move', by: 1 }] },
  tempest: { id: 'tempest', name: 'Tempestad', owner: 'yasuo', cost: 1, type: 'attack', target: 'enemy',
    effects: [{ type: 'damage', amount: 10, canCrit: true }] },
  bind: { id: 'bind', name: 'Enlace de luz', owner: 'lux', cost: 1, type: 'skill', target: 'enemy', scaling: 'ap',
    effects: [{ type: 'damage', amount: 5 }, { type: 'applyStatus', status: 'mark', stacks: 1 }],
    idealPositions: [3, 4], positionBonus: [{ type: 'applyStatus', status: 'mark', stacks: 1 }] },
  barrier: { id: 'barrier', name: 'Barrera', owner: 'lux', cost: 1, type: 'defense', target: 'ally', effects: [{ type: 'block', amount: 6 }] },
  spark: { id: 'spark', name: 'Chispa final', owner: 'lux', cost: 2, type: 'skill', target: 'allEnemies', scaling: 'ap',
    effects: [{ type: 'damage', amount: 8 }] },
  touch: { id: 'touch', name: 'Toque celestial', owner: 'soraka', cost: 1, type: 'support', target: 'ally', effects: [{ type: 'heal', amount: 10 }] },
  calm: { id: 'calm', name: 'Calma', owner: 'soraka', cost: 1, type: 'support', target: 'ally', effects: [{ type: 'reduceStress', amount: 12 }] },
  rebirth: { id: 'rebirth', name: 'Renacer', owner: 'soraka', cost: 3, type: 'support', target: 'ally', effects: [{ type: 'revive', hp: 20 }] },
};

export const ENEMIES: Record<string, EnemyDef> = {
  wolf: { id: 'wolf', name: 'Lobo', maxHp: 30, idealPositions: [1], positionBonus: 2,
    script: [{ kind: 'attack', amount: 8, target: 1 }, { kind: 'stress', amount: 10, target: 2 }] },
  gromp: { id: 'gromp', name: 'Gromp', maxHp: 22,
    script: [{ kind: 'attack', amount: 5, target: 3, crit: true }, { kind: 'reposition', to: 1 }] },
  viego: { id: 'viego', name: 'Viego', maxHp: 100,
    script: [{ kind: 'attack', amount: 12, target: 1 }, { kind: 'block', amount: 10 }] },
};

/** Estado de combate mínimo: 4 aliados (Leona 1 … Soraka 4) y 2 enemigos (e1 lobo en 1, e2 gromp en 2). */
export function makeState(over: Partial<CombatState> = {}): CombatState {
  return {
    units: [ally('leona', 1), ally('yasuo', 2), ally('lux', 3), ally('soraka', 4), enemy('e1', 1), enemy('e2', 2)],
    cards: CARDS, enemyDefs: ENEMIES, enemyOf: { e1: 'wolf', e2: 'gromp' },
    drawPile: [], hand: [], discard: [], energy: 3, turn: 1, swapUsed: false, playedByOwner: {}, otherCardsWhileSelfish: 0,
    omen: 'lament', intents: {}, scriptIndex: {},
    mods: { intentStressBonus: 0, startShadowMark: false, hpMultiplier: 1, bossExtraIntent: false },
    belt: [null, null, null], pendingApMark: 0, rng: new SeqRng([]), outcome: 'ongoing', ...over,
  };
}

export const u = (s: CombatState, id: string): Unit => s.units.find((x) => x.id === id)!;

/** Mete cartas en la mano y devuelve sus uid en el mismo orden. */
export function give(s: CombatState, ...defIds: string[]): string[] {
  const inst = defIds.map((defId, i) => ({ uid: `h${s.hand.length + i}`, defId }));
  s.hand.push(...inst);
  return inst.map((c) => c.uid);
}
