import type { EnemyDef, Pos } from '../engine/types';

export type EncounterKind = 'combat' | 'elite' | 'boss';
export interface EncounterEnemy {
  defId: string;
  pos: Pos;
}

/** Enemigos provisionales. Las intenciones apuntan a la posición del aliado (1 = frente). */
export const ENEMIES: Record<string, EnemyDef> = {
  wolf: { id: 'wolf', name: 'Gran lobo sombrío', maxHp: 68, idealPositions: [1], positionBonus: 3, stats: { armor: 10 },
    script: [{ kind: 'attack', amount: 35, target: 1 }, { kind: 'attack', amount: 31, target: 2 }, { kind: 'stress', amount: 10, target: 3 }] },
  sentinel: { id: 'sentinel', name: 'Centinela azul', maxHp: 81, stats: { armor: 20, mr: 20 },
    script: [{ kind: 'block', amount: 31 }, { kind: 'attack', amount: 41, target: 2 }, { kind: 'stress', amount: 8, target: 4 }] },
  gromp: { id: 'gromp', name: 'Gromp', maxHp: 58, stats: { armor: 10 },
    script: [{ kind: 'attack', amount: 25, target: 3, crit: true }, { kind: 'reposition', to: 1 }, { kind: 'attack', amount: 33, target: 1 }] },
  scuttler: { id: 'scuttler', name: 'Picoaguzado', maxHp: 38, idealPositions: [3, 4], positionBonus: 3,
    script: [{ kind: 'attack', amount: 20, target: 4 }, { kind: 'attack', amount: 20, target: 3 }] },
  herald: { id: 'herald', name: 'Heraldo de la Grieta', maxHp: 164, idealPositions: [1], positionBonus: 4, stats: { armor: 25, mr: 20 },
    script: [{ kind: 'attack', amount: 51, target: 1 }, { kind: 'block', amount: 45 }, { kind: 'attack', amount: 41, target: 3, crit: true }, { kind: 'stress', amount: 14, target: 2 }] },
  viego: { id: 'viego', name: 'Viego, el Rey Arruinado', maxHp: 302, stats: { armor: 25, mr: 25 },
    script: [{ kind: 'attack', amount: 56, target: 1 }, { kind: 'stress', amount: 16, target: 2 }, { kind: 'block', amount: 56 }, { kind: 'attack', amount: 45, target: 3, crit: true }] },
};

export const ENCOUNTERS: Record<EncounterKind, EncounterEnemy[][]> = {
  combat: [
    [{ defId: 'wolf', pos: 1 }, { defId: 'scuttler', pos: 3 }],
    [{ defId: 'sentinel', pos: 1 }, { defId: 'scuttler', pos: 2 }],
    [{ defId: 'gromp', pos: 1 }, { defId: 'gromp', pos: 2 }],
    [{ defId: 'wolf', pos: 1 }, { defId: 'gromp', pos: 2 }],
  ],
  elite: [
    [{ defId: 'herald', pos: 1 }, { defId: 'scuttler', pos: 3 }],
  ],
  boss: [[{ defId: 'viego', pos: 1 }, { defId: 'scuttler', pos: 4 }]],
};

/** Oro base del botín por tipo de combate. */
export const BASE_GOLD: Record<EncounterKind, number> = { combat: 30, elite: 60, boss: 120 };
