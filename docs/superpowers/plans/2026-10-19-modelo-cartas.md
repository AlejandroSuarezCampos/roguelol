# Modelo de cartas, estadísticas y daño (§9 y §5.4) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adaptar el motor ya fusionado en `main` al modelo de cartas de §9 (rareza, palabras clave, texto, mejoras, daño tipado) y a la ruta de daño de §5.4 (estadísticas, crítico, penetración, mitigación, vulnerable), con los estados Quemadura, Carga y Vulnerable.

**Architecture:** Dos módulos nuevos y puros: `stats.ts` (`getFinalStats`) y `damage.ts` (`computeDamage`, solo calcula). `applyDamage` sigue siendo el único que aplica daño. `cards.ts` gana `cardOf` (mejoras) e `isApCard`; `combat.ts` usa `computeDamage` en las intenciones y añade los ticks de quemadura y vulnerable. Todos los números nuevos viven en `config.ts`.

**Tech Stack:** TypeScript 5.9 estricto, Vitest 5, Node 24. Sin dependencias nuevas.

**Spec:** [`docs/superpowers/specs/2026-10-19-modelo-cartas-design.md`](../specs/2026-10-19-modelo-cartas-design.md) (enmienda a `docs/handoff/CLAUDE_CODE_SPEC.md` y complementa `2026-10-19-reglas-nucleo-design.md`).

## Global Constraints

- Todo número ajustable vive solo en `src/engine/config.ts` (`defenseScale: 100`, `status.vulnerableBonus: 0.5`, `critMultiplier: 1.5`).
- El motor no importa nada de UI ni de React; aleatoriedad solo a través de `s.rng`.
- Los 81 tests existentes siguen pasando con los mismos números (estadísticas a 0 por defecto, daño `physical`).
- Al final: `npx tsc --noEmit` sale con 0 y `npx vitest run` da **101 tests en verde (10 ficheros)**.
- El arte de Riot nunca se descarga al repositorio (no afecta a este plan, pero no lo rompas).
- Commits con `Co-Authored-By:` del modelo que los hace. **No hacer push** de `main`.

## Por qué es una sola tarea

Cambiar `Unit.stats` y el efecto de daño (`damageType` obligatorio, sin `CardDef.scaling`) rompe la compilación de `cards.ts`, `combat.ts` y los fixtures a la vez: no hay un punto intermedio que compile. La tarea se hace entera, con los tests nuevos escritos primero. Todo el código de abajo ya se validó en una copia aparte (`tsc` 0, 101 tests).

---

### Task 1: Modelo §9 + ruta de daño §5.4

**Files:**
- Create: `src/engine/stats.ts`, `src/engine/damage.ts`, `tests/engine/damage.test.ts`
- Modify: `src/engine/types.ts`, `src/engine/config.ts`, `src/engine/cards.ts`, `src/engine/combat.ts`, `tests/engine/fixtures.ts`, `tests/engine/cards.test.ts`, `tests/engine/combat.test.ts`

**Interfaces:**
- Produces: `getFinalStats(base?: Partial<StatBlock>, mods?: Partial<StatBlock>[]): StatBlock`, `DEFAULT_STATS`; `computeDamage(s, source, target, d: DamageSpec): { amount; crit }`; `cardOf(s, inst): CardDef`; `isApCard(card): boolean`; `Unit.stats: StatBlock` (sustituye a `Unit.critChance`); `AllySetup.stats?: Partial<StatBlock>`; `EnemyDef.stats?`; estados `burn`, `charge`, `vulnerable`.
- Consumes: lo que ya existe en `main` (`applyDamage`, `startCombat`, `startTeamTurn`, `endTeamTurn`, `intentValue`, `SeqRng`, `makeState`, `u`, `give`, `setup`).

- [ ] **Step 1: Escribir los tests nuevos**

Crea `tests/engine/damage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeDamage } from '../../src/engine/damage';
import { getFinalStats } from '../../src/engine/stats';
import { SeqRng, makeState, u } from './fixtures';

describe('getFinalStats', () => {
  it('parte de 0 (crítico ×1,5) y suma los bonos planos', () => {
    expect(getFinalStats()).toEqual({ ad: 0, ap: 0, critChance: 0, critDamage: 1.5, penetration: 0, armor: 0, mr: 0 });
    expect(getFinalStats({ ad: 20 }, [{ ad: 10, armor: 5 }, { armor: 5 }])).toMatchObject({ ad: 30, armor: 10 });
  });
});

describe('computeDamage (§5.4)', () => {
  const hit = (over: Parameters<typeof computeDamage>[3], setup?: (s: ReturnType<typeof makeState>) => void) => {
    const s = makeState();
    setup?.(s);
    return computeDamage(s, u(s, 'yasuo'), u(s, 'e1'), over).amount;
  };

  it('sin defensa, el daño base pasa entero', () => {
    expect(hit({ amount: 6, damageType: 'physical' })).toBe(6);
  });

  it('escala con AD o AP del lanzador', () => {
    expect(hit({ amount: 6, damageType: 'physical', scaling: { stat: 'ad', ratio: 0.5 } }, (s) => (u(s, 'yasuo').stats.ad = 20))).toBe(16);
    expect(hit({ amount: 4, damageType: 'magic', scaling: { stat: 'ap', ratio: 1 } }, (s) => (u(s, 'yasuo').stats.ap = 6))).toBe(10);
  });

  it('la armadura mitiga el físico y la resistencia mágica el mágico', () => {
    expect(hit({ amount: 20, damageType: 'physical' }, (s) => (u(s, 'e1').stats.armor = 50))).toBe(13);
    expect(hit({ amount: 20, damageType: 'magic' }, (s) => (u(s, 'e1').stats.mr = 100))).toBe(10);
    expect(hit({ amount: 20, damageType: 'magic' }, (s) => (u(s, 'e1').stats.armor = 100))).toBe(20);
  });

  it('el daño verdadero ignora la defensa', () => {
    expect(hit({ amount: 20, damageType: 'true' }, (s) => Object.assign(u(s, 'e1').stats, { armor: 100, mr: 100 }))).toBe(20);
  });

  it('la penetración reduce la defensa con mínimo 0', () => {
    expect(hit({ amount: 20, damageType: 'physical' }, (s) => {
      u(s, 'e1').stats.armor = 30;
      u(s, 'yasuo').stats.penetration = 50;
    })).toBe(20);
  });

  it('el crítico multiplica por critDamage (telegrafiado o tirado con el RNG)', () => {
    expect(hit({ amount: 10, damageType: 'physical', crit: 'always' })).toBe(15);
    expect(hit({ amount: 10, damageType: 'physical', crit: 'always' }, (s) => (u(s, 'yasuo').stats.critDamage = 2))).toBe(20);
    expect(hit({ amount: 10, damageType: 'physical', crit: 'roll' }, (s) => {
      s.rng = new SeqRng([0.4]);
      u(s, 'yasuo').stats.critChance = 0.5;
    })).toBe(15);
    expect(hit({ amount: 10, damageType: 'physical', crit: 'roll' }, (s) => {
      s.rng = new SeqRng([0.6]);
      u(s, 'yasuo').stats.critChance = 0.5;
    })).toBe(10);
  });

  it('vulnerable suma +50 % tras la mitigación y se redondea hacia abajo', () => {
    expect(hit({ amount: 10, damageType: 'physical' }, (s) => (u(s, 'e1').statuses.vulnerable = 1))).toBe(15);
    expect(hit({ amount: 10, damageType: 'physical' }, (s) => {
      u(s, 'e1').statuses.vulnerable = 1;
      u(s, 'e1').stats.armor = 100;
    })).toBe(7);
  });

  it('nunca devuelve daño negativo', () => {
    expect(hit({ amount: 2, damageType: 'physical', additive: -5 })).toBe(0);
  });
});
```

Sustituye `tests/engine/cards.test.ts` entero por (añade el import de `cardOf`/`isApCard`, `stats.critChance` en vez de `critChance` y el bloque «modelo de cartas (§9)» al final):

```ts
import { describe, expect, it } from 'vitest';
import { bonusActive, cardOf, isApCard, playCard, whyCannotPlay } from '../../src/engine/cards';
import { CARDS, SeqRng, give, makeState, u } from './fixtures';

describe('jugar cartas', () => {
  it('gasta energía, resuelve el efecto y va al descarte', () => {
    const s = makeState();
    const [id] = give(s, 'guard');
    playCard(s, id);
    expect(s.energy).toBe(2);
    expect(u(s, 'leona').block).toBe(8);
    expect(s.hand).toHaveLength(0);
    expect(s.discard.map((c) => c.defId)).toEqual(['guard']);
  });

  it('sin restricción de alcance: Golpe llega a cualquier posición', () => {
    const s = makeState();
    u(s, 'e2').pos = 4;
    const [id] = give(s, 'strike');
    expect(whyCannotPlay(s, CARDS.strike, u(s, 'e2'))).toBeNull();
    playCard(s, id, 'e2');
    expect(u(s, 'e2').hp).toBe(21);
  });

  it('el bonus de posición solo se aplica desde una posición ideal', () => {
    const s = makeState();
    expect(bonusActive(s, CARDS.strike)).toBe(true);
    const [a] = give(s, 'strike');
    playCard(s, a, 'e1');
    expect(u(s, 'e1').hp).toBe(21);
    u(s, 'leona').pos = 3;
    u(s, 'lux').pos = 1;
    expect(bonusActive(s, CARDS.strike)).toBe(false);
    const [b] = give(s, 'strike');
    playCard(s, b, 'e1');
    expect(u(s, 'e1').hp).toBe(15);
  });

  it('límite de 3 cartas por campeón y turno', () => {
    const s = makeState({ energy: 10 });
    const ids = give(s, 'guard', 'guard', 'guard', 'guard');
    ids.slice(0, 3).forEach((id) => playCard(s, id));
    expect(whyCannotPlay(s, CARDS.guard)).toBe('Límite de 3 cartas de Leona este turno');
  });

  it('valida energía y objetivos', () => {
    const s = makeState({ energy: 0 });
    expect(whyCannotPlay(s, CARDS.guard)).toBe('Energía insuficiente');
    s.energy = 3;
    expect(whyCannotPlay(s, CARDS.strike)).toBe('Elige un objetivo');
    expect(whyCannotPlay(s, CARDS.strike, u(s, 'yasuo'))).toBe('Debe ser un enemigo');
    u(s, 'yasuo').downed = true;
    expect(whyCannotPlay(s, CARDS.touch, u(s, 'yasuo'))).toBe('Derribado: no recibe efectos normales');
    expect(whyCannotPlay(s, CARDS.rebirth, u(s, 'leona'))).toBe('Solo a un aliado derribado');
  });

  it('desplazamiento: Hoja del cénit lleva a Leona a 1 intercambiando', () => {
    const s = makeState();
    u(s, 'leona').pos = 3;
    u(s, 'lux').pos = 1;
    const [id] = give(s, 'zenith');
    playCard(s, id, 'e1');
    expect(u(s, 'leona').pos).toBe(1);
    expect(u(s, 'lux').pos).toBe(3);
  });

  it('desplazamiento: Hoja cortante empuja al objetivo una posición atrás', () => {
    const s = makeState();
    const [id] = give(s, 'sweep');
    playCard(s, id, 'e1');
    expect(u(s, 'e1').pos).toBe(2);
    expect(u(s, 'e2').pos).toBe(1);
  });

  it('las cartas de área golpean a todos los enemigos vivos', () => {
    const s = makeState();
    const [id] = give(s, 'spark');
    playCard(s, id);
    expect(u(s, 'e1').hp).toBe(22);
    expect(u(s, 'e2').hp).toBe(22);
  });

  it('el crítico usa la probabilidad del lanzador y el RNG', () => {
    const s = makeState({ rng: new SeqRng([0]) });
    u(s, 'yasuo').stats.critChance = 0.5;
    const [id] = give(s, 'tempest');
    playCard(s, id, 'e1');
    expect(u(s, 'e1').hp).toBe(15);
  });

  it('Calma reduce el estrés del aliado objetivo', () => {
    const s = makeState();
    u(s, 'lux').stress = 30;
    const [id] = give(s, 'calm');
    playCard(s, id, 'lux');
    expect(u(s, 'lux').stress).toBe(18);
  });
});

describe('crisis al jugar cartas', () => {
  it('Ira: +3 de daño y no puede apuntar a aliados', () => {
    const s = makeState();
    Object.assign(u(s, 'lux'), { crisis: 'rage', crisisActive: true, stress: 100 });
    expect(whyCannotPlay(s, CARDS.barrier, u(s, 'leona'))).toBe('Lux en Ira: no puede apuntar a aliados');
    const [id] = give(s, 'bind');
    playCard(s, id, 'e1');
    expect(u(s, 'e1').hp).toBe(22);
  });

  it('Egoísmo: sus cartas cuestan 1 menos y solo 1 carta de otro campeón por turno', () => {
    const s = makeState();
    Object.assign(u(s, 'yasuo'), { crisisActive: true, stress: 100 });
    const [t, g1, g2] = give(s, 'tempest', 'guard', 'guard');
    playCard(s, t, 'e1');
    expect(s.energy).toBe(3);
    playCard(s, g1);
    expect(() => playCard(s, g2)).toThrow('Yasuo en Egoísmo: solo 1 carta de otro campeón por turno');
  });

  it('Pánico: no puede jugar ataques', () => {
    const s = makeState();
    Object.assign(u(s, 'leona'), { crisis: 'panic', crisisActive: true, stress: 100 });
    expect(whyCannotPlay(s, CARDS.strike, u(s, 'e1'))).toBe('Leona en Pánico: no puede atacar');
  });

  it('Desesperación: cura la mitad y suma +3 de estrés a sí misma', () => {
    const s = makeState();
    Object.assign(u(s, 'soraka'), { crisisActive: true, stress: 90 });
    u(s, 'leona').hp = 20;
    const [id] = give(s, 'touch');
    playCard(s, id, 'leona');
    expect(u(s, 'leona').hp).toBe(25);
    expect(u(s, 'soraka').stress).toBe(93);
  });

  it('Virtud: las cartas de un dueño con virtud no le generan estrés', () => {
    const s = makeState();
    Object.assign(u(s, 'soraka'), { crisisActive: true, virtueActive: true, stress: 90 });
    const [id] = give(s, 'touch');
    playCard(s, id, 'leona');
    expect(u(s, 'soraka').stress).toBe(90);
  });
});

describe('modelo de cartas (§9)', () => {
  it('consumir Carga del lanzador: +4 por acumulación y la elimina', () => {
    const s = makeState();
    s.cards = { ...CARDS, finisher: { id: 'finisher', name: 'Último aliento', owner: 'yasuo', cost: 1, type: 'attack', target: 'enemy',
      rarity: 'rare', keywords: ['charge'], text: 'Inflige 8 +4 por Carga.',
      effects: [{ type: 'damage', amount: 8, damageType: 'physical', consumeStatus: { status: 'charge', from: 'self', bonusPerStack: 4 } }] } };
    u(s, 'yasuo').statuses.charge = 3;
    const [id] = give(s, 'finisher');
    playCard(s, id, 'e1');
    expect(u(s, 'e1').hp).toBe(10);
    expect(u(s, 'yasuo').statuses.charge).toBeUndefined();
  });

  it('consumir Marca del objetivo: +4 por Marca de cada objetivo', () => {
    const s = makeState();
    s.cards = { ...CARDS, burst: { id: 'burst', name: 'Chispa final', owner: 'lux', cost: 2, type: 'skill', target: 'allEnemies',
      rarity: 'epic', keywords: ['mark'], text: 'Inflige 8 a todos. +4 por Marca consumida.',
      effects: [{ type: 'damage', amount: 8, damageType: 'magic', consumeStatus: { status: 'mark', from: 'target', bonusPerStack: 4 } }] } };
    u(s, 'e1').statuses.mark = 2;
    const [id] = give(s, 'burst');
    playCard(s, id);
    expect(u(s, 'e1').hp).toBe(14);
    expect(u(s, 'e2').hp).toBe(22);
    expect(u(s, 'e1').statuses.mark).toBeUndefined();
  });

  it('una carta mejorada usa el coste, los efectos y el texto de su mejora', () => {
    const s = makeState();
    s.cards = { ...CARDS, guard: { ...CARDS.guard, upgrade: { cost: 0, effects: [{ type: 'block', amount: 12 }], text: 'Gana 12 de bloqueo.' } } };
    s.hand.push({ uid: 'up1', defId: 'guard', upgraded: true });
    expect(cardOf(s, s.hand[0]).text).toBe('Gana 12 de bloqueo.');
    playCard(s, 'up1');
    expect(s.energy).toBe(3);
    expect(u(s, 'leona').block).toBe(12);
  });

  it('las cartas de AP se reconocen por el escalado de sus efectos', () => {
    expect(isApCard(CARDS.bind)).toBe(true);
    expect(isApCard(CARDS.strike)).toBe(false);
  });

  it('la armadura del enemigo mitiga el daño físico de las cartas', () => {
    const s = makeState();
    u(s, 'e1').stats.armor = 100;
    const [id] = give(s, 'strike');
    playCard(s, id, 'e1');
    expect(u(s, 'e1').hp).toBe(26);
  });
});
```

Sustituye `tests/engine/combat.test.ts` entero por (bloque «quemadura y vulnerable» al final):

```ts
import { describe, expect, it } from 'vitest';
import { CRISIS } from '../../src/data/champions';
import { endTeamTurn, intentValue, startCombat, type CombatSetup } from '../../src/engine/combat';
import type { ChampionId, Pos } from '../../src/engine/types';
import { CARDS, ENEMIES, u } from './fixtures';

const ORDER: ChampionId[] = ['leona', 'yasuo', 'lux', 'soraka'];

function setup(over: Partial<CombatSetup> = {}): CombatSetup {
  return {
    seed: 11,
    allies: ORDER.map((id, i) => ({ id, name: id[0].toUpperCase() + id.slice(1), pos: (i + 1) as Pos, hp: 40, maxHp: 40, stress: 0, crisis: CRISIS[id] })),
    enemies: [{ uid: 'e1', defId: 'wolf', pos: 1 }, { uid: 'e2', defId: 'gromp', pos: 2 }],
    deck: ['strike', 'guard', 'zenith', 'sweep', 'tempest', 'bind', 'barrier', 'spark', 'touch', 'calm'],
    cards: CARDS,
    enemyDefs: ENEMIES,
    omen: 'lament',
    mods: { intentStressBonus: 0, startShadowMark: false, hpMultiplier: 1, bossExtraIntent: false },
    belt: [null, null, null],
    ...over,
  };
}

describe('inicio de combate', () => {
  it('roba 5 con 3 de energía y es reproducible con la misma semilla', () => {
    const a = startCombat(setup());
    const b = startCombat(setup());
    expect(a.hand).toHaveLength(5);
    expect(a.energy).toBe(3);
    expect(a.turn).toBe(1);
    expect(a.hand).toEqual(b.hand);
  });

  it('muestra la primera intención de cada enemigo', () => {
    const s = startCombat(setup());
    expect(s.intents.e1).toEqual([ENEMIES.wolf.script[0]]);
  });

  it('aplica los modificadores de la niebla', () => {
    const s = startCombat(setup({ mods: { intentStressBonus: 3, startShadowMark: true, hpMultiplier: 1.2, bossExtraIntent: false } }));
    expect(u(s, 'e1').maxHp).toBe(36);
    expect(u(s, 'e1').statuses.shadowMark).toBe(1);
  });

  it('el jefe gana una intención extra en su primer turno', () => {
    const s = startCombat(setup({
      enemies: [{ uid: 'v', defId: 'viego', pos: 1, boss: true }],
      mods: { intentStressBonus: 0, startShadowMark: false, hpMultiplier: 1, bossExtraIntent: true },
    }));
    expect(s.intents.v).toHaveLength(2);
  });

  it('un campeón que llega con 100 de estrés empieza en crisis', () => {
    const cfg = setup();
    cfg.allies[0].stress = 100;
    expect(u(startCombat(cfg), 'leona').crisisActive).toBe(true);
  });
});

describe('fin de turno: intenciones enemigas', () => {
  it('ataque con bonus de posición, crítico telegrafiado y nueva intención', () => {
    const s = startCombat(setup());
    endTeamTurn(s);
    expect(u(s, 'leona').hp).toBe(30);
    expect(u(s, 'lux').hp).toBe(33);
    expect(u(s, 'lux').stress).toBe(5);
    expect(s.intents.e1).toEqual([ENEMIES.wolf.script[1]]);
    expect(s.turn).toBe(2);
  });

  it('la intención de estrés suma el bonus de niebla y la Marca de Sombra +2 al golpear', () => {
    const s = startCombat(setup({ mods: { intentStressBonus: 3, startShadowMark: true, hpMultiplier: 1, bossExtraIntent: false } }));
    endTeamTurn(s);
    expect(u(s, 'leona').stress).toBe(2);
    endTeamTurn(s);
    expect(u(s, 'yasuo').stress).toBe(13);
  });

  it('reposición: el enemigo cambia de posición intercambiando', () => {
    const s = startCombat(setup());
    endTeamTurn(s);
    endTeamTurn(s);
    expect(u(s, 'e2').pos).toBe(1);
    expect(u(s, 'e1').pos).toBe(2);
  });

  it('un enemigo aturdido pierde su turno', () => {
    const s = startCombat(setup());
    u(s, 'e1').statuses.stun = 1;
    endTeamTurn(s);
    expect(u(s, 'leona').hp).toBe(40);
    expect(u(s, 'e1').statuses.stun).toBe(0);
  });

  it('el bloqueo aliado se reinicia y la mano se renueva al empezar el turno', () => {
    const s = startCombat(setup());
    u(s, 'soraka').block = 9;
    const first = s.hand.map((c) => c.uid);
    endTeamTurn(s);
    expect(u(s, 'soraka').block).toBe(0);
    expect(s.hand).toHaveLength(5);
    expect(s.hand.map((c) => c.uid)).not.toEqual(first);
  });
});

describe('crisis y virtud al empezar el turno', () => {
  it('Ira: +5 de estrés a los demás aliados', () => {
    const cfg = setup();
    cfg.allies[0].stress = 100;
    const s = startCombat(cfg);
    expect(u(s, 'yasuo').stress).toBe(5);
  });

  it('Pánico: se desplaza una posición hacia atrás', () => {
    const cfg = setup();
    cfg.allies[2].stress = 100;
    const s = startCombat(cfg);
    expect(u(s, 'lux').pos).toBe(4);
    expect(u(s, 'soraka').pos).toBe(3);
  });

  it('Virtud (Firmeza): +4 de bloqueo cada turno', () => {
    const s = startCombat(setup());
    u(s, 'soraka').virtueActive = true;
    endTeamTurn(s);
    expect(u(s, 'soraka').block).toBe(4);
  });
});

describe('valor de intención para la UI', () => {
  it('suma la bonificación de posición ideal al ataque', () => {
    const s = startCombat(setup());
    expect(intentValue(s, u(s, 'e1'), ENEMIES.wolf.script[0])).toBe(10);
    u(s, 'e1').pos = 2;
    u(s, 'e2').pos = 1;
    expect(intentValue(s, u(s, 'e1'), ENEMIES.wolf.script[0])).toBe(8);
  });

  it('aplica el multiplicador de crítico', () => {
    const s = startCombat(setup());
    expect(intentValue(s, u(s, 'e2'), ENEMIES.gromp.script[0])).toBe(7);
  });

  it('suma el extra de estrés de la niebla', () => {
    const s = startCombat(setup({ mods: { intentStressBonus: 3, startShadowMark: false, hpMultiplier: 1, bossExtraIntent: false } }));
    expect(intentValue(s, u(s, 'e1'), ENEMIES.wolf.script[1])).toBe(13);
  });
});

describe('quemadura y vulnerable', () => {
  it('quemadura en un enemigo: daño verdadero antes de actuar y −1 acumulación', () => {
    const s = startCombat(setup());
    Object.assign(u(s, 'e1').stats, { armor: 100 });
    u(s, 'e1').statuses.burn = 3;
    endTeamTurn(s);
    expect(u(s, 'e1').hp).toBe(27);
    expect(u(s, 'e1').statuses.burn).toBe(2);
  });

  it('la quemadura puede derrotar a un enemigo antes de que actúe', () => {
    const s = startCombat(setup());
    u(s, 'e1').hp = 2;
    u(s, 'e1').statuses.burn = 3;
    endTeamTurn(s);
    expect(u(s, 'e1').downed).toBe(true);
    expect(u(s, 'leona').hp).toBe(40);
  });

  it('quemadura en un aliado: al empezar el turno del equipo', () => {
    const s = startCombat(setup());
    u(s, 'leona').statuses.burn = 2;
    endTeamTurn(s);
    expect(u(s, 'leona').hp).toBe(28);
    expect(u(s, 'leona').statuses.burn).toBe(1);
  });

  it('vulnerable en un aliado dura la ronda: sufre +50 % del ataque y luego caduca', () => {
    const s = startCombat(setup());
    u(s, 'leona').statuses.vulnerable = 1;
    endTeamTurn(s);
    expect(u(s, 'leona').hp).toBe(25);
    expect(u(s, 'leona').statuses.vulnerable).toBe(0);
  });

  it('vulnerable en un enemigo caduca después de que actúe', () => {
    const s = startCombat(setup());
    u(s, 'e1').statuses.vulnerable = 1;
    endTeamTurn(s);
    expect(u(s, 'e1').statuses.vulnerable).toBe(0);
  });

  it('intentValue ya descuenta la armadura del objetivo', () => {
    const s = startCombat(setup());
    u(s, 'leona').stats.armor = 100;
    expect(intentValue(s, u(s, 'e1'), s.intents.e1[0])).toBe(5);
    endTeamTurn(s);
    expect(u(s, 'leona').hp).toBe(35);
  });
});
```

- [ ] **Step 2: Comprobar que fallan**

Run: `npx vitest run`
Expected: FAIL — `damage.test.ts` no encuentra `../../src/engine/damage`; los bloques nuevos fallan.

- [ ] **Step 3: Tipos, configuración y módulos nuevos**

Sustituye `src/engine/types.ts` entero:

```ts
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
  | { type: 'revive'; hp: number; on?: EffectOn };

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
  /** Marcas que aplicará la siguiente carta de AP de este turno (Elixir de brujería). */
  pendingApMark: number;
  rng: Rng;
  outcome: 'ongoing' | 'won' | 'lost';
}
```

Sustituye `src/engine/config.ts` entero:

```ts
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
  potions: { beltSize: 3, health: 20, refillable: 8, iron: 15, sorceryMarks: 2 },
} as const;
```

Crea `src/engine/stats.ts`:

```ts
import { CONFIG } from './config';
import type { StatBlock } from './types';

/** Estadísticas de partida: todo 0 salvo el multiplicador de crítico. */
export const DEFAULT_STATS: StatBlock = {
  ad: 0,
  ap: 0,
  critChance: 0,
  critDamage: CONFIG.critMultiplier,
  penetration: 0,
  armor: 0,
  mr: 0,
};

/**
 * Función central de §6.3: base + bonos planos. La UI debe mostrar este mismo resultado.
 * La fase 3 añadirá aquí el gear y los modificadores porcentuales.
 */
export function getFinalStats(base: Partial<StatBlock> = {}, mods: Partial<StatBlock>[] = []): StatBlock {
  const out: StatBlock = { ...DEFAULT_STATS, ...base };
  for (const m of mods) for (const k of Object.keys(m) as (keyof StatBlock)[]) out[k] += m[k] ?? 0;
  return out;
}
```

Crea `src/engine/damage.ts`:

```ts
import { CONFIG } from './config';
import type { CombatState, DamageType, Unit } from './types';

export interface DamageSpec {
  amount: number;
  damageType: DamageType;
  scaling?: { stat: 'ad' | 'ap'; ratio: number };
  /** Suma plana tras el escalado (crisis Ira, bonus de posición enemigo, consumo de estados). */
  additive?: number;
  /** `roll`: tira con critChance del lanzador; `always`: crítico telegrafiado (intenciones). */
  crit?: 'roll' | 'always';
}

/**
 * Calcula el daño de un golpe siguiendo §5.4: base + escalado → aditivos → crítico →
 * penetración → mitigación por defensa → vulnerable → redondeo hacia abajo (mínimo 0).
 * No aplica el daño: eso lo hace `applyDamage` (bloqueo y luego vida).
 */
export function computeDamage(s: CombatState, source: Unit, target: Unit, d: DamageSpec): { amount: number; crit: boolean } {
  let dmg = d.amount + (d.scaling ? source.stats[d.scaling.stat] * d.scaling.ratio : 0) + (d.additive ?? 0);
  const crit =
    d.crit === 'always' || (d.crit === 'roll' && source.stats.critChance > 0 && s.rng.next() < source.stats.critChance);
  if (crit) dmg *= source.stats.critDamage;
  if (d.damageType !== 'true') {
    const defense = d.damageType === 'physical' ? target.stats.armor : target.stats.mr;
    const effective = Math.max(0, defense - source.stats.penetration);
    dmg = (dmg * CONFIG.defenseScale) / (CONFIG.defenseScale + effective);
  }
  if (target.statuses.vulnerable) dmg *= 1 + CONFIG.status.vulnerableBonus;
  return { amount: Math.max(0, Math.floor(dmg)), crit };
}
```

- [ ] **Step 4: Adaptar cartas y combate**

Sustituye `src/engine/cards.ts` entero:

```ts
import { CONFIG } from './config';
import { computeDamage } from './damage';
import { byPos, living, moveUnit } from './formation';
import { addStress } from './stress';
import { applyDamage, gainBlock, heal, revive } from './units';
import type { CardDef, CardInstance, CombatState, Effect, Unit } from './types';

/** Definición efectiva de una carta en mano: aplica su mejora si la instancia está mejorada. */
export function cardOf(s: CombatState, inst: CardInstance): CardDef {
  const def = s.cards[inst.defId];
  if (!inst.upgraded || !def.upgrade) return def;
  const up = def.upgrade;
  return {
    ...def,
    cost: up.cost ?? def.cost,
    effects: up.effects ?? def.effects,
    positionBonus: up.positionBonus ?? def.positionBonus,
    text: up.text,
  };
}

/** Una carta es «de AP» si alguno de sus efectos de daño escala con AP. */
export const isApCard = (card: CardDef): boolean =>
  card.effects.some((e) => e.type === 'damage' && e.scaling?.stat === 'ap');

export function ownerOf(s: CombatState, card: CardDef): Unit {
  const u = s.units.find((x) => x.side === 'ally' && x.id === card.owner);
  if (!u) throw new Error(`Sin campeón para ${card.owner}`);
  return u;
}

const crisisOf = (u: Unit) => (u.crisisActive ? u.crisis : undefined);

/** Coste real: base, +1 con el Presagio «Peso» si el dueño está derribado, −1 en Egoísmo. */
export function cardCost(s: CombatState, card: CardDef): number {
  const o = ownerOf(s, card);
  let c = card.cost;
  if (o.downed && s.omen === 'weight') c += CONFIG.omen.weightCost;
  if (crisisOf(o) === 'selfish') c -= 1;
  return Math.max(0, c);
}

/** Objetivo forzado por el Presagio «Deriva» (la UI lo marca antes de confirmar). */
export function forcedTarget(s: CombatState, card: CardDef): Unit | undefined {
  if (s.omen !== 'drift' || !ownerOf(s, card).downed) return undefined;
  if (card.target === 'enemy') return byPos(living(s, 'enemy'))[0];
  if (card.target === 'ally') return [...living(s, 'ally')].sort((a, b) => a.hp - b.hp || a.pos - b.pos)[0];
  return undefined;
}

/** Motivo por el que no se puede jugar la carta (null = se puede). La UI lo muestra tal cual. */
export function whyCannotPlay(s: CombatState, card: CardDef, target?: Unit): string | null {
  if (s.outcome !== 'ongoing') return 'El combate ha terminado';
  const o = ownerOf(s, card);
  if (s.energy < cardCost(s, card)) return 'Energía insuficiente';
  if ((s.playedByOwner[card.owner] ?? 0) >= CONFIG.cardsPerChampion)
    return `Límite de ${CONFIG.cardsPerChampion} cartas de ${o.name} este turno`;
  if (crisisOf(o) === 'panic' && card.type === 'attack') return `${o.name} en Pánico: no puede atacar`;
  const selfish = living(s, 'ally').find((u) => crisisOf(u) === 'selfish');
  if (selfish && selfish.id !== card.owner && s.otherCardsWhileSelfish >= 1)
    return `${selfish.name} en Egoísmo: solo 1 carta de otro campeón por turno`;
  const t = forcedTarget(s, card) ?? target;
  if (card.target === 'enemy') {
    if (!t) return 'Elige un objetivo';
    if (t.side !== 'enemy') return 'Debe ser un enemigo';
    if (t.downed) return 'Ya derrotado';
  }
  if (card.target === 'ally') {
    if (!t) return 'Elige un objetivo';
    if (t.side !== 'ally') return 'Debe ser un aliado';
    if (crisisOf(o) === 'rage') return `${o.name} en Ira: no puede apuntar a aliados`;
    const revives = card.effects.some((e) => e.type === 'revive');
    if (revives && !t.downed) return 'Solo a un aliado derribado';
    if (!revives && t.downed) return 'Derribado: no recibe efectos normales';
  }
  return null;
}

/** Efectos que se resolverán: los de la carta + el bonus si el dueño (no derribado) está en una posición ideal. */
export function effectsFor(s: CombatState, card: CardDef): Effect[] {
  const o = ownerOf(s, card);
  const bonus = !o.downed && card.idealPositions?.includes(o.pos) ? (card.positionBonus ?? []) : [];
  return [...card.effects, ...bonus];
}

export const bonusActive = (s: CombatState, card: CardDef): boolean => effectsFor(s, card).length > card.effects.length;

function targetsOf(s: CombatState, card: CardDef, owner: Unit, t?: Unit): Unit[] {
  switch (card.target) {
    case 'enemy':
    case 'ally':
      return t ? [t] : [];
    case 'self':
      return [owner];
    case 'allEnemies':
      return living(s, 'enemy');
    case 'allAllies':
      return living(s, 'ally');
  }
}

function resolve(s: CombatState, e: Effect, owner: Unit, targets: Unit[]): void {
  for (const u of e.on === 'self' ? [owner] : targets) {
    switch (e.type) {
      case 'damage': {
        let additive = crisisOf(owner) === 'rage' ? CONFIG.crisis.rageDamage : 0;
        if (e.consumeStatus) {
          const holder = e.consumeStatus.from === 'self' ? owner : u;
          additive += (holder.statuses[e.consumeStatus.status] ?? 0) * e.consumeStatus.bonusPerStack;
          delete holder.statuses[e.consumeStatus.status];
        }
        const hit = computeDamage(s, owner, u, {
          amount: e.amount, damageType: e.damageType, scaling: e.scaling, additive, crit: e.canCrit ? 'roll' : undefined,
        });
        applyDamage(s, u, hit.amount, { crit: hit.crit });
        break;
      }
      case 'block':
        gainBlock(u, e.amount);
        break;
      case 'heal':
        heal(u, crisisOf(owner) === 'despair' ? Math.floor(e.amount * CONFIG.crisis.despairHealFactor) : e.amount);
        break;
      case 'applyStatus':
        if (!u.downed) u.statuses[e.status] = (u.statuses[e.status] ?? 0) + e.stacks;
        break;
      case 'move':
        moveUnit(s, u, e.to ?? u.pos + (e.by ?? 0));
        break;
      case 'reduceStress':
        addStress(s, u, -e.amount);
        break;
      case 'revive':
        revive(u, e.hp);
        break;
    }
  }
}

/** Juega la carta `uid` de la mano. Lanza un error con el motivo si no es legal. */
export function playCard(s: CombatState, uid: string, targetId?: string): void {
  const idx = s.hand.findIndex((c) => c.uid === uid);
  if (idx < 0) throw new Error('La carta no está en la mano');
  const card = cardOf(s, s.hand[idx]);
  const owner = ownerOf(s, card);
  const t = forcedTarget(s, card) ?? s.units.find((u) => u.id === targetId);
  const why = whyCannotPlay(s, card, t);
  if (why) throw new Error(why);

  const ownerWasDowned = owner.downed;
  const selfish = living(s, 'ally').find((u) => crisisOf(u) === 'selfish');
  s.energy -= cardCost(s, card);
  s.playedByOwner[card.owner] = (s.playedByOwner[card.owner] ?? 0) + 1;
  if (selfish && selfish.id !== card.owner) s.otherCardsWhileSelfish++;
  const [inst] = s.hand.splice(idx, 1);

  const targets = targetsOf(s, card, owner, t);
  for (const e of effectsFor(s, card)) resolve(s, e, owner, targets);
  if (s.pendingApMark && isApCard(card)) {
    for (const u of targets) if (u.side === 'enemy' && !u.downed) u.statuses.mark = (u.statuses.mark ?? 0) + s.pendingApMark;
    s.pendingApMark = 0;
  }

  // Estrés que genera la propia carta; la virtud del dueño lo anula.
  if (!owner.virtueActive) {
    if (crisisOf(owner) === 'despair') addStress(s, owner, CONFIG.crisis.despairSelfStress);
    if (ownerWasDowned && s.omen === 'lament') for (const a of living(s, 'ally')) addStress(s, a, CONFIG.omen.lamentStress);
  }
  if (ownerWasDowned && s.omen === 'bleed') {
    const front = byPos(living(s, 'ally'))[0];
    if (front) applyDamage(s, front, CONFIG.omen.bleedDamage);
  }
  s.discard.push(inst);
}
```

Sustituye `src/engine/combat.ts` entero:

```ts
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
```

- [ ] **Step 5: Adaptar los fixtures**

Sustituye `tests/engine/fixtures.ts` entero (cada carta gana `rarity`/`keywords`/`text`, cada daño su `damageType`, las unidades `stats: getFinalStats()`):

```ts
import { CRISIS } from '../../src/data/champions';
import { Rng } from '../../src/engine/rng';
import { getFinalStats } from '../../src/engine/stats';
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
  stats: getFinalStats(), crisis: CRISIS[id], crisisActive: false, virtueActive: false, ...over,
});

export const enemy = (id: string, pos: Pos, over: Partial<Unit> = {}): Unit => ({
  id, side: 'enemy', name: id, pos, hp: 30, maxHp: 30, block: 0, stress: 0, downed: false, statuses: {},
  stats: getFinalStats(), crisisActive: false, virtueActive: false, ...over,
});

export const CARDS: Record<string, CardDef> = {
  strike: { id: 'strike', name: 'Golpe', owner: 'leona', cost: 1, type: 'attack', target: 'enemy',
    rarity: 'common', keywords: [], text: 'Inflige 6. Desde 1–2: +3.',
    effects: [{ type: 'damage', amount: 6, damageType: 'physical' }], idealPositions: [1, 2], positionBonus: [{ type: 'damage', amount: 3, damageType: 'physical' }] },
  guard: { id: 'guard', name: 'Guardia', owner: 'leona', cost: 1, type: 'defense', target: 'self', rarity: 'common', keywords: ['block'], text: 'Gana 8 de bloqueo.',
    effects: [{ type: 'block', amount: 8 }] },
  zenith: { id: 'zenith', name: 'Hoja del cénit', owner: 'leona', cost: 2, type: 'attack', target: 'enemy',
    rarity: 'rare', keywords: ['displacement'], text: 'Inflige 9 y avanza a la posición 1.',
    effects: [{ type: 'damage', amount: 9, damageType: 'physical' }, { type: 'move', to: 1, on: 'self' }] },
  sweep: { id: 'sweep', name: 'Hoja cortante', owner: 'yasuo', cost: 0, type: 'attack', target: 'enemy',
    rarity: 'common', keywords: ['displacement'], text: 'Inflige 4 y empuja al objetivo.',
    effects: [{ type: 'damage', amount: 4, damageType: 'physical' }, { type: 'move', by: 1 }] },
  tempest: { id: 'tempest', name: 'Tempestad', owner: 'yasuo', cost: 1, type: 'attack', target: 'enemy',
    rarity: 'rare', keywords: [], text: 'Inflige 10. Puede ser crítico.',
    effects: [{ type: 'damage', amount: 10, damageType: 'physical', canCrit: true }] },
  bind: { id: 'bind', name: 'Enlace de luz', owner: 'lux', cost: 1, type: 'skill', target: 'enemy',
    rarity: 'common', keywords: ['mark'], text: 'Inflige 5 y aplica 1 Marca. Desde 3–4: +1 Marca.',
    effects: [{ type: 'damage', amount: 5, damageType: 'magic', scaling: { stat: 'ap', ratio: 0.5 } }, { type: 'applyStatus', status: 'mark', stacks: 1 }],
    idealPositions: [3, 4], positionBonus: [{ type: 'applyStatus', status: 'mark', stacks: 1 }] },
  barrier: { id: 'barrier', name: 'Barrera', owner: 'lux', cost: 1, type: 'defense', target: 'ally', rarity: 'common', keywords: ['block'], text: 'Otorga 6 de bloqueo.',
    effects: [{ type: 'block', amount: 6 }] },
  spark: { id: 'spark', name: 'Chispa final', owner: 'lux', cost: 2, type: 'skill', target: 'allEnemies',
    rarity: 'epic', keywords: [], text: 'Inflige 8 a todos.',
    effects: [{ type: 'damage', amount: 8, damageType: 'magic', scaling: { stat: 'ap', ratio: 0.5 } }] },
  touch: { id: 'touch', name: 'Toque celestial', owner: 'soraka', cost: 1, type: 'support', target: 'ally', rarity: 'rare', keywords: [], text: 'Cura 10.',
    effects: [{ type: 'heal', amount: 10 }] },
  calm: { id: 'calm', name: 'Calma', owner: 'soraka', cost: 1, type: 'support', target: 'ally', rarity: 'common', keywords: [], text: 'Reduce 12 de estrés.',
    effects: [{ type: 'reduceStress', amount: 12 }] },
  rebirth: { id: 'rebirth', name: 'Renacer', owner: 'soraka', cost: 3, type: 'support', target: 'ally', rarity: 'epic', keywords: [], text: 'Reanima con 20 de vida.',
    effects: [{ type: 'revive', hp: 20 }] },
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
```

- [ ] **Step 6: Verificar**

Run: `npx tsc --noEmit; npx vitest run`
Expected: `tsc` sin salida (exit 0); `Test Files 10 passed (10)`, `Tests 101 passed (101)`.

- [ ] **Step 7: Commit**

```bash
git add src/engine tests/engine
git commit -m "feat(engine): modelo de cartas §9 y ruta de daño §5.4 (stats, crítico, defensa, quemadura, carga, vulnerable)"
```
