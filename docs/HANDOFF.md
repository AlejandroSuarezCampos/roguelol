# Traspaso — dónde estamos y cómo seguir

**Fecha:** 2026-10-19. Léelo entero antes de tocar nada en un chat nuevo.

## Estado

| Pieza | Estado |
|---|---|
| Prototipo visual (`design/`) | HTML/CSS/JS sin build. Todas las pantallas unificadas (principal, mapa, combate, resto). Arte de Riot enlazado (hotlink). |
| Motor de reglas (`src/engine`, `tests/engine`) | Núcleo fusionado en `main`: posiciones con bonus, intercambio por 1 de energía, estrés/crisis/virtud, Presagio de los caídos, Niebla Negra, botín, cinturón de pociones, bucle de turnos e intenciones. **81 tests en verde.** |
| Modelo de cartas §9 + daño §5.4 | Spec aprobada y **plan listo, sin ejecutar**: [`plans/2026-10-19-modelo-cartas.md`](superpowers/plans/2026-10-19-modelo-cartas.md). Código ya validado aparte (101 tests). |
| React (fase 1) | Sin empezar. |
| Git | `main` va por delante de `origin` y **no se ha subido**. No hacer `push` hasta que el usuario lo diga. |

## Documentos (orden de autoridad, de más a menos)

1. [`specs/2026-10-19-modelo-cartas-design.md`](superpowers/specs/2026-10-19-modelo-cartas-design.md): cartas, estadísticas, ruta de daño, estados nuevos y enmienda del arte (§19).
2. [`specs/2026-10-19-reglas-nucleo-design.md`](superpowers/specs/2026-10-19-reglas-nucleo-design.md): reglas del núcleo.
3. [`handoff/CLAUDE_CODE_SPEC.md`](handoff/CLAUDE_CODE_SPEC.md) y [`handoff/PROMPT_CLAUDE_DESIGN.md`](handoff/PROMPT_CLAUDE_DESIGN.md): diseño preliminar original. Manda donde los dos de arriba no digan nada.

## Reglas de trabajo con el usuario

- **Consultar antes de cualquier decisión que cambie lo que ya existe** (reglas, estructura, arte, dependencias).
- Arte de Riot: solo enlazado, con crédito; **nunca** se descarga al repo. Uso personal; si se publica, se sustituye.
- Números ajustables solo en `src/engine/config.ts`.
- Flujo usado: brainstorming → spec → plan TDD → ejecución con subagentes (una tarea cada uno, revisión entre tareas).
- El usuario escribe en español; documentos y mensajes de commit también.

## Siguientes pasos

1. **Confirmar con el usuario la regla de Vulnerable** (ver «Decisiones pendientes»). Si la cambia, ajusta la spec, el plan (`vulnerableTick` en `combat.ts` y sus tests) antes de ejecutar.
2. **Ejecutar el plan del modelo §9** con `superpowers:subagent-driven-development` (o `executing-plans`). Es una sola tarea porque el cambio de tipos no tiene punto intermedio que compile. Final esperado: `tsc` 0 y 101 tests.
3. **Fase 1 — esqueleto React** (decidido por el usuario): Vite + React consumiendo el motor. Empieza con `superpowers:brainstorming` (alcance, estado de la app, cómo se migra el prototipo).
4. Alinear el prototipo de `design/` con el motor (textos de cartas, intenciones con `intentValue`).

## Decisiones pendientes y temas aparcados

- **Vulnerable por ronda (pendiente de confirmar):** la regla aprobada («−1 al final del turno del afectado») hacía que el vulnerable de un aliado caducase antes de que atacasen los enemigos. El plan usa: aliados pierden 1 al empezar su siguiente turno; enemigos, justo después de actuar.
- `Rng` no es serializable todavía (guardar/cargar run lo necesitará).
- No hay pegamento run → combate (crear el `CombatState` desde el estado de la run y devolver el resultado).
- Deriva (Presagio) combinada con revivir: comportamiento sin especificar.
- El `CLAUDE_CODE_SPEC.md` original pide listar sus reglas ambiguas antes de programar cada fase: hazlo con el usuario al empezar la fase 1.

## Cómo ejecutar

```bash
npm install
```

```bash
npm test
```

```bash
npm run typecheck
```

```bash
python -m http.server 5188 --directory design
```

Luego abre <http://localhost:5188>. En Claude Code: servidor `design` de `.claude/launch.json`. Requisitos y plugins: ver [`README.md`](../README.md).
