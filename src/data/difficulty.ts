import { CONFIG } from '../engine/config';

export type DifficultyId = 'normal' | 'nightmare';

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  /** Una frase para el selector: lo que cambia respecto a Normal. */
  summary: string;
  enemyHp: number;
  /** Multiplica el daño y el bloqueo de las intenciones enemigas. */
  enemyAttack: number;
  /** Multiplica la probabilidad de nodos de descanso a mitad de mapa (el previo al jefe siempre está). */
  restWeight: number;
  /** Fracción de vida máxima que cura «Descansar». */
  restHeal: number;
  gold: number;
  potionDrop: number;
  shopPrice: number;
  /** Un campeón que sigue derribado al ganar un combate muere para siempre. */
  permadeath: boolean;
}

/** Único sitio con los modificadores de dificultad (spec §12): nada de `if (difficulty === …)` por el código. */
export const DIFFICULTIES: Record<DifficultyId, DifficultyDef> = {
  normal: {
    id: 'normal', name: 'Normal', summary: 'Un campeón derribado sobrevive con una herida grave.',
    enemyHp: 1, enemyAttack: 1, restWeight: 1, restHeal: CONFIG.expedition.rest.healFraction, gold: 1, potionDrop: 1, shopPrice: 1, permadeath: false,
  },
  nightmare: {
    id: 'nightmare', name: 'Pesadilla', summary: 'Muerte permanente, menos descansos, recursos escasos y enemigos más duros.',
    enemyHp: 1.25, enemyAttack: 1.2, restWeight: 0.5, restHeal: 0.2, gold: 0.75, potionDrop: 0.5, shopPrice: 1.25, permadeath: true,
  },
};
