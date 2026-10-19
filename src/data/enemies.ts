import type { EnemyDef, Pos } from '../engine/types';

export type EncounterKind = 'combat' | 'elite' | 'boss';
export interface EncounterEnemy {
  defId: string;
  pos: Pos;
}

/** Enemigos provisionales. Las intenciones apuntan a la posición del aliado (1 = frente). */
export const ENEMIES: Record<string, EnemyDef> = {
  wolf: { id: 'wolf', name: 'Gran lobo sombrío', maxHp: 34, idealPositions: [1], positionBonus: 2, stats: { armor: 5 },
    script: [{ kind: 'attack', amount: 7, target: 1 }, { kind: 'attack', amount: 6, target: 2 }, { kind: 'stress', amount: 8, target: 3 }] },
  sentinel: { id: 'sentinel', name: 'Centinela azul', maxHp: 40, stats: { armor: 10, mr: 10 },
    script: [{ kind: 'block', amount: 8 }, { kind: 'attack', amount: 9, target: 2 }, { kind: 'stress', amount: 6, target: 4 }] },
  gromp: { id: 'gromp', name: 'Gromp', maxHp: 28,
    script: [{ kind: 'attack', amount: 5, target: 3, crit: true }, { kind: 'reposition', to: 1 }, { kind: 'attack', amount: 7, target: 1 }] },
  scuttler: { id: 'scuttler', name: 'Picoaguzado', maxHp: 18, idealPositions: [3, 4], positionBonus: 2,
    script: [{ kind: 'attack', amount: 4, target: 4 }, { kind: 'attack', amount: 4, target: 3 }] },
  herald: { id: 'herald', name: 'Heraldo de la Grieta', maxHp: 78, idealPositions: [1], positionBonus: 3, stats: { armor: 15, mr: 10 },
    script: [{ kind: 'attack', amount: 11, target: 1 }, { kind: 'block', amount: 12 }, { kind: 'attack', amount: 9, target: 3, crit: true }, { kind: 'stress', amount: 10, target: 2 }] },
  viego: { id: 'viego', name: 'Viego, el Rey Arruinado', maxHp: 150, stats: { armor: 15, mr: 15 },
    script: [{ kind: 'attack', amount: 12, target: 1 }, { kind: 'stress', amount: 12, target: 2 }, { kind: 'block', amount: 14 }, { kind: 'attack', amount: 10, target: 3, crit: true }] },
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
