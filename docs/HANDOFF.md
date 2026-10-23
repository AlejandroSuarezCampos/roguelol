# Traspaso — dónde estamos y cómo seguir

**Fecha:** 2026-10-20. Léelo entero antes de tocar nada en un chat nuevo.

## Estado

| Pieza | Estado |
|---|---|
| Prototipo visual (`design/`) | HTML/CSS/JS sin build. Todas las pantallas unificadas (principal, mapa, combate, resto). Arte de Riot enlazado (hotlink). |
| Motor de reglas (`src/engine`, `tests/engine`) | Núcleo fusionado en `main`: posiciones con bonus, intercambio por 1 de energía, estrés/crisis/virtud, Presagio de los caídos, Niebla Negra, botín, cinturón de pociones, bucle de turnos e intenciones.  |
| Modelo de cartas §9 + daño §5.4 | **Hecho y fusionado en `main`** según [`plans/2026-10-19-modelo-cartas.md`](superpowers/plans/2026-10-19-modelo-cartas.md). **101 tests en verde.** |
| React (fase 1) | **Hecha** según [`plans/2026-10-19-react-fase1.md`](superpowers/plans/2026-10-19-react-fase1.md): Vite + React 19 + TS; Menú → Preparación → Mapa → Combate → Botín → Descanso → Resultado con el motor real. Incluye `engine/expedition.ts` (mapa con semilla, pegamento run→combate, botín, heridas, descanso), 32 cartas y 6 enemigos provisionales, bot de equilibrio (`npm run balance`) y capturas e2e (`tests/e2e`). Fase 1b añadida: Comerciante (`engine/shop.ts`) y Eventos (`engine/events.ts`, `data/events.ts`) según [`plans/2026-10-19-comerciante-eventos.md`](superpowers/plans/2026-10-19-comerciante-eventos.md). Guardado automático (`src/save/saveManager.ts`, formato v2) y gear con pantalla de Equipo (`engine/gear.ts`, `data/gear.ts`; [`plans/2026-10-19-gear.md`](superpowers/plans/2026-10-19-gear.md)). Reliquias con efectos (`engine/relics.ts`, `data/relics.ts`; [`plans/2026-10-19-reliquias.md`](superpowers/plans/2026-10-19-reliquias.md)): cola de eventos con tope anti-bucle y 9 reliquias. Dificultad: Pesadilla se sustituyó por 10 niveles de Ascensión (`data/ascension.ts`). Mejora de cartas: las 32 tienen `upgrade`; el mazo guarda las mejoradas con sufijo «+» y se forjan en el descanso. Confirmaciones en la interfaz (`ConfirmModal`) y consecuencias de la retirada visibles según la dificultad. Metaprogresión: Esquirlas, desbloqueos (`data/unlocks.ts`: objetos iniciales, cartas y reliquias), objeto inicial por campeón, Archivo, Equipo del menú y guardado propio (`engine/meta.ts`, `save/metaManager.ts`; [`plans/2026-10-19-metaprogresion.md`](superpowers/plans/2026-10-19-metaprogresion.md)). Guardado con diario: recargar a mitad de un nodo lo reanuda exactamente (sin deshacer muertes ni repetir azar). Nodos Tesoro y Santuario (`engine/chest.ts`, `data/events.ts › SHRINES`). |
| Revisión del usuario (2026-10-20) | **Hecha** según [`specs/2026-10-20-revision-fase1.md`](superpowers/specs/2026-10-20-revision-fase1.md): mapa de 15 pisos, tesoro y comerciante como Slay the Spire, 6 huecos de gear y 28 objetos, Ascensión 0–10, desbloqueos en vez de mejoras, dragones, Anciano y Barón. Guardado de la expedición v6 (las v4/v5 se apartan) y progreso permanente v2 (la v1 se migra devolviendo las Esquirlas de las mejoras). |
| Contenido (2026-10-20) | **Hecho** según [`specs/2026-10-20-contenido-fase2.md`](superpowers/specs/2026-10-20-contenido-fase2.md): robar y convertir, pasivas y desventajas del gear, 12 reliquias nuevas (5 de jefe), 3 actos con Barón, Anciano y Viego, y Lulu desbloqueable con equipo de 4 a elegir. Guardado de expedición v7 y progreso permanente v3. **467 tests en verde.** |
| Git | Todo el trabajo está en `main` y subido a `origin/main` (2026-10-23, a petición del usuario). |

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

1. **Revisar las decisiones** que tomó Claude por su cuenta: tablas «Decisiones de Claude» de [`specs/2026-10-20-revision-fase1.md`](superpowers/specs/2026-10-20-revision-fase1.md) y de [`specs/2026-10-20-contenido-fase2.md`](superpowers/specs/2026-10-20-contenido-fase2.md).
2. **Más contenido de nodos:** más eventos y santuarios, y nodos especiales de jefe; el comerciante ya vende cartas, objetos y pociones.
3. **Pantallas pendientes:** ninguna del prototipo; los 8 tipos de nodo de la spec ya existen.
4. **Más metaprogresión:** más campeones (ya existe el sistema: Lulu), logros, estado de campeones/heridas entre expediciones («reglas de campaña» de la spec §14).
5. Dragones de hextech y químtech (sin icono en CommunityDragon) y más enemigos por acto.
6. Alinear con el prototipo de `design/`: arte de fondo del combate (hoy es un degradado CSS), animaciones de ataque, escenas de comerciante/evento.

## Decisiones pendientes y temas aparcados

- **Vulnerable por ronda (confirmado por el usuario el 2026-10-19):** la regla aprobada («−1 al final del turno del afectado») hacía que el vulnerable de un aliado caducase antes de que atacasen los enemigos. El plan usa: aliados pierden 1 al empezar su siguiente turno; enemigos, justo después de actuar.
- Guardado: punto seguro en el mapa/Equipo + **diario** de acciones del nodo en curso (`save/saveManager.ts`, `state/gameStore.ts`); al continuar se reproducen con el motor determinista. Cualquier acción nueva que cambie el estado dentro de un nodo debe llamar a `record(...)` y estar en `JOURNAL_ACTIONS`. Si cambias la forma de `Expedition`, sube `SAVE_VERSION` y escribe una migración o los guardados viejos se descartan.
- Deriva (Presagio) combinada con revivir: comportamiento sin especificar.
- El `CLAUDE_CODE_SPEC.md` original pide listar sus reglas ambiguas antes de programar cada fase: se hizo la fase 1 sin esa ronda de preguntas (el usuario delegó); hacerla antes de la fase 3.
- Equilibrio: el bot (que compra, equipa, bebe pociones y elige eventos al azar) gana ~27 % en Ascensión 0 y ~4 % en Ascensión 10 (expedición de 3 actos) (`npm run balance`) de las expediciones y un humano debería ganar más. Cotas anchas en `tests/balance/balance.test.ts`; afinar en `src/data/` con `npm run balance`.
- **Skills de Claude Code:** `superpowers`, `ui-ux-pro-max` y las demás no están preinstaladas en las sesiones en la nube; hay que volver a subirlas o instalarlas desde sus repos (`obra/superpowers`, `nextlevelbuilder/ui-ux-pro-max-skill`, `DietrichGebert/ponytail`, `nutlope/hallmark`, `microsoft/playwright-cli`, `vercel-labs/agent-skills`).

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
npm run dev
```

```bash
python -m http.server 5188 --directory design
```

Luego abre <http://localhost:5188>. En Claude Code: servidor `design` de `.claude/launch.json`. Requisitos y plugins: ver [`README.md`](../README.md).
