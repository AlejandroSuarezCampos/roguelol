# Motor de reglas núcleo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el motor de combate y de expedición en TypeScript, sin interfaz, con las reglas núcleo de la spec (posiciones como bonus, movimiento, estrés con crisis/virtud, Presagio de los caídos, Niebla Negra, reliquias de élite sin límite y cinturón de pociones), totalmente cubierto por tests.

**Architecture:** Motor puro en `src/engine/` (funciones que mutan un `CombatState`/`RunState` serializable, sin React ni DOM), datos en `src/data/`, valores de balance en un único `src/engine/config.ts`, y tests con Vitest en `tests/engine/`. Todo el azar pasa por un RNG con semilla (`Rng`) guardado en el estado, así que cualquier combate o run se reproduce en tests. El prototipo visual (`design/`) no se toca: la integración con React es una fase posterior.

**Tech Stack:** TypeScript 5.9.3 (strict) · Vitest 5.0.5 · Vite 8.3.4 (peer de Vitest; se usará para la app en la Fase 1) · Node ^22.12 o ^24 (probado con 24.19).

**Spec:** [`docs/superpowers/specs/2026-10-19-reglas-nucleo-design.md`](../specs/2026-10-19-reglas-nucleo-design.md), que enmienda [`docs/handoff/CLAUDE_CODE_SPEC.md`](../../handoff/CLAUDE_CODE_SPEC.md). Lee las dos antes de empezar.

## Global Constraints

- TypeScript en modo `strict`; sin `any`, sin `eval`, sin funciones dentro de los datos (§9 de la spec original).
- Motor separado de la UI: nada en `src/engine/` importa React, DOM ni `design/` (§0, §4.4).
- Determinismo: todo azar usa `Rng` con semilla del estado; nunca `Math.random()` (§4.1, spec núcleo §8).
- Todos los valores marcados como «ajustable» en la spec viven solo en `src/engine/config.ts`; no repitas números en otros archivos (§18).
- Dependencias permitidas: exactamente `typescript@5.9.3`, `vite@8.3.4`, `vitest@5.0.5` como devDependencies. No añadas otras.
- Mensajes de error/motivo visibles para el jugador, en español, devueltos como `string` (la UI los mostrará tal cual).
- Cada commit termina con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Ejecuta los comandos desde la raíz del repo (`C:\xampp\htdocs\roguelol`).
- Nombres frente a §9 de la spec núcleo: `blackMist` → `RunState.mist`, `potions` → `belt` (`BeltSlot[]`), `swapUsedThisTurn` → `CombatState.swapUsed`. Mismo significado.

## Fuera de alcance de este plan

Datos de las 32 cartas y los enemigos reales, estadísticas/gear y fórmula de mitigación (§5.4, §6, §7), triggers de reliquias (§8), generador de mapa, descanso/tienda/eventos completos, guardado y la interfaz React (fases 1, 3, 4, 5 y 6 de la spec original). Este plan deja listos los tipos y funciones sobre los que se apoyarán.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `package.json`, `tsconfig.json`, `.gitignore` | Proyecto TS + Vitest |
| `src/engine/rng.ts` | RNG con semilla (mulberry32) |
| `src/engine/types.ts` | Tipos de dominio compartidos |
| `src/engine/config.ts` | Todos los valores de balance |
| `src/data/champions.ts` | Crisis fija por campeón |
| `src/engine/formation.ts` | Posiciones: consultas, `moveUnit`, intercambio de aliados |
| `src/engine/stress.ts` | Estrés 0–100, tramos, tirada de crisis/virtud |
| `src/engine/units.ts` | Daño (ruta única), curación, bloqueo, reanimación, fin de combate |
| `src/engine/cards.ts` | Coste, legalidad, bonus de posición, resolución de cartas, crisis y Presagio |
| `src/engine/potions.ts` | Cinturón de pociones |
| `src/engine/combat.ts` | Inicio de combate, turnos, intenciones enemigas |
| `src/engine/mist.ts` | Niebla Negra: tramos y modificadores |
| `src/engine/rewards.ts` | Botín según la niebla, reliquias de élite y de Ruina |
| `src/engine/run.ts` | Estado de la run: Presagio, niebla, reliquias sin límite, reordenación |
| `tests/engine/fixtures.ts` | Estado de combate de prueba, cartas/enemigos de prueba, `SeqRng` |
| `tests/engine/*.test.ts` | Un archivo de tests por módulo |

---

### Task 1: Proyecto TypeScript, RNG con semilla, tipos y configuración

**Files:**
- Create: `package.json`, `tsconfig.json`
- Modify: `.gitignore`
- Create: `src/engine/rng.ts`, `src/engine/types.ts`, `src/engine/config.ts`, `src/data/champions.ts`
- Test: `tests/engine/rng.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `class Rng { state: number; next(): number; int(n): number; pick<T>(arr): T; shuffle<T>(arr): T[] }`; todos los tipos de `types.ts` (`Pos`, `Unit`, `CardDef`, `Effect`, `Intent`, `EnemyDef`, `CombatState`, `CombatMods`, `BeltSlot`, `PotionId`, `Omen`, `CrisisKind`, `ChampionId`…); `CONFIG`; `CRISIS: Record<ChampionId, CrisisKind>`.

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "shattered-runeterra",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "5.9.3",
    "vite": "8.3.4",
    "vitest": "5.0.5"
  }
}
```

- [ ] **Step 2: Crear `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Añadir `node_modules/` al `.gitignore` existente**

Añade esta línea al final de `.gitignore` (ya contiene `__pycache__/`, `*.pyc` y `.claude/settings.local.json`):

```
node_modules/
```

- [ ] **Step 4: Instalar dependencias**

Run: `npm install`
Expected: `added 36 packages` (aprox.) y se crea `package-lock.json`.

- [ ] **Step 5: Escribir el test del RNG (falla)**

Create `tests/engine/rng.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/engine/rng';

describe('Rng', () => {
  it('misma semilla, misma secuencia', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('devuelve valores en [0, 1)', () => {
    const r = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('shuffle es una permutación reproducible que no muta la entrada', () => {
    const x = [1, 2, 3, 4, 5, 6];
    const a = new Rng(3).shuffle(x);
    expect(a).toEqual(new Rng(3).shuffle(x));
    expect([...a].sort()).toEqual(x);
    expect(x).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('su estado es un número que permite continuar la secuencia', () => {
    const r = new Rng(9);
    r.next();
    const copy = new Rng(r.state);
    expect(copy.next()).toBe(r.next());
  });
});
```

- [ ] **Step 6: Ejecutarlo y ver que falla**

Run: `npx vitest run tests/engine/rng.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/engine/rng"`.

- [ ] **Step 7: Implementar `src/engine/rng.ts`**

```ts
/** RNG con semilla (mulberry32): reproducible en tests y guardable como un número (`state`). */
export class Rng {
  constructor(public state: number) {}

  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)];
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
```

- [ ] **Step 8: Crear los tipos de dominio `src/engine/types.ts`**

```ts
import type { Rng } from './rng';

export type Pos = 1 | 2 | 3 | 4;
export type Side = 'ally' | 'enemy';
export type ChampionId = 'leona' | 'yasuo' | 'lux' | 'soraka';
export type CrisisKind = 'rage' | 'selfish' | 'panic' | 'despair';
export type Omen = 'lament' | 'weight' | 'drift' | 'bleed';
export type StatusId = 'mark' | 'stun' | 'shadowMark';
export type CardType = 'attack' | 'defense' | 'skill' | 'support' | 'control';
export type TargetKind = 'enemy' | 'ally' | 'self' | 'allEnemies' | 'allAllies';
/** A quién afecta un efecto: al objetivo de la carta (por defecto) o al propio lanzador. */
export type EffectOn = 'target' | 'self';

export type Effect =
  | { type: 'damage'; amount: number; canCrit?: boolean; on?: EffectOn }
  | { type: 'block'; amount: number; on?: EffectOn }
  | { type: 'heal'; amount: number; on?: EffectOn }
  | { type: 'applyStatus'; status: StatusId; stacks: number; on?: EffectOn }
  /** `to`: posición absoluta; `by`: relativa (+1 = una hacia atrás). */
  | { type: 'move'; to?: Pos; by?: number; on?: EffectOn }
  | { type: 'reduceStress'; amount: number; on?: EffectOn }
  | { type: 'revive'; hp: number; on?: EffectOn };

export interface CardDef {
  id: string;
  name: string;
  owner: ChampionId;
  cost: number;
  type: CardType;
  target: TargetKind;
  effects: Effect[];
  scaling?: 'ad' | 'ap';
  idealPositions?: Pos[];
  positionBonus?: Effect[];
}

export interface CardInstance {
  uid: string;
  defId: string;
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
  critChance: number;
  crisis?: CrisisKind;
  crisisActive: boolean;
  virtueActive: boolean;
}

export type Intent =
  | { kind: 'attack'; amount: number; target: Pos; crit?: boolean }
  | { kind: 'block'; amount: number }
  | { kind: 'stress'; amount: number; target: Pos }
  | { kind: 'reposition'; to: Pos };

export interface EnemyDef {
  id: string;
  name: string;
  maxHp: number;
  script: Intent[];
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

- [ ] **Step 9: Crear `src/engine/config.ts`**

```ts
/** Valores de balance provisionales (§18 + spec de reglas núcleo). Un único sitio: no los dupliques. */
export const CONFIG = {
  energyPerTurn: 3,
  handSize: 5,
  cardsPerChampion: 3,
  swapCost: 1,
  critMultiplier: 1.5,
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

- [ ] **Step 10: Crear `src/data/champions.ts`**

```ts
import type { ChampionId, CrisisKind } from '../engine/types';

/** Crisis fija y visible de cada campeón (spec de reglas núcleo §3). */
export const CRISIS: Record<ChampionId, CrisisKind> = {
  leona: 'rage',
  yasuo: 'selfish',
  lux: 'panic',
  soraka: 'despair',
};
```

- [ ] **Step 11: Ejecutar tests y typecheck**

Run: `npx vitest run tests/engine/rng.test.ts` → Expected: 4 passed.
Run: `npm run typecheck` → Expected: sin salida (0 errores).

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json tsconfig.json .gitignore src tests
git commit -m "feat(engine): proyecto TS con Vitest, RNG con semilla, tipos y configuración" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Formación — mover e intercambiar

**Files:**
- Create: `tests/engine/fixtures.ts`, `src/engine/formation.ts`
- Test: `tests/engine/formation.test.ts`

**Interfaces:**
- Consumes: `Rng`, tipos, `CONFIG.swapCost`, `CRISIS` (Task 1).
- Produces:
  - `living(s, side): Unit[]`, `unitAt(s, side, pos): Unit | undefined`, `byPos(units): Unit[]`
  - `moveUnit(s, unit, to: number): boolean` — intercambia si está ocupada; fuera de 1–4 no hace nada.
  - `canSwap(s, a: Pos, b: Pos): string | null` y `swapAllies(s, a, b): void` (lanza `Error(motivo)`).
  - Fixtures: `SeqRng`, `ally()`, `enemy()`, `CARDS`, `ENEMIES`, `makeState(over?)`, `u(s, id)`, `give(s, ...defIds): string[]`.

- [ ] **Step 1: Crear los fixtures de test `tests/engine/fixtures.ts`**

`makeState()` monta Leona 1, Yasuo 2, Lux 3, Soraka 4 (40/40 de vida) contra `e1` (lobo, pos 1) y `e2` (gromp, pos 2), 3 de energía y Presagio «Lamento». `SeqRng` devuelve los valores dados y luego `0.99` (crisis, sin crítico, sin reliquia).

```ts
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
```

- [ ] **Step 2: Escribir el test (falla)**

Create `tests/engine/formation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { canSwap, moveUnit, swapAllies, unitAt } from '../../src/engine/formation';
import { makeState, u } from './fixtures';

describe('moveUnit', () => {
  it('a una posición ocupada intercambia', () => {
    const s = makeState();
    expect(moveUnit(s, u(s, 'lux'), 1)).toBe(true);
    expect(u(s, 'lux').pos).toBe(1);
    expect(u(s, 'leona').pos).toBe(3);
  });

  it('fuera de 1–4 no hace nada', () => {
    const s = makeState();
    expect(moveUnit(s, u(s, 'soraka'), 5)).toBe(false);
    expect(moveUnit(s, u(s, 'leona'), 0)).toBe(false);
    expect(u(s, 'soraka').pos).toBe(4);
    expect(u(s, 'leona').pos).toBe(1);
  });

  it('a una posición libre solo se mueve', () => {
    const s = makeState();
    expect(moveUnit(s, u(s, 'e2'), 4)).toBe(true);
    expect(u(s, 'e2').pos).toBe(4);
    expect(unitAt(s, 'enemy', 2)).toBeUndefined();
  });
});

describe('intercambio de aliados', () => {
  it('cuesta 1 de energía y solo una vez por turno', () => {
    const s = makeState();
    swapAllies(s, 1, 2);
    expect(u(s, 'yasuo').pos).toBe(1);
    expect(u(s, 'leona').pos).toBe(2);
    expect(s.energy).toBe(2);
    expect(canSwap(s, 2, 3)).toBe('Ya intercambiaste este turno');
  });

  it('exige adyacencia y energía', () => {
    const s = makeState();
    expect(canSwap(s, 1, 3)).toBe('No son adyacentes');
    s.energy = 0;
    expect(canSwap(s, 1, 2)).toBe('Energía insuficiente');
    expect(() => swapAllies(s, 1, 2)).toThrow('Energía insuficiente');
  });

  it('un derribado conserva su posición y se puede intercambiar', () => {
    const s = makeState();
    u(s, 'leona').downed = true;
    swapAllies(s, 1, 2);
    expect(u(s, 'leona').pos).toBe(2);
  });
});
```

- [ ] **Step 3: Ejecutarlo y ver que falla**

Run: `npx vitest run tests/engine/formation.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/engine/formation"`.

- [ ] **Step 4: Implementar `src/engine/formation.ts`**

```ts
import { CONFIG } from './config';
import type { CombatState, Pos, Side, Unit } from './types';

export const living = (s: CombatState, side: Side): Unit[] => s.units.filter((u) => u.side === side && !u.downed);
export const unitAt = (s: CombatState, side: Side, pos: Pos): Unit | undefined =>
  s.units.find((u) => u.side === side && u.pos === pos);
export const byPos = (units: Unit[]): Unit[] => [...units].sort((a, b) => a.pos - b.pos);

const inBounds = (p: number): p is Pos => p >= 1 && p <= 4;

/** Mueve `unit` a `to`. Si está ocupada, intercambia. Fuera de 1–4 no hace nada. Devuelve si se movió. */
export function moveUnit(s: CombatState, unit: Unit, to: number): boolean {
  if (!inBounds(to) || to === unit.pos) return false;
  const other = unitAt(s, unit.side, to);
  if (other) other.pos = unit.pos;
  unit.pos = to;
  return true;
}

/** Motivo por el que no se puede intercambiar (null = se puede). */
export function canSwap(s: CombatState, a: Pos, b: Pos): string | null {
  if (Math.abs(a - b) !== 1) return 'No son adyacentes';
  if (s.swapUsed) return 'Ya intercambiaste este turno';
  if (s.energy < CONFIG.swapCost) return 'Energía insuficiente';
  if (!unitAt(s, 'ally', a) || !unitAt(s, 'ally', b)) return 'Posición vacía';
  return null;
}

/** Intercambio de dos aliados adyacentes: una vez por turno, por energía; no cuenta como carta. */
export function swapAllies(s: CombatState, a: Pos, b: Pos): void {
  const why = canSwap(s, a, b);
  if (why) throw new Error(why);
  const ua = unitAt(s, 'ally', a)!;
  const ub = unitAt(s, 'ally', b)!;
  ua.pos = b;
  ub.pos = a;
  s.energy -= CONFIG.swapCost;
  s.swapUsed = true;
}
```

- [ ] **Step 5: Ejecutar y ver que pasa**

Run: `npx vitest run tests/engine/formation.test.ts` → Expected: 6 passed.

- [ ] **Step 6: Commit**

```bash
git add src/engine/formation.ts tests/engine/fixtures.ts tests/engine/formation.test.ts
git commit -m "feat(engine): formación con desplazamiento e intercambio de aliados" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Estrés con crisis o virtud

**Files:**
- Create: `src/engine/stress.ts`
- Test: `tests/engine/stress.test.ts`

**Interfaces:**
- Consumes: `CONFIG.stress`, fixtures (Task 2).
- Produces: `addStress(s: CombatState, u: Unit, delta: number): void` (solo aliados; al alcanzar 100 tira con `s.rng.next()`: `< 0.25` virtud → estrés 50 y `virtueActive`; si no, `crisisActive` con estrés 100; la crisis termina al bajar de 100); `stressTier(v): 'calm'|'uneasy'|'overwhelmed'|'edge'|'crisis'`.

- [ ] **Step 1: Escribir el test (falla)**

Create `tests/engine/stress.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { addStress, stressTier } from '../../src/engine/stress';
import { SeqRng, makeState, u } from './fixtures';

describe('addStress', () => {
  it('se limita a 0–100', () => {
    const s = makeState();
    const l = u(s, 'leona');
    addStress(s, l, -5);
    expect(l.stress).toBe(0);
    addStress(s, l, 50);
    expect(l.stress).toBe(50);
  });

  it('no afecta a enemigos', () => {
    const s = makeState();
    addStress(s, u(s, 'e1'), 20);
    expect(u(s, 'e1').stress).toBe(0);
  });

  it('al llegar a 100 con tirada < 0,25 da virtud y baja a 50', () => {
    const s = makeState({ rng: new SeqRng([0.1]) });
    const l = u(s, 'leona');
    l.stress = 95;
    addStress(s, l, 10);
    expect(l.stress).toBe(50);
    expect(l.virtueActive).toBe(true);
    expect(l.crisisActive).toBe(false);
  });

  it('al llegar a 100 con tirada ≥ 0,25 entra en crisis y se queda en 100', () => {
    const s = makeState({ rng: new SeqRng([0.6]) });
    const l = u(s, 'leona');
    l.stress = 95;
    addStress(s, l, 10);
    expect(l.stress).toBe(100);
    expect(l.crisisActive).toBe(true);
  });

  it('la crisis termina en cuanto baja de 100', () => {
    const s = makeState();
    const l = u(s, 'leona');
    l.stress = 100;
    l.crisisActive = true;
    addStress(s, l, -1);
    expect(l.crisisActive).toBe(false);
  });

  it('ya en crisis no vuelve a tirar', () => {
    const s = makeState({ rng: new SeqRng([0.1]) });
    const l = u(s, 'leona');
    l.stress = 100;
    l.crisisActive = true;
    addStress(s, l, 5);
    expect(l.crisisActive).toBe(true);
    expect(l.virtueActive).toBe(false);
  });
});

describe('stressTier', () => {
  it('usa los umbrales de §10.1', () => {
    expect(stressTier(24)).toBe('calm');
    expect(stressTier(25)).toBe('uneasy');
    expect(stressTier(50)).toBe('overwhelmed');
    expect(stressTier(75)).toBe('edge');
    expect(stressTier(100)).toBe('crisis');
  });
});
```

- [ ] **Step 2: Ejecutarlo y ver que falla**

Run: `npx vitest run tests/engine/stress.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/engine/stress"`.

- [ ] **Step 3: Implementar `src/engine/stress.ts`**

```ts
import { CONFIG } from './config';
import type { CombatState, Unit } from './types';

export type StressTier = 'calm' | 'uneasy' | 'overwhelmed' | 'edge' | 'crisis';

/** Umbrales de §10.1: 0–24 sereno, 25–49 inquieto, 50–74 agobiado, 75–99 al límite, 100 crisis. */
export function stressTier(v: number): StressTier {
  if (v >= 100) return 'crisis';
  if (v >= 75) return 'edge';
  if (v >= 50) return 'overwhelmed';
  if (v >= 25) return 'uneasy';
  return 'calm';
}

/**
 * Cambia el estrés de un aliado (0–100). Al alcanzar 100 tira con el RNG de la run:
 * por debajo de `virtueChance` → virtud (baja a 50); si no → crisis (queda en 100).
 * La crisis termina en cuanto el estrés baja de 100.
 */
export function addStress(s: CombatState, u: Unit, delta: number): void {
  if (u.side !== 'ally' || delta === 0) return;
  const before = u.stress;
  u.stress = Math.max(0, Math.min(CONFIG.stress.max, u.stress + delta));
  if (before < CONFIG.stress.max && u.stress === CONFIG.stress.max && !u.crisisActive) {
    if (s.rng.next() < CONFIG.stress.virtueChance) {
      u.virtueActive = true;
      u.stress = CONFIG.stress.virtueResetTo;
    } else {
      u.crisisActive = true;
    }
  }
  if (u.crisisActive && u.stress < CONFIG.stress.max) u.crisisActive = false;
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run tests/engine/stress.test.ts` → Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine/stress.ts tests/engine/stress.test.ts
git commit -m "feat(engine): estrés 0–100 con tirada visible de crisis o virtud" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Daño, curación, bloqueo, reanimación y fin de combate

**Files:**
- Create: `src/engine/units.ts`
- Test: `tests/engine/units.test.ts`

**Interfaces:**
- Consumes: `addStress` (Task 3), `living` (Task 2), `CONFIG.stress`.
- Produces:
  - `applyDamage(s, target, amount, opts?: { crit?: boolean }): number` — **única ruta de daño**: bloqueo → vida; crítico recibido +5 estrés; caída de aliado +10 a los demás vivos; enemigo derrotado −3 a los aliados vivos; llama a `checkOutcome`. Devuelve el daño que llegó a la vida.
  - `heal(target, amount): number` (nunca a derribados), `gainBlock(target, amount): void`, `revive(target, hp): boolean`, `checkOutcome(s): void`.

- [ ] **Step 1: Escribir el test (falla)**

Create `tests/engine/units.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyDamage, heal, revive } from '../../src/engine/units';
import { makeState, u } from './fixtures';

describe('applyDamage', () => {
  it('el bloqueo absorbe antes que la vida', () => {
    const s = makeState();
    const l = u(s, 'leona');
    l.block = 5;
    expect(applyDamage(s, l, 8)).toBe(3);
    expect(l.block).toBe(0);
    expect(l.hp).toBe(37);
  });

  it('un crítico recibido suma +5 de estrés', () => {
    const s = makeState();
    applyDamage(s, u(s, 'lux'), 4, { crit: true });
    expect(u(s, 'lux').stress).toBe(5);
  });

  it('la caída de un aliado suma +10 a los demás vivos', () => {
    const s = makeState();
    applyDamage(s, u(s, 'leona'), 40);
    expect(u(s, 'leona').downed).toBe(true);
    expect(u(s, 'leona').stress).toBe(0);
    expect(u(s, 'yasuo').stress).toBe(10);
  });

  it('derrotar a un enemigo resta 3 de estrés a los aliados vivos', () => {
    const s = makeState();
    u(s, 'yasuo').stress = 20;
    applyDamage(s, u(s, 'e1'), 30);
    expect(u(s, 'e1').downed).toBe(true);
    expect(u(s, 'yasuo').stress).toBe(17);
  });

  it('marca victoria al derrotar al último enemigo y derrota al caer el último aliado', () => {
    const s = makeState();
    applyDamage(s, u(s, 'e1'), 30);
    applyDamage(s, u(s, 'e2'), 30);
    expect(s.outcome).toBe('won');
    const t = makeState();
    for (const id of ['leona', 'yasuo', 'lux', 'soraka']) applyDamage(t, u(t, id), 40);
    expect(t.outcome).toBe('lost');
  });
});

describe('curación y reanimación', () => {
  it('curar no supera la vida máxima ni afecta a derribados', () => {
    const s = makeState();
    const l = u(s, 'leona');
    l.hp = 35;
    expect(heal(l, 10)).toBe(5);
    l.downed = true;
    expect(heal(l, 10)).toBe(0);
  });

  it('revive solo funciona sobre derribados', () => {
    const s = makeState();
    const l = u(s, 'leona');
    expect(revive(l, 20)).toBe(false);
    l.downed = true;
    l.hp = 0;
    expect(revive(l, 20)).toBe(true);
    expect(l.hp).toBe(20);
  });
});
```

- [ ] **Step 2: Ejecutarlo y ver que falla**

Run: `npx vitest run tests/engine/units.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/engine/units"`.

- [ ] **Step 3: Implementar `src/engine/units.ts`**

```ts
import { CONFIG } from './config';
import { living } from './formation';
import { addStress } from './stress';
import type { CombatState, Unit } from './types';

export function checkOutcome(s: CombatState): void {
  if (living(s, 'enemy').length === 0) s.outcome = 'won';
  else if (living(s, 'ally').length === 0) s.outcome = 'lost';
}

/**
 * Única ruta de daño: bloqueo primero, luego vida. Gestiona el derribo y el estrés que provoca
 * (crítico recibido, caída de un aliado, enemigo derrotado). Devuelve el daño que llegó a la vida.
 */
export function applyDamage(s: CombatState, target: Unit, amount: number, opts: { crit?: boolean } = {}): number {
  if (target.downed || amount <= 0) return 0;
  const absorbed = Math.min(target.block, amount);
  target.block -= absorbed;
  const toHp = amount - absorbed;
  target.hp = Math.max(0, target.hp - toHp);
  if (opts.crit) addStress(s, target, CONFIG.stress.critHit);
  if (target.hp === 0) {
    target.downed = true;
    target.block = 0;
    const delta = target.side === 'ally' ? CONFIG.stress.allyDowned : CONFIG.stress.enemyDefeated;
    for (const a of living(s, 'ally')) addStress(s, a, delta);
  }
  checkOutcome(s);
  return toHp;
}

/** Curación normal: nunca afecta a derribados (§5.5). Devuelve lo curado. */
export function heal(target: Unit, amount: number): number {
  if (target.downed) return 0;
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  return target.hp - before;
}

export function gainBlock(target: Unit, amount: number): void {
  if (!target.downed) target.block += amount;
}

/** Solo un efecto `revive` explícito levanta a un derribado. */
export function revive(target: Unit, hp: number): boolean {
  if (!target.downed) return false;
  target.downed = false;
  target.hp = Math.min(target.maxHp, hp);
  return true;
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run tests/engine/units.test.ts` → Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine/units.ts tests/engine/units.test.ts
git commit -m "feat(engine): ruta única de daño con estrés por críticos, caídas y derrotas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Jugar cartas con bonus de posición (sin restricción de alcance)

**Files:**
- Create: `src/engine/cards.ts`
- Test: `tests/engine/cards.test.ts`

**Interfaces:**
- Consumes: `living`, `moveUnit` (Task 2), `addStress` (Task 3), `applyDamage`, `gainBlock`, `heal`, `revive` (Task 4), `CONFIG.cardsPerChampion`, `CONFIG.critMultiplier`.
- Produces (firmas definitivas; las tareas 6–8 amplían su comportamiento sin cambiarlas):
  - `ownerOf(s, card): Unit`
  - `cardCost(s, card): number`
  - `whyCannotPlay(s, card, target?): string | null`
  - `effectsFor(s, card): Effect[]` y `bonusActive(s, card): boolean`
  - `playCard(s, uid: string, targetId?: string): void` (lanza `Error(motivo)` si no es legal)

En esta tarea un campeón derribado **no** puede jugar sus cartas («X está derribado»); la Tarea 7 lo sustituye por el Presagio.

Un `move` que saldría de 1–4 no tiene efecto (`moveUnit` devuelve `false`) y la carta sigue siendo legal; el aviso visual «objetivo no válido para ese movimiento» de la spec §2 lo pinta la interfaz (subproyecto 2) a partir de esa misma regla.

- [ ] **Step 1: Escribir el test (falla)**

Create `tests/engine/cards.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bonusActive, playCard, whyCannotPlay } from '../../src/engine/cards';
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
    u(s, 'yasuo').critChance = 0.5;
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
```

- [ ] **Step 2: Ejecutarlo y ver que falla**

Run: `npx vitest run tests/engine/cards.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/engine/cards"`.

- [ ] **Step 3: Implementar `src/engine/cards.ts`**

```ts
import { CONFIG } from './config';
import { living, moveUnit } from './formation';
import { addStress } from './stress';
import { applyDamage, gainBlock, heal, revive } from './units';
import type { CardDef, CombatState, Effect, Unit } from './types';

export function ownerOf(s: CombatState, card: CardDef): Unit {
  const u = s.units.find((x) => x.side === 'ally' && x.id === card.owner);
  if (!u) throw new Error(`Sin campeón para ${card.owner}`);
  return u;
}

/** Coste real de la carta (las tareas siguientes añaden modificadores). */
export function cardCost(_s: CombatState, card: CardDef): number {
  return card.cost;
}

/** Motivo por el que no se puede jugar la carta (null = se puede). La UI lo muestra tal cual. */
export function whyCannotPlay(s: CombatState, card: CardDef, target?: Unit): string | null {
  if (s.outcome !== 'ongoing') return 'El combate ha terminado';
  const o = ownerOf(s, card);
  if (o.downed) return `${o.name} está derribado`;
  if (s.energy < cardCost(s, card)) return 'Energía insuficiente';
  if ((s.playedByOwner[card.owner] ?? 0) >= CONFIG.cardsPerChampion)
    return `Límite de ${CONFIG.cardsPerChampion} cartas de ${o.name} este turno`;
  const t = target;
  if (card.target === 'enemy') {
    if (!t) return 'Elige un objetivo';
    if (t.side !== 'enemy') return 'Debe ser un enemigo';
    if (t.downed) return 'Ya derrotado';
  }
  if (card.target === 'ally') {
    if (!t) return 'Elige un objetivo';
    if (t.side !== 'ally') return 'Debe ser un aliado';
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
        let amt = e.amount;
        const crit = !!e.canCrit && owner.critChance > 0 && s.rng.next() < owner.critChance;
        if (crit) amt = Math.floor(amt * CONFIG.critMultiplier);
        applyDamage(s, u, amt, { crit });
        break;
      }
      case 'block':
        gainBlock(u, e.amount);
        break;
      case 'heal':
        heal(u, e.amount);
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
  const card = s.cards[s.hand[idx].defId];
  const owner = ownerOf(s, card);
  const t = s.units.find((u) => u.id === targetId);
  const why = whyCannotPlay(s, card, t);
  if (why) throw new Error(why);

  s.energy -= cardCost(s, card);
  s.playedByOwner[card.owner] = (s.playedByOwner[card.owner] ?? 0) + 1;
  const [inst] = s.hand.splice(idx, 1);

  const targets = targetsOf(s, card, owner, t);
  for (const e of effectsFor(s, card)) resolve(s, e, owner, targets);

  s.discard.push(inst);
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run tests/engine/cards.test.ts` → Expected: 10 passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine/cards.ts tests/engine/cards.test.ts
git commit -m "feat(engine): resolución declarativa de cartas con bonus de posición" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Crisis al jugar cartas (Ira, Egoísmo, Pánico, Desesperación)

**Files:**
- Modify: `src/engine/cards.ts` (archivo completo abajo)
- Test: `tests/engine/cards.test.ts` (añadir un bloque `describe`)

**Interfaces:**
- Consumes: lo de la Tarea 5; `CONFIG.crisis`.
- Produces: mismas firmas. Comportamiento nuevo: Ira (+3 daño, no puede apuntar a aliados), Egoísmo (sus cartas −1 de coste; solo 1 carta de otro campeón por turno vía `s.otherCardsWhileSelfish`), Pánico (no juega cartas `attack`), Desesperación (cura la mitad y +3 de estrés a sí misma por carta; la virtud anula ese estrés).

- [ ] **Step 1: Añadir los tests de crisis (fallan)**

Añade al final de `tests/engine/cards.test.ts`:

```ts
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
    Object.assign(u(s, 'soraka'), { crisisActive: true, stress: 100 });
    u(s, 'leona').hp = 20;
    const [id] = give(s, 'touch');
    playCard(s, id, 'leona');
    expect(u(s, 'leona').hp).toBe(25);
    expect(u(s, 'soraka').stress).toBe(100);
  });
});
```

- [ ] **Step 2: Ejecutarlos y ver que fallan**

Run: `npx vitest run tests/engine/cards.test.ts`
Expected: FAIL — 4 tests de «crisis al jugar cartas» fallan (p. ej. esperaba `'Lux en Ira: no puede apuntar a aliados'` y recibe `null`).

- [ ] **Step 3: Sustituir `src/engine/cards.ts` por esta versión**

```ts
import { CONFIG } from './config';
import { living, moveUnit } from './formation';
import { addStress } from './stress';
import { applyDamage, gainBlock, heal, revive } from './units';
import type { CardDef, CombatState, Effect, Unit } from './types';

export function ownerOf(s: CombatState, card: CardDef): Unit {
  const u = s.units.find((x) => x.side === 'ally' && x.id === card.owner);
  if (!u) throw new Error(`Sin campeón para ${card.owner}`);
  return u;
}

const crisisOf = (u: Unit) => (u.crisisActive ? u.crisis : undefined);

/** Coste real: base, −1 en Egoísmo. */
export function cardCost(s: CombatState, card: CardDef): number {
  const o = ownerOf(s, card);
  let c = card.cost;
  if (crisisOf(o) === 'selfish') c -= 1;
  return Math.max(0, c);
}

/** Motivo por el que no se puede jugar la carta (null = se puede). La UI lo muestra tal cual. */
export function whyCannotPlay(s: CombatState, card: CardDef, target?: Unit): string | null {
  if (s.outcome !== 'ongoing') return 'El combate ha terminado';
  const o = ownerOf(s, card);
  if (o.downed) return `${o.name} está derribado`;
  if (s.energy < cardCost(s, card)) return 'Energía insuficiente';
  if ((s.playedByOwner[card.owner] ?? 0) >= CONFIG.cardsPerChampion)
    return `Límite de ${CONFIG.cardsPerChampion} cartas de ${o.name} este turno`;
  if (crisisOf(o) === 'panic' && card.type === 'attack') return `${o.name} en Pánico: no puede atacar`;
  const selfish = living(s, 'ally').find((u) => crisisOf(u) === 'selfish');
  if (selfish && selfish.id !== card.owner && s.otherCardsWhileSelfish >= 1)
    return `${selfish.name} en Egoísmo: solo 1 carta de otro campeón por turno`;
  const t = target;
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
        let amt = e.amount + (crisisOf(owner) === 'rage' ? CONFIG.crisis.rageDamage : 0);
        const crit = !!e.canCrit && owner.critChance > 0 && s.rng.next() < owner.critChance;
        if (crit) amt = Math.floor(amt * CONFIG.critMultiplier);
        applyDamage(s, u, amt, { crit });
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
  const card = s.cards[s.hand[idx].defId];
  const owner = ownerOf(s, card);
  const t = s.units.find((u) => u.id === targetId);
  const why = whyCannotPlay(s, card, t);
  if (why) throw new Error(why);

  const selfish = living(s, 'ally').find((u) => crisisOf(u) === 'selfish');
  s.energy -= cardCost(s, card);
  s.playedByOwner[card.owner] = (s.playedByOwner[card.owner] ?? 0) + 1;
  if (selfish && selfish.id !== card.owner) s.otherCardsWhileSelfish++;
  const [inst] = s.hand.splice(idx, 1);

  const targets = targetsOf(s, card, owner, t);
  for (const e of effectsFor(s, card)) resolve(s, e, owner, targets);

  // Estrés que genera la propia carta; la virtud del dueño lo anula.
  if (!owner.virtueActive && crisisOf(owner) === 'despair') addStress(s, owner, CONFIG.crisis.despairSelfStress);
  s.discard.push(inst);
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run tests/engine/cards.test.ts` → Expected: 14 passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine/cards.ts tests/engine/cards.test.ts
git commit -m "feat(engine): efectos de crisis al jugar cartas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Presagio de los caídos

**Files:**
- Modify: `src/engine/cards.ts` (archivo completo abajo)
- Test: `tests/engine/omen.test.ts`

**Interfaces:**
- Consumes: lo de la Tarea 6; `byPos`; `CONFIG.omen`.
- Produces: nueva función `forcedTarget(s, card): Unit | undefined` (objetivo de «Deriva», para que la UI lo marque antes de confirmar). Las cartas de un derribado ya **se pueden jugar** pagando el Presagio de la run (`s.omen`): Lamento (+6 estrés a los vivos), Peso (+1 coste), Deriva (objetivo forzado), Sangría (4 de daño bloqueable al aliado vivo más adelantado). Nunca activan su bonus de posición; reanimar elimina el castigo; la virtud del dueño anula el estrés de Lamento.

- [ ] **Step 1: Escribir el test (falla)**

Create `tests/engine/omen.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bonusActive, cardCost, forcedTarget, playCard, whyCannotPlay } from '../../src/engine/cards';
import { CARDS, give, makeState, u } from './fixtures';

const downLeona = (s: ReturnType<typeof makeState>) => Object.assign(u(s, 'leona'), { downed: true, hp: 0 });

describe('Presagio de los caídos', () => {
  it('las cartas de un derribado se pueden jugar', () => {
    const s = makeState();
    downLeona(s);
    expect(whyCannotPlay(s, CARDS.strike, u(s, 'e1'))).toBeNull();
  });

  it('Lamento: +6 de estrés a todos los aliados vivos', () => {
    const s = makeState({ omen: 'lament' });
    downLeona(s);
    const [id] = give(s, 'strike');
    playCard(s, id, 'e1');
    expect(u(s, 'yasuo').stress).toBe(6);
    expect(u(s, 'soraka').stress).toBe(6);
    expect(u(s, 'leona').stress).toBe(0);
  });

  it('Peso: la carta cuesta +1 de energía', () => {
    const s = makeState({ omen: 'weight' });
    downLeona(s);
    expect(cardCost(s, CARDS.strike)).toBe(2);
    const [id] = give(s, 'strike');
    playCard(s, id, 'e1');
    expect(s.energy).toBe(1);
  });

  it('Deriva: objetivo forzado y visible, se ignora el elegido', () => {
    const s = makeState({ omen: 'drift' });
    downLeona(s);
    expect(forcedTarget(s, CARDS.strike)?.id).toBe('e1');
    const [id] = give(s, 'strike');
    playCard(s, id, 'e2');
    expect(u(s, 'e1').hp).toBe(24);
    expect(u(s, 'e2').hp).toBe(30);
    Object.assign(u(s, 'lux'), { downed: true, hp: 0 });
    u(s, 'soraka').hp = 15;
    expect(forcedTarget(s, CARDS.barrier)?.id).toBe('soraka');
  });

  it('Sangría: el aliado vivo más adelantado recibe 4 de daño bloqueable', () => {
    const s = makeState({ omen: 'bleed' });
    downLeona(s);
    u(s, 'yasuo').block = 3;
    const [id] = give(s, 'strike');
    playCard(s, id, 'e1');
    expect(u(s, 'yasuo').block).toBe(0);
    expect(u(s, 'yasuo').hp).toBe(39);
  });

  it('un derribado nunca activa su bonus de posición', () => {
    const s = makeState();
    downLeona(s);
    expect(bonusActive(s, CARDS.strike)).toBe(false);
  });

  it('reanimar elimina el Presagio para ese campeón', () => {
    const s = makeState({ omen: 'lament', energy: 10 });
    downLeona(s);
    const [r, st] = give(s, 'rebirth', 'strike');
    playCard(s, r, 'leona');
    expect(u(s, 'leona').downed).toBe(false);
    playCard(s, st, 'e1');
    expect(u(s, 'yasuo').stress).toBe(0);
  });

  it('la virtud del dueño anula el estrés que generan sus cartas', () => {
    const s = makeState({ omen: 'lament' });
    downLeona(s);
    u(s, 'leona').virtueActive = true;
    const [id] = give(s, 'strike');
    playCard(s, id, 'e1');
    expect(u(s, 'yasuo').stress).toBe(0);
  });
});
```

- [ ] **Step 2: Ejecutarlo y ver que falla**

Run: `npx vitest run tests/engine/omen.test.ts`
Expected: FAIL — `forcedTarget` no existe y «las cartas de un derribado se pueden jugar» recibe `'Leona está derribado'`.

- [ ] **Step 3: Sustituir `src/engine/cards.ts` por esta versión**

```ts
import { CONFIG } from './config';
import { byPos, living, moveUnit } from './formation';
import { addStress } from './stress';
import { applyDamage, gainBlock, heal, revive } from './units';
import type { CardDef, CombatState, Effect, Unit } from './types';

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
        let amt = e.amount + (crisisOf(owner) === 'rage' ? CONFIG.crisis.rageDamage : 0);
        const crit = !!e.canCrit && owner.critChance > 0 && s.rng.next() < owner.critChance;
        if (crit) amt = Math.floor(amt * CONFIG.critMultiplier);
        applyDamage(s, u, amt, { crit });
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
  const card = s.cards[s.hand[idx].defId];
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

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run tests/engine/omen.test.ts tests/engine/cards.test.ts` → Expected: 22 passed (8 + 14).

- [ ] **Step 5: Commit**

```bash
git add src/engine/cards.ts tests/engine/omen.test.ts
git commit -m "feat(engine): Presagio de los caídos para cartas de derribados" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Cinturón de pociones

**Files:**
- Create: `src/engine/potions.ts`
- Modify: `src/engine/cards.ts` — `playCard`, justo después del bucle `for (const e of effectsFor(s, card)) resolve(s, e, owner, targets);`
- Test: `tests/engine/potions.test.ts`

**Interfaces:**
- Consumes: `heal`, `gainBlock` (Task 4), `playCard` (Task 7), `CONFIG.potions`.
- Produces: `POTIONS`, `emptyBelt(): BeltSlot[]`, `addPotion(belt, id): boolean`, `resolveFullBelt(belt, id, slot: number | 'new'): void`, `refreshBelt(belt): void`, `whyCannotUse(belt, slot, target?): string | null`, `usePotion(s, slot, targetId?): void`, `usePotionOnMap(belt, slot, champ): void`. `playCard` consume `s.pendingApMark` en la siguiente carta con `scaling: 'ap'`.

- [ ] **Step 1: Escribir el test (falla)**

Create `tests/engine/potions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { playCard } from '../../src/engine/cards';
import { addPotion, emptyBelt, refreshBelt, resolveFullBelt, usePotion, usePotionOnMap, whyCannotUse } from '../../src/engine/potions';
import { give, makeState, u } from './fixtures';

describe('cinturón de pociones', () => {
  it('tiene 3 huecos y avisa cuando está lleno', () => {
    const belt = emptyBelt();
    expect(belt).toHaveLength(3);
    expect(addPotion(belt, 'health')).toBe(true);
    expect(addPotion(belt, 'iron')).toBe(true);
    expect(addPotion(belt, 'sorcery')).toBe(true);
    expect(addPotion(belt, 'refillable')).toBe(false);
  });

  it('con el cinturón lleno se descarta la nueva o se sustituye un hueco', () => {
    const belt = emptyBelt();
    ['health', 'iron', 'sorcery'].forEach((p) => addPotion(belt, p as 'health'));
    resolveFullBelt(belt, 'refillable', 'new');
    expect(belt.map((p) => p?.id)).toEqual(['health', 'iron', 'sorcery']);
    resolveFullBelt(belt, 'refillable', 1);
    expect(belt[1]).toEqual({ id: 'refillable', spent: false });
  });

  it('usar una poción no gasta energía', () => {
    const s = makeState({ belt: [{ id: 'health', spent: false }, null, null] });
    u(s, 'leona').hp = 10;
    usePotion(s, 0, 'leona');
    expect(u(s, 'leona').hp).toBe(30);
    expect(s.energy).toBe(3);
    expect(s.belt[0]).toBeNull();
  });

  it('ninguna poción afecta a derribados', () => {
    const s = makeState({ belt: [{ id: 'iron', spent: false }, null, null] });
    u(s, 'leona').downed = true;
    expect(whyCannotUse(s.belt, 0, u(s, 'leona'))).toBe('Derribado: no recibe curación normal');
  });

  it('la reutilizable se gasta y se rellena al empezar el siguiente combate', () => {
    const s = makeState({ belt: [{ id: 'refillable', spent: false }, null, null] });
    u(s, 'leona').hp = 10;
    usePotion(s, 0, 'leona');
    expect(u(s, 'leona').hp).toBe(18);
    expect(whyCannotUse(s.belt, 0, u(s, 'leona'))).toBe('Hueco vacío');
    refreshBelt(s.belt);
    expect(s.belt[0]).toEqual({ id: 'refillable', spent: false });
  });

  it('Elixir de hierro: +15 de bloqueo', () => {
    const s = makeState({ belt: [{ id: 'iron', spent: false }, null, null] });
    usePotion(s, 0, 'yasuo');
    expect(u(s, 'yasuo').block).toBe(15);
  });

  it('Elixir de brujería: la siguiente carta de AP aplica +2 Marca', () => {
    const s = makeState({ belt: [{ id: 'sorcery', spent: false }, null, null] });
    usePotion(s, 0);
    u(s, 'lux').pos = 1;
    u(s, 'leona').pos = 3;
    const [id] = give(s, 'bind');
    playCard(s, id, 'e1');
    expect(u(s, 'e1').statuses.mark).toBe(3);
    expect(s.pendingApMark).toBe(0);
  });

  it('en el mapa solo se usan las curativas', () => {
    const belt = emptyBelt();
    addPotion(belt, 'iron');
    addPotion(belt, 'health');
    const champ = { hp: 10, maxHp: 40, downed: false };
    expect(() => usePotionOnMap(belt, 0, champ)).toThrow('Solo pociones curativas fuera de combate');
    usePotionOnMap(belt, 1, champ);
    expect(champ.hp).toBe(30);
  });
});
```

- [ ] **Step 2: Ejecutarlo y ver que falla**

Run: `npx vitest run tests/engine/potions.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/engine/potions"`.

- [ ] **Step 3: Implementar `src/engine/potions.ts`**

```ts
import { CONFIG } from './config';
import { gainBlock, heal } from './units';
import type { BeltSlot, CombatState, PotionId, Unit } from './types';

export const POTIONS: Record<PotionId, { name: string; healing: boolean; target: 'ally' | 'none' }> = {
  health: { name: 'Poción de vida', healing: true, target: 'ally' },
  refillable: { name: 'Poción reutilizable', healing: true, target: 'ally' },
  iron: { name: 'Elixir de hierro', healing: false, target: 'ally' },
  sorcery: { name: 'Elixir de brujería', healing: false, target: 'none' },
};

export const emptyBelt = (): BeltSlot[] => Array.from({ length: CONFIG.potions.beltSize }, () => null);

/** Añade al primer hueco libre. Devuelve false si el cinturón está lleno (la UI ofrece descartar). */
export function addPotion(belt: BeltSlot[], id: PotionId): boolean {
  const i = belt.indexOf(null);
  if (i < 0) return false;
  belt[i] = { id, spent: false };
  return true;
}

/** Cinturón lleno: `'new'` descarta la poción nueva; un índice sustituye la de ese hueco. */
export function resolveFullBelt(belt: BeltSlot[], id: PotionId, slot: number | 'new'): void {
  if (slot !== 'new') belt[slot] = { id, spent: false };
}

/** Al empezar cada combate la Poción reutilizable se rellena. */
export function refreshBelt(belt: BeltSlot[]): void {
  for (const p of belt) if (p?.id === 'refillable') p.spent = false;
}

function consume(belt: BeltSlot[], slot: number): void {
  const p = belt[slot]!;
  if (p.id === 'refillable') p.spent = true;
  else belt[slot] = null;
}

/** Motivo por el que no se puede usar (null = se puede). Ninguna poción afecta a derribados. */
export function whyCannotUse(belt: BeltSlot[], slot: number, target?: Unit): string | null {
  const p = belt[slot];
  if (!p || p.spent) return 'Hueco vacío';
  if (POTIONS[p.id].target === 'ally') {
    if (!target || target.side !== 'ally') return 'Elige un aliado';
    if (target.downed) return 'Derribado: no recibe curación normal';
  }
  return null;
}

/** Usa una poción en combate. No gasta energía ni cuenta como carta. */
export function usePotion(s: CombatState, slot: number, targetId?: string): void {
  const t = s.units.find((u) => u.id === targetId);
  const why = whyCannotUse(s.belt, slot, t);
  if (why) throw new Error(why);
  const p = s.belt[slot]!;
  switch (p.id) {
    case 'health':
      heal(t!, CONFIG.potions.health);
      break;
    case 'refillable':
      heal(t!, CONFIG.potions.refillable);
      break;
    case 'iron':
      gainBlock(t!, CONFIG.potions.iron);
      break;
    case 'sorcery':
      s.pendingApMark += CONFIG.potions.sorceryMarks;
      break;
  }
  consume(s.belt, slot);
}

/** Fuera de combate solo se pueden usar las curativas. */
export function usePotionOnMap(belt: BeltSlot[], slot: number, champ: { hp: number; maxHp: number; downed: boolean }): void {
  const p = belt[slot];
  if (!p || p.spent) throw new Error('Hueco vacío');
  if (!POTIONS[p.id].healing) throw new Error('Solo pociones curativas fuera de combate');
  if (champ.downed) throw new Error('Derribado: no recibe curación normal');
  champ.hp = Math.min(champ.maxHp, champ.hp + (p.id === 'health' ? CONFIG.potions.health : CONFIG.potions.refillable));
  consume(belt, slot);
}
```

- [ ] **Step 4: Aplicar el Elixir de brujería en `playCard`**

En `src/engine/cards.ts`, dentro de `playCard`, inserta este bloque inmediatamente después de la línea `for (const e of effectsFor(s, card)) resolve(s, e, owner, targets);`:

```ts
  if (s.pendingApMark && card.scaling === 'ap') {
    for (const u of targets) if (u.side === 'enemy' && !u.downed) u.statuses.mark = (u.statuses.mark ?? 0) + s.pendingApMark;
    s.pendingApMark = 0;
  }
```

- [ ] **Step 5: Ejecutar y ver que pasa**

Run: `npx vitest run tests/engine/potions.test.ts` → Expected: 8 passed.

- [ ] **Step 6: Commit**

```bash
git add src/engine/potions.ts src/engine/cards.ts tests/engine/potions.test.ts
git commit -m "feat(engine): cinturón de pociones de 3 huecos" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Combate — inicio, turnos e intenciones enemigas

**Files:**
- Create: `src/engine/combat.ts`
- Test: `tests/engine/combat.test.ts`

**Interfaces:**
- Consumes: `Rng` (1), `byPos`, `living`, `moveUnit`, `unitAt` (2), `addStress` (3), `applyDamage`, `checkOutcome`, `gainBlock` (4), `refreshBelt` (8), `CONFIG`.
- Produces:
  - `interface AllySetup`, `interface EnemySetup`, `interface CombatSetup` (ver código).
  - `startCombat(cfg: CombatSetup): CombatState` — crea unidades (vida de enemigos × `mods.hpMultiplier`, Marca de Sombra si `mods.startShadowMark`, crisis activa si llegan con 100 de estrés), baraja el mazo con la semilla, fija las primeras intenciones (dos para el jefe si `mods.bossExtraIntent`), rellena la poción reutilizable y empieza el turno 1.
  - `startTeamTurn(s): void` — bloqueo aliado a 0, energía 3, descarta la mano y roba 5; Virtud +4 bloqueo; Ira +5 estrés a los demás; Pánico retrocede una posición.
  - `endTeamTurn(s): void` — enemigos vivos de la 1 a la 4: su bloqueo se reinicia, el aturdido pierde el turno, resuelven sus intenciones (ataque con bonus de posición y crítico telegrafiado; Marca de Sombra +2 estrés al golpear; estrés + bonus de niebla; bloqueo; reposición) y avanzan su guion.
  - `alliesAfter(s): { id, hp, stress, downed }[]`.

- [ ] **Step 1: Escribir el test (falla)**

Create `tests/engine/combat.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CRISIS } from '../../src/data/champions';
import { endTeamTurn, startCombat, type CombatSetup } from '../../src/engine/combat';
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
```

- [ ] **Step 2: Ejecutarlo y ver que falla**

Run: `npx vitest run tests/engine/combat.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/engine/combat"`.

- [ ] **Step 3: Implementar `src/engine/combat.ts`**

```ts
import { CONFIG } from './config';
import { byPos, living, moveUnit, unitAt } from './formation';
import { refreshBelt } from './potions';
import { Rng } from './rng';
import { addStress } from './stress';
import { applyDamage, checkOutcome, gainBlock } from './units';
import type { BeltSlot, CardDef, ChampionId, CombatMods, CombatState, CrisisKind, EnemyDef, Intent, Omen, Pos, Unit } from './types';

export interface AllySetup {
  id: ChampionId;
  name: string;
  pos: Pos;
  hp: number;
  maxHp: number;
  stress: number;
  crisis: CrisisKind;
  critChance?: number;
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
    downed: a.hp <= 0, statuses: {}, critChance: a.critChance ?? 0, crisis: a.crisis,
    crisisActive: a.stress >= CONFIG.stress.max, virtueActive: false,
  }));
  const enemies: Unit[] = cfg.enemies.map((e) => {
    const d = cfg.enemyDefs[e.defId];
    const hp = Math.round(d.maxHp * cfg.mods.hpMultiplier);
    return {
      id: e.uid, side: 'enemy', name: d.name, pos: e.pos, hp, maxHp: hp, block: 0, stress: 0, downed: false,
      statuses: cfg.mods.startShadowMark ? { shadowMark: 1 } : {}, critChance: 0, crisisActive: false, virtueActive: false,
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
  for (const a of s.units) if (a.side === 'ally') a.block = 0;
  s.discard.push(...s.hand);
  s.hand = [];
  draw(s, CONFIG.handSize);
  for (const a of byPos(living(s, 'ally'))) {
    if (a.virtueActive) gainBlock(a, CONFIG.virtue.blockPerTurn);
    if (a.crisisActive && a.crisis === 'rage')
      for (const o of living(s, 'ally')) if (o !== a) addStress(s, o, CONFIG.crisis.rageStressOthers);
    if (a.crisisActive && a.crisis === 'panic') moveUnit(s, a, a.pos + 1);
  }
}

function resolveIntent(s: CombatState, enemy: Unit, i: Intent): void {
  const def = s.enemyDefs[s.enemyOf[enemy.id]];
  const allyAt = (p: Pos) => {
    const u = unitAt(s, 'ally', p);
    return u && !u.downed ? u : byPos(living(s, 'ally'))[0];
  };
  switch (i.kind) {
    case 'attack': {
      const t = allyAt(i.target);
      if (!t) return;
      let amt = i.amount + (def.idealPositions?.includes(enemy.pos) ? (def.positionBonus ?? 0) : 0);
      if (i.crit) amt = Math.floor(amt * CONFIG.critMultiplier);
      applyDamage(s, t, amt, { crit: i.crit });
      if (enemy.statuses.shadowMark) addStress(s, t, CONFIG.mist.shadowMarkStress);
      break;
    }
    case 'block':
      gainBlock(enemy, i.amount);
      break;
    case 'stress': {
      const t = allyAt(i.target);
      if (t) addStress(s, t, i.amount + s.mods.intentStressBonus);
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
    if (e.statuses.stun) {
      e.statuses.stun -= 1;
      continue;
    }
    for (const i of s.intents[e.id] ?? []) {
      if (s.outcome !== 'ongoing' || e.downed) break;
      resolveIntent(s, e, i);
    }
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

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run tests/engine/combat.test.ts` → Expected: 13 passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine/combat.ts tests/engine/combat.test.ts
git commit -m "feat(engine): bucle de turnos e intenciones enemigas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Run, Niebla Negra y botín

**Files:**
- Create: `src/engine/mist.ts`, `src/engine/rewards.ts`, `src/engine/run.ts`
- Test: `tests/engine/run.test.ts`

**Interfaces:**
- Consumes: `Rng` (1), `emptyBelt` (8), `CONFIG.mist`.
- Produces:
  - `mist.ts`: `type MistTier`, `type NodeType`, `mistTier(v): MistTier`, `tierRank`, `mistGain(type): number`, `combatMods(mist, boss?): CombatMods` (para pasar a `startCombat`).
  - `rewards.ts`: `interface Rewards { gold; cardOptions; relics }`, `relicChanceFor(type, mist): number`, `rollRewards(run, type, baseGold): Rewards`.
  - `run.ts`: `interface RunChampion`, `interface RunState`, `OMENS`, `createRun(seed, champions): RunState` (sortea el Presagio), `enterNode(run, type)`, `stokeFire(run)`, `previewNode(run, type)`, `reorder(run, id, to)`, `addRelic(run, id)` (sin límite).

`rewards.ts` y `run.ts` se importan mutuamente solo por tipos (`import type`), lo que es seguro.

- [ ] **Step 1: Escribir el test (falla)**

Create `tests/engine/run.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { combatMods, mistTier } from '../../src/engine/mist';
import { rollRewards } from '../../src/engine/rewards';
import { addRelic, createRun, enterNode, OMENS, previewNode, reorder, stokeFire, type RunChampion } from '../../src/engine/run';
import { SeqRng } from './fixtures';

const team = (): RunChampion[] => [
  { id: 'leona', name: 'Leona', pos: 1, hp: 80, maxHp: 80, stress: 0, downed: false },
  { id: 'yasuo', name: 'Yasuo', pos: 2, hp: 60, maxHp: 60, stress: 0, downed: false },
];

describe('run y Presagio', () => {
  it('sortea un Presagio reproducible con la semilla', () => {
    const a = createRun(5, team());
    expect(OMENS).toContain(a.omen);
    expect(createRun(5, team()).omen).toBe(a.omen);
  });

  it('reordenación libre fuera de combate', () => {
    const run = createRun(1, team());
    reorder(run, 'leona', 2);
    expect(run.champions.map((c) => c.pos)).toEqual([2, 1]);
  });

  it('no hay límite de reliquias', () => {
    const run = createRun(1, team());
    for (let i = 0; i < 9; i++) addRelic(run, `r${i}`);
    expect(run.relics).toHaveLength(9);
  });
});

describe('Niebla Negra', () => {
  it('+8 por nodo, +15 por élite, −15 al avivar la hoguera, limitada a 0–100', () => {
    const run = createRun(1, team());
    enterNode(run, 'combat');
    expect(run.mist).toBe(8);
    enterNode(run, 'elite');
    expect(run.mist).toBe(23);
    stokeFire(run);
    expect(run.mist).toBe(8);
    stokeFire(run);
    expect(run.mist).toBe(0);
    run.mist = 95;
    enterNode(run, 'elite');
    expect(run.mist).toBe(100);
  });

  it('tramos: Bruma, Niebla, Niebla densa, Ruina', () => {
    expect([29, 30, 59, 60, 89, 90].map(mistTier)).toEqual(['haze', 'mist', 'mist', 'dense', 'dense', 'ruin']);
  });

  it('modificadores acumulativos por tramo y jefe con ≥ 60', () => {
    expect(combatMods(10)).toEqual({ intentStressBonus: 0, startShadowMark: false, hpMultiplier: 1, bossExtraIntent: false });
    expect(combatMods(30)).toEqual({ intentStressBonus: 3, startShadowMark: false, hpMultiplier: 1, bossExtraIntent: false });
    expect(combatMods(60, true)).toEqual({ intentStressBonus: 3, startShadowMark: true, hpMultiplier: 1, bossExtraIntent: true });
    expect(combatMods(95)).toEqual({ intentStressBonus: 3, startShadowMark: true, hpMultiplier: 1.2, bossExtraIntent: false });
    expect(combatMods(59, true).bossExtraIntent).toBe(false);
  });

  it('la vista previa de un nodo muestra la niebla resultante y la probabilidad de reliquia', () => {
    const run = createRun(1, team());
    run.mist = 85;
    expect(previewNode(run, 'combat')).toEqual({ mistAfter: 93, tier: 'ruin', relicChance: 0.1 });
    expect(previewNode(run, 'elite').relicChance).toBe(1);
  });
});

describe('botín', () => {
  it('oro +15 % desde Niebla y 4 opciones de carta desde Niebla densa', () => {
    const run = createRun(1, team());
    expect(rollRewards(run, 'combat', 40)).toEqual({ gold: 40, cardOptions: 3, relics: 0 });
    run.mist = 30;
    expect(rollRewards(run, 'combat', 40).gold).toBe(46);
    run.mist = 60;
    expect(rollRewards(run, 'combat', 40).cardOptions).toBe(4);
  });

  it('toda élite da 1 reliquia, 2 en Ruina', () => {
    const run = createRun(1, team());
    expect(rollRewards(run, 'elite', 0).relics).toBe(1);
    run.mist = 90;
    expect(rollRewards(run, 'elite', 0).relics).toBe(2);
  });

  it('combates normales en Ruina: 10 % de reliquia con el RNG de la run', () => {
    const run = createRun(1, team());
    run.mist = 90;
    run.rng = new SeqRng([0.05, 0.5]);
    expect(rollRewards(run, 'combat', 0).relics).toBe(1);
    expect(rollRewards(run, 'combat', 0).relics).toBe(0);
  });
});
```

- [ ] **Step 2: Ejecutarlo y ver que falla**

Run: `npx vitest run tests/engine/run.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/engine/mist"`.

- [ ] **Step 3: Implementar `src/engine/mist.ts`**

```ts
import { CONFIG } from './config';
import type { CombatMods } from './types';

export type MistTier = 'haze' | 'mist' | 'dense' | 'ruin';
export type NodeType = 'combat' | 'elite' | 'boss' | 'rest' | 'shop' | 'event' | 'chest' | 'shrine';

/** 0–29 Bruma, 30–59 Niebla, 60–89 Niebla densa, 90–100 Ruina. */
export function mistTier(v: number): MistTier {
  const t = CONFIG.mist.tiers;
  if (v >= t.ruin) return 'ruin';
  if (v >= t.dense) return 'dense';
  if (v >= t.mist) return 'mist';
  return 'haze';
}

export const tierRank: Record<MistTier, number> = { haze: 0, mist: 1, dense: 2, ruin: 3 };

export const mistGain = (type: NodeType): number => (type === 'elite' ? CONFIG.mist.elite : CONFIG.mist.node);

/** Efectos acumulativos de los tramos sobre un combate. */
export function combatMods(mist: number, boss = false): CombatMods {
  const r = tierRank[mistTier(mist)];
  return {
    intentStressBonus: r >= 1 ? CONFIG.mist.intentStressBonus : 0,
    startShadowMark: r >= 2,
    hpMultiplier: r >= 3 ? CONFIG.mist.ruinHpMultiplier : 1,
    bossExtraIntent: boss && mist >= CONFIG.mist.bossExtraIntentAt,
  };
}
```

- [ ] **Step 4: Implementar `src/engine/rewards.ts`**

```ts
import { CONFIG } from './config';
import { mistTier, tierRank, type NodeType } from './mist';
import type { RunState } from './run';

export interface Rewards {
  gold: number;
  cardOptions: number;
  relics: number;
}

/** Probabilidad de obtener al menos una reliquia (para la vista previa del nodo y el botín). */
export function relicChanceFor(type: NodeType, mist: number): number {
  if (type === 'elite') return 1;
  if (type === 'combat' && mistTier(mist) === 'ruin') return CONFIG.mist.ruinNormalRelicChance;
  return 0;
}

/** Botín de un combate según la niebla actual. Toda élite da 1 reliquia (2 en Ruina). */
export function rollRewards(run: RunState, type: 'combat' | 'elite' | 'boss', baseGold: number): Rewards {
  const tier = mistTier(run.mist);
  const r = tierRank[tier];
  const gold = Math.round(baseGold * (r >= 1 ? 1 + CONFIG.mist.goldBonus : 1));
  const cardOptions = r >= 2 ? CONFIG.mist.denseCardOptions : CONFIG.mist.baseCardOptions;
  let relics = 0;
  if (type === 'elite') relics = tier === 'ruin' ? 2 : 1;
  else if (type === 'combat' && tier === 'ruin' && run.rng.next() < CONFIG.mist.ruinNormalRelicChance) relics = 1;
  return { gold, cardOptions, relics };
}
```

- [ ] **Step 5: Implementar `src/engine/run.ts`**

```ts
import { CONFIG } from './config';
import { mistGain, mistTier, type MistTier, type NodeType } from './mist';
import { emptyBelt } from './potions';
import { relicChanceFor } from './rewards';
import { Rng } from './rng';
import type { BeltSlot, ChampionId, Omen, Pos } from './types';

export interface RunChampion {
  id: ChampionId;
  name: string;
  pos: Pos;
  hp: number;
  maxHp: number;
  stress: number;
  downed: boolean;
}

export interface RunState {
  rng: Rng;
  omen: Omen;
  mist: number;
  gold: number;
  /** Sin límite: se conservan todas las reliquias de la run. */
  relics: string[];
  belt: BeltSlot[];
  champions: RunChampion[];
}

export const OMENS: readonly Omen[] = ['lament', 'weight', 'drift', 'bleed'];

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/** Crea la run y sortea su Presagio de los caídos con la semilla (fijo para toda la run). */
export function createRun(seed: number, champions: RunChampion[]): RunState {
  const rng = new Rng(seed);
  return { rng, omen: rng.pick(OMENS), mist: 0, gold: 0, relics: [], belt: emptyBelt(), champions };
}

export function enterNode(run: RunState, type: NodeType): void {
  run.mist = clamp(run.mist + mistGain(type));
}

/** «Avivar la hoguera»: acción adicional del campamento. Solo toca la niebla, no la elección del descanso. */
export function stokeFire(run: RunState): void {
  run.mist = clamp(run.mist + CONFIG.mist.stoke);
}

/** Vista previa de un nodo disponible: niebla resultante, tramo y probabilidad de reliquia. */
export function previewNode(run: RunState, type: NodeType): { mistAfter: number; tier: MistTier; relicChance: number } {
  const mistAfter = clamp(run.mist + mistGain(type));
  return { mistAfter, tier: mistTier(mistAfter), relicChance: relicChanceFor(type, mistAfter) };
}

/** Reordenación libre fuera de combate (intercambia con quien ocupe `to`). */
export function reorder(run: RunState, id: ChampionId, to: Pos): void {
  const c = run.champions.find((x) => x.id === id)!;
  const other = run.champions.find((x) => x.pos === to);
  if (other) other.pos = c.pos;
  c.pos = to;
}

export function addRelic(run: RunState, relicId: string): void {
  run.relics.push(relicId);
}
```

- [ ] **Step 6: Ejecutar y ver que pasa**

Run: `npx vitest run tests/engine/run.test.ts` → Expected: 10 passed.

- [ ] **Step 7: Commit**

```bash
git add src/engine/mist.ts src/engine/rewards.ts src/engine/run.ts tests/engine/run.test.ts
git commit -m "feat(engine): run con Presagio, Niebla Negra y botín sin límite de reliquias" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Verificación completa y documentación

**Files:**
- Modify: `README.md` (añadir la sección «Motor»)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: suite verde y README actualizado.

- [ ] **Step 1: Ejecutar toda la suite**

Run: `npm test`
Expected: `Test Files  9 passed (9)` y `Tests  77 passed (77)`.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: sin salida (0 errores).

- [ ] **Step 3: Documentar en `README.md`**

Añade esta sección después de «Ver el prototipo»:

```markdown
## Motor de reglas (TypeScript)

Motor de combate y expedición sin interfaz en `src/engine/` (datos en `src/data/`, balance en `src/engine/config.ts`), con tests en `tests/engine/`. Implementa la spec [`docs/superpowers/specs/2026-10-19-reglas-nucleo-design.md`](docs/superpowers/specs/2026-10-19-reglas-nucleo-design.md).

    npm install
    npm test
    npm run typecheck

Todo el azar usa un RNG con semilla guardado en el estado, así que cualquier combate se puede reproducir.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: cómo ejecutar el motor y sus tests" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Cobertura de la spec

| Spec núcleo | Tarea |
|---|---|
| §1 Posiciones como bonus, sin restricción de alcance | 5 |
| §2 Desplazamiento con intercambio, fuera de límites sin efecto | 2, 5 |
| §2 Intercambio de aliados (1 energía, adyacentes, 1/turno) | 2 |
| §2 Reordenación libre fuera de combate; derribado conserva posición | 10, 2 |
| §2 Enemigos que reordenan formación | 9 |
| §3 Fuentes de estrés (intención, crítico, caída, derrota) | 3, 4, 9 |
| §3 Crisis o virtud con RNG y efectos de cada crisis / Firmeza | 3, 6, 9 |
| §4 Presagio de los caídos (4 variantes, sin bonus, revive, límite por campeón) | 7, 5 |
| §5 Niebla Negra: ganancia por nodo, avivar hoguera, tramos, jefe | 10, 9 |
| §6 Élite siempre reliquia (2 en Ruina), 10 % en Ruina, sin límite | 10 |
| §7 Cinturón de pociones | 8, 9 |
| §8 Determinismo | 1 (todas las tiradas usan `Rng`) |
| §9 Modelo de datos | 1 |
| §10 Criterios de aceptación | 2–10 |
