# Traspaso — dónde estamos y cómo seguir

**Fecha:** 2026-10-19. Léelo entero antes de tocar nada en un chat nuevo.

## Estado

| Pieza | Estado |
|---|---|
| Prototipo visual (`design/`) | HTML/CSS/JS sin build. Todas las pantallas unificadas (principal, mapa, combate, resto). Arte de Riot enlazado (hotlink). |
| Motor de reglas (`src/engine`, `tests/engine`) | Núcleo fusionado en `main`: posiciones con bonus, intercambio por 1 de energía, estrés/crisis/virtud, Presagio de los caídos, Niebla Negra, botín, cinturón de pociones, bucle de turnos e intenciones.  |
| Modelo de cartas §9 + daño §5.4 | **Hecho y fusionado en `main`** según [`plans/2026-10-19-modelo-cartas.md`](superpowers/plans/2026-10-19-modelo-cartas.md). **101 tests en verde.** |
| React (fase 1) | **Hecha** según [`plans/2026-10-19-react-fase1.md`](superpowers/plans/2026-10-19-react-fase1.md): Vite + React 19 + TS; Menú → Preparación → Mapa → Combate → Botín → Descanso → Resultado con el motor real. Incluye `engine/expedition.ts` (mapa con semilla, pegamento run→combate, botín, heridas, descanso), 32 cartas y 6 enemigos provisionales, bot de equilibrio (`npm run balance`) y capturas e2e (`tests/e2e`). Fase 1b añadida: Comerciante (`engine/shop.ts`) y Eventos (`engine/events.ts`, `data/events.ts`) según [`plans/2026-10-19-comerciante-eventos.md`](superpowers/plans/2026-10-19-comerciante-eventos.md). Guardado automático (`src/save/saveManager.ts`, formato v2) y gear con pantalla de Equipo (`engine/gear.ts`, `data/gear.ts`; [`plans/2026-10-19-gear.md`](superpowers/plans/2026-10-19-gear.md)). Reliquias con efectos (`engine/relics.ts`, `data/relics.ts`; [`plans/2026-10-19-reliquias.md`](superpowers/plans/2026-10-19-reliquias.md)): cola de eventos con tope anti-bucle y 9 reliquias. Dificultad Pesadilla con muerte permanente (`data/difficulty.ts`; [`plans/2026-10-19-pesadilla.md`](superpowers/plans/2026-10-19-pesadilla.md)). Mejora de cartas: las 32 tienen `upgrade`; el mazo guarda las mejoradas con sufijo «+» y se forjan en el descanso. Confirmaciones en la interfaz (`ConfirmModal`) y consecuencias de la retirada visibles según la dificultad. Metaprogresión: Esquirlas, 4 mejoras permanentes, Archivo, Equipo del menú y guardado propio (`engine/meta.ts`, `save/metaManager.ts`; [`plans/2026-10-19-metaprogresion.md`](superpowers/plans/2026-10-19-metaprogresion.md)). Guardado con diario: recargar a mitad de un nodo lo reanuda exactamente (sin deshacer muertes ni repetir azar). Nodos Tesoro y Santuario (`engine/chest.ts`, `data/events.ts › SHRINES`). **440 tests en verde.** |
| Git | El trabajo de la fase 1 está en la rama `claude/charming-allen-k5fbs9` (subida). `main` local sigue por delante de `origin`: no hacer `push` de `main` hasta que el usuario lo diga. |

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

1. **Revisar las decisiones de la fase 1** que tomó Claude por delegación (specs `react-fase1-design.md`, `comerciante-eventos-design.md`, `gear-design.md`, `reliquias-design.md`, `pesadilla-design.md`, `metaprogresion-design.md` y `tesoro-santuario-design.md`, «[mi decisión]»): alcance, mapa de 8 pisos, botín, descanso, heridas graves, 32 cartas, 12 objetos, 9 reliquias, mejoras de cartas, eventos, modificadores de Pesadilla y números de enemigos.
2. **Contenido:** pasivas y efectos negativos del gear (el sistema de reliquias ya los puede expresar), más reliquias (legendarias de jefe, `onAttack`/`onCriticalHit`/`onStressThreshold`), efectos de carta que faltan en el motor (robar, convertir recursos), la pantalla Mejoras de metaprogresión (la mejora de cartas dentro de la run ya existe: se forja en el descanso).
3. **Más contenido de nodos:** más eventos y santuarios, y nodos especiales de jefe; el comerciante ya vende cartas, objetos y pociones.
4. **Pantallas pendientes:** ninguna del prototipo; los 8 tipos de nodo de la spec ya existen.
5. **Más metaprogresión:** campeones nuevos y desbloqueos, logros, estado de campeones/heridas entre expediciones («reglas de campaña» de la spec §14).
6. Alinear con el prototipo de `design/`: arte de fondo del combate (hoy es un degradado CSS), animaciones de ataque, escenas de comerciante/evento.

## Decisiones pendientes y temas aparcados

- **Vulnerable por ronda (confirmado por el usuario el 2026-10-19):** la regla aprobada («−1 al final del turno del afectado») hacía que el vulnerable de un aliado caducase antes de que atacasen los enemigos. El plan usa: aliados pierden 1 al empezar su siguiente turno; enemigos, justo después de actuar.
- Guardado: punto seguro en el mapa/Equipo + **diario** de acciones del nodo en curso (`save/saveManager.ts`, `state/gameStore.ts`); al continuar se reproducen con el motor determinista. Cualquier acción nueva que cambie el estado dentro de un nodo debe llamar a `record(...)` y estar en `JOURNAL_ACTIONS`. Si cambias la forma de `Expedition`, sube `SAVE_VERSION` y escribe una migración o los guardados viejos se descartan.
- Deriva (Presagio) combinada con revivir: comportamiento sin especificar.
- El `CLAUDE_CODE_SPEC.md` original pide listar sus reglas ambiguas antes de programar cada fase: se hizo la fase 1 sin esa ronda de preguntas (el usuario delegó); hacerla antes de la fase 3.
- **Equilibrio con mejoras:** con todo al máximo el bot pasa de ~26 % a ~60 % en Normal (+15 de vida llegó a duplicar su tasa, por eso Vigor es pequeño). Si el juego resulta fácil para un humano, sube la dificultad base o encarece las mejoras en `data/perks.ts`.
- Equilibrio: el bot (que compra, equipa, bebe pociones y elige eventos al azar) gana ~26 % en Normal y ~4 % en Pesadilla (`npm run balance`) de las expediciones y un humano debería ganar más. Cotas anchas en `tests/balance/balance.test.ts`; afinar en `src/data/` con `npm run balance`.
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
