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
    node: 8,
    elite: 15,
    stoke: -15,
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
    floors: 8,
    rest: { healFraction: 0.3, stressRelief: 20 },
    /** Normal (§12): un campeón derribado sobrevive a la victoria con una herida grave. */
    wound: { maxHpLoss: 0.1, cap: 3, recoverHpFraction: 0.25 },
    retreatGoldKept: 0.5,
  },
  potions: { drop: { combat: 0.35, elite: 1, boss: 0 }, beltSize: 3, health: 20, refillable: 8, iron: 15, sorceryMarks: 2 },
} as const;
