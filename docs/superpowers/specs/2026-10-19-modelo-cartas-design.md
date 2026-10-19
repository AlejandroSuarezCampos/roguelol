# Modelo de cartas, estadísticas y daño (§9 y §5.4) + arte enlazado (§19)

**Fecha:** 2026-10-19 · **Estado:** aprobado por el usuario en chat · **Enmienda** a [`docs/handoff/CLAUDE_CODE_SPEC.md`](../../handoff/CLAUDE_CODE_SPEC.md) y complemento de [`2026-10-19-reglas-nucleo-design.md`](2026-10-19-reglas-nucleo-design.md). Donde difieran, manda este documento. Todo número marcado **(ajustable)** vive solo en `src/engine/config.ts`.

Motivo: el motor implementado (rama ya fusionada en `main`) usa un modelo de cartas simplificado. Antes de cargar las 32 cartas y construir la UI React se adopta el modelo de §9 y la ruta de daño de §5.4.

---

## 1. Cartas (`CardDef`)

Campos nuevos, obligatorios salvo indicación:

| Campo | Tipo | Notas |
|---|---|---|
| `rarity` | `'common' \| 'rare' \| 'epic'` | Las mismas tres rarezas que el prototipo |
| `keywords` | `Keyword[]` | `'block' \| 'mark' \| 'burn' \| 'charge' \| 'displacement'` (§9: «añade solo las necesarias») |
| `text` | `string` | Texto de la carta; la UI lo muestra tal cual |
| `upgrade?` | `{ cost?: number; effects?: Effect[]; positionBonus?: Effect[]; text: string }` | Lo que cambia al mejorarla. Los campos ausentes se heredan |

- **Se elimina** `CardDef.scaling`: el escalado pasa a cada efecto de daño.
- Una carta es **«de AP»** (para el Elixir de brujería) si alguno de sus efectos de daño escala con `ap`.
- **Mejoras:** `CardInstance` gana `upgraded?: boolean`. La función `cardOf(s, inst)` devuelve la definición efectiva (con la mejora aplicada) y es la única que usan coste, legalidad y resolución.

Equivalencias con los nombres de §9 (se mantienen los actuales, más expresivos):
- `targeting` de §9 → `target` (`enemy`, `ally`, `self`, `allEnemies`, `allAllies`). Las cartas sin elección de objetivo de §9 (`"none"`) son `self`, `allEnemies` o `allAllies`.
- `move { direction }` de §9 → `move { to }` (posición absoluta) o `move { by }` (relativa, +1 = hacia atrás).

## 2. Efectos de daño

```ts
{ type: 'damage'; amount: number; damageType: 'physical' | 'magic' | 'true';
  scaling?: { stat: 'ad' | 'ap'; ratio: number };
  canCrit?: boolean;
  consumeStatus?: { status: 'charge' | 'mark'; from: 'self' | 'target'; bonusPerStack: number };
  on?: 'target' | 'self' }
```

- `consumeStatus` (el «efecto consumir» aprobado): suma `bonusPerStack` de daño por cada acumulación del estado indicado en el lanzador (`self`, p. ej. Carga de Yasuo) o en el objetivo (`target`, p. ej. Marca para Chispa final) y **elimina** esas acumulaciones.
- Las intenciones de ataque enemigas ganan `damageType?` (por defecto `physical`).

## 3. Estadísticas mínimas

`StatBlock = { ad, ap, critChance, critDamage, penetration, armor, mr }` en cada `Unit` (`Unit.stats`; sustituye a `Unit.critChance`).

- Valores por defecto: todo 0 salvo `critDamage` = **1,5 (ajustable)**.
- `getFinalStats(base, mods[])` suma los bonos planos (§6.3). El gear y los modificadores porcentuales se añaden en la fase 3 sobre esta misma función, que también usará la UI.

## 4. Ruta de daño (§5.4)

Una única función `computeDamage` calcula el número; `applyDamage` sigue siendo la única que lo aplica (bloqueo y luego vida). Orden:

1. **Base y escalado:** `amount + stats[scaling.stat] × ratio` + bonus de `consumeStatus`.
2. **Modificadores aditivos:** crisis Ira (+3) y bonus de posición de enemigos.
3. **Crítico** si el efecto puede criticar: tirada con el RNG si `critChance > 0`, multiplica por `critDamage`.
4. **Penetración:** defensa efectiva = `max(0, defensa − penetración)`; armadura para `physical`, resistencia mágica para `magic`, ninguna para `true`.
5. **Mitigación:** `daño × 100 / (100 + defensa efectiva)` (el 100 es **ajustable**).
6. **Vulnerable** (§5): `× (1 + 0,5)` (**ajustable**).
7. **Redondeo:** hacia abajo, mínimo 0, enteros.
8. Bloqueo y después vida (`applyDamage`).

## 5. Estados nuevos

| Estado | Regla (ajustable) |
|---|---|
| **Quemadura** | Al empezar el turno del afectado (aliados: inicio del turno del equipo; enemigos: antes de resolver su intención) recibe tanto daño **verdadero** como acumulaciones tenga, y luego pierde 1 acumulación |
| **Carga** | Recurso acumulable (Yasuo). No hace nada por sí sola; la consumen efectos con `consumeStatus` |
| **Vulnerable** | Recibe +50 % de daño (paso 6). Pierde 1 acumulación por **ronda**: los aliados al empezar su siguiente turno (así dura mientras atacan los enemigos), los enemigos justo después de actuar. Cada acumulación = una ronda. *Confirmado por el usuario el 2026-10-19* (la redacción original, «al final del turno del afectado», hacía que el vulnerable de un aliado caducase antes de que los enemigos atacasen) |

El daño de quemadura pasa por `applyDamage`, así que respeta el bloqueo y puede derribar. La quemadura no es un golpe de un enemigo, así que no activa la Marca de Sombra.

## 6. Arte de Riot (enmienda a §19)

§19 del original queda **enmendado** para este prototipo de **uso personal no comercial**:
- Se permite **enlazar** (hotlink) arte oficial: splashes, iconos de objetos y habilidades de Data Dragon, e iconos de monstruos de CommunityDragon. Siempre con crédito visible a Riot Games.
- **Nunca** se descarga ni se incluye en el repositorio. El «assets locales» del subproyecto 3 queda limitado a arte propio.
- Si el proyecto se publica o monetiza, se sustituye todo el arte de Riot.

## 7. Criterios de aceptación

- Los 81 tests existentes siguen pasando con los mismos números tras adaptar los fixtures (estadísticas a 0 por defecto, daño `physical`).
- Tests de `computeDamage`: escalado AD/AP, armadura contra físico, resistencia mágica contra mágico, verdadero sin defensa, penetración con mínimo 0, crítico con `critDamage`, vulnerable y redondeo.
- `consumeStatus` desde el lanzador y desde el objetivo: suma el bonus y elimina las acumulaciones.
- Quemadura en aliados y enemigos (daño verdadero, −1 por turno, puede derribar). Vulnerable dura N turnos.
- Una carta mejorada usa su coste, efectos y texto de `upgrade`. El Elixir de brujería detecta las cartas de AP por sus efectos.
