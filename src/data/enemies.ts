import type { EnemyDef, Pos } from '../engine/types';

export type EncounterKind = 'combat' | 'elite' | 'boss';
export interface EncounterEnemy {
  defId: string;
  pos: Pos;
}

/** Enemigos provisionales. Las intenciones apuntan a la posición del aliado (1 = frente). */
export const ENEMIES: Record<string, EnemyDef> = {
  wolf: { id: 'wolf', name: 'Gran lobo sombrío', maxHp: 65, idealPositions: [1], positionBonus: 3, stats: { armor: 10 },
    script: [{ kind: 'attack', amount: 28, target: 1 }, { kind: 'attack', amount: 24, target: 2 }, { kind: 'stress', amount: 10, target: 3 }] },
  sentinel: { id: 'sentinel', name: 'Centinela azul', maxHp: 77, stats: { armor: 20, mr: 20 },
    script: [{ kind: 'block', amount: 24 }, { kind: 'attack', amount: 32, target: 2 }, { kind: 'stress', amount: 8, target: 4 }] },
  gromp: { id: 'gromp', name: 'Gromp', maxHp: 55, stats: { armor: 10 },
    script: [{ kind: 'attack', amount: 20, target: 3, crit: true }, { kind: 'reposition', to: 1 }, { kind: 'attack', amount: 26, target: 1 }] },
  scuttler: { id: 'scuttler', name: 'Picoaguzado', maxHp: 36, idealPositions: [3, 4], positionBonus: 3,
    script: [{ kind: 'attack', amount: 16, target: 4 }, { kind: 'attack', amount: 16, target: 3 }] },
  herald: { id: 'herald', name: 'Heraldo de la Grieta', maxHp: 156, idealPositions: [1], positionBonus: 4, stats: { armor: 25, mr: 20 },
    script: [{ kind: 'attack', amount: 40, target: 1 }, { kind: 'block', amount: 36 }, { kind: 'attack', amount: 32, target: 3, crit: true }, { kind: 'stress', amount: 14, target: 2 }] },
  viego: { id: 'viego', name: 'Viego, el Rey Arruinado', maxHp: 288, stats: { armor: 25, mr: 25 },
    script: [{ kind: 'attack', amount: 44, target: 1 }, { kind: 'stress', amount: 16, target: 2 }, { kind: 'block', amount: 44 }, { kind: 'attack', amount: 36, target: 3, crit: true }] },
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
