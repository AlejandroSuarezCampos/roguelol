import { CONFIG } from '../engine/config';
import type { EncounterKind } from './enemies';

/** Modificadores de una expedición. Salen del nivel de Ascensión y son el único sitio de donde el código lee la dificultad. */
export interface AscensionMods {
  /** Multiplica la vida de los enemigos por tipo de encuentro. */
  enemyHp: Record<EncounterKind, number>;
  /** Multiplica el daño y el bloqueo de las intenciones enemigas por tipo de encuentro. */
  enemyAttack: Record<EncounterKind, number>;
  /** Multiplica la probabilidad de élites en el mapa. */
  eliteWeight: number;
  /** Multiplica la probabilidad de nodos de descanso a mitad de mapa (el previo al jefe siempre está). */
  restWeight: number;
  /** Fracción de vida máxima que cura «Descansar». */
  restHeal: number;
  /** Estrés con el que empieza cada campeón. */
  startStress: number;
  gold: number;
  potionDrop: number;
  shopPrice: number;
  /** Fracción del oro que se conserva al retirarse. */
  retreatGold: number;
  /** Un campeón que sigue derribado al ganar un combate muere para siempre. */
  permadeath: boolean;
}

export interface AscensionLevel {
  level: number;
  /** Lo que añade este nivel (los niveles son acumulativos, como en Slay the Spire). */
  text: string;
  apply: (m: AscensionMods) => void;
}

/** Niveles de Ascensión provisionales. Ganar una expedición en el nivel más alto desbloqueado desbloquea el siguiente. */
export const ASCENSION_LEVELS: AscensionLevel[] = [
  { level: 1, text: 'Más élites en el mapa.', apply: (m) => void (m.eliteWeight = 1.6) },
  { level: 2, text: 'Los enemigos normales hacen un 10 % más de daño.', apply: (m) => void (m.enemyAttack.combat *= 1.1) },
  { level: 3, text: 'Las élites tienen un 15 % más de vida y daño.', apply: (m) => ((m.enemyHp.elite *= 1.15), (m.enemyAttack.elite *= 1.15)) },
  { level: 4, text: 'El jefe tiene un 15 % más de vida y daño.', apply: (m) => ((m.enemyHp.boss *= 1.15), (m.enemyAttack.boss *= 1.15)) },
  { level: 5, text: 'Descansar cura el 20 % de la vida máxima en vez del 30 %.', apply: (m) => void (m.restHeal = 0.2) },
  { level: 6, text: 'Los campeones empiezan con 15 de estrés.', apply: (m) => void (m.startStress = 15) },
  { level: 7, text: 'Los enemigos normales tienen un 15 % más de vida.', apply: (m) => void (m.enemyHp.combat *= 1.15) },
  { level: 8, text: 'Menos descansos en el mapa y un 25 % menos de oro.', apply: (m) => ((m.restWeight = 0.5), (m.gold = 0.75)) },
  { level: 9, text: 'La mitad de pociones, el comerciante un 25 % más caro y al retirarte conservas solo el 25 % del oro.', apply: (m) => ((m.potionDrop = 0.5), (m.shopPrice = 1.25), (m.retreatGold = 0.25)) },
  { level: 10, text: 'Muerte permanente: un campeón que sigue derribado al ganar un combate muere para siempre.', apply: (m) => void (m.permadeath = true) },
];

export const MAX_ASCENSION = ASCENSION_LEVELS.length;

/** Modificadores acumulados hasta el nivel `level` (0 = sin Ascensión). */
export function ascensionMods(level: number): AscensionMods {
  const m: AscensionMods = {
    enemyHp: { combat: 1, elite: 1, boss: 1 },
    enemyAttack: { combat: 1, elite: 1, boss: 1 },
    eliteWeight: 1,
    restWeight: 1,
    restHeal: CONFIG.expedition.rest.healFraction,
    startStress: 0,
    gold: 1,
    potionDrop: 1,
    shopPrice: 1,
    retreatGold: 0.5,
    permadeath: false,
  };
  for (const l of ASCENSION_LEVELS) if (l.level <= level) l.apply(m);
  return m;
}

export const isAscension = (x: unknown): x is number => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= MAX_ASCENSION;
