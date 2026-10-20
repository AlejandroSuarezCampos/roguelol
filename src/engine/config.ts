/** Valores de balance provisionales (§18 + spec de reglas núcleo). Un único sitio: no los dupliques. */
export const CONFIG = {
  energyPerTurn: 3,
  handSize: 5,
  cardsPerChampion: 3,
  swapCost: 1,
  critMultiplier: 1.5,
  /** Escala de la mitigación: daño × escala / (escala + defensa efectiva) (§5.4). */
  defenseScale: 100,
  status: { vulnerableBonus: 0.5 },
  stress: { max: 100, critHit: 5, allyDowned: 10, enemyDefeated: -3, virtueChance: 0.25, virtueResetTo: 50 },
  crisis: { rageDamage: 3, rageStressOthers: 5, despairHealFactor: 0.5, despairSelfStress: 3 },
  virtue: { blockPerTurn: 4 },
  omen: { lamentStress: 6, weightCost: 1, bleedDamage: 4 },
  mist: {
    node: 5,
    elite: 9,
    stoke: -10,
    tiers: { mist: 30, dense: 60, ruin: 90 },
    intentStressBonus: 3,
    shadowMarkStress: 2,
    ruinHpMultiplier: 1.2,
    goldBonus: 0.15,
    baseCardOptions: 3,
    denseCardOptions: 4,
    ruinNormalRelicChance: 0.1,
    bossExtraIntentAt: 60,
  },
  expedition: {
    floors: 15,
    /** Piso (0-based) entero de tesoros, a mitad de mapa como en Slay the Spire. */
    chestFloor: 7,
    maxShrines: 2,
    rest: { healFraction: 0.3, stressRelief: 20 },
    /** Normal (§12): un campeón derribado sobrevive a la victoria con una herida grave. */
    wound: { maxHpLoss: 0.1, cap: 3, recoverHpFraction: 0.25 },
  },
  relics: { maxActivationsPerDrain: 30 },
  /** Tesoro: oro que trae el cofre si ya se tienen todas las reliquias. */
  chest: { fallbackGold: 150 },
  /** Metaprogresión (spec §14): Esquirlas por expedición. */
  meta: { perFloor: 3, perCombat: 2, perElite: 5, victoryBonus: 40, nightmareMultiplier: 1.5, minShards: 5 },
  gear: {
    options: 3,
    dropChance: { combat: 0.2, elite: 1, boss: 1 },
    rarityWeights: {
      combat: { common: 0.7, rare: 0.3, legendary: 0 },
      elite: { common: 0.2, rare: 0.6, legendary: 0.2 },
      boss: { common: 0, rare: 0.6, legendary: 0.4 },
    },
  },
  shop: {
    /** Como en Slay the Spire: 6 cartas, 3 reliquias, 3 pociones y eliminar cartas. */
    cards: 6,
    relics: 3,
    relicPrice: { common: 120, rare: 170, legendary: 230 },
    cardPrice: { common: 50, rare: 80, epic: 120 },
    potionPrice: { health: 35, refillable: 40, iron: 50, sorcery: 45 },
    removeCard: 75,
    removeCardStep: 25,
    /** No se puede dejar el mazo por debajo de esto por cada campeón vivo (= cartas por campeón y turno). */
    minDeckPerChampion: 3,
  },
  potions: { drop: { combat: 0.35, elite: 1, boss: 0 }, beltSize: 3, health: 20, refillable: 8, iron: 15, sorceryMarks: 2 },
} as const;
