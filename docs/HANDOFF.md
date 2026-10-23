# Traspaso — dónde estamos y cómo seguir

Léelo entero antes de tocar nada en un chat nuevo.

## Estado

**Fecha:** 2026-10-23. El MVP de la spec §3 está completo; ver la auditoría punto por punto en [`AUDITORIA-MVP.md`](AUDITORIA-MVP.md).

| Pieza | Estado |
|---|---|
| Prototipo visual (`design/`) | HTML/CSS/JS sin build; referencia visual. Arte de Riot solo enlazado. |
| Motor (`src/engine`) | Determinista con semilla: posiciones, intercambio, estrés/crisis/virtud, Presagio, Niebla Negra, botín, cinturón de pociones, intenciones, daño §5.4, gear con pasivas, reliquias con cola de eventos y tope anti-bucle, tienda, eventos, cofres, metaprogresión. |
| App React (`src/screens`, `src/state`) | Menú → Preparación → Mapa → Combate/Élite/Jefe → Botín → Descanso/Comerciante/Evento/Tesoro/Santuario → Resultado, con Equipo, Archivo y Equipo del menú. |
| Contenido | 5 campeones (Lulu desbloqueable), 40 cartas (todas con mejora), 28 objetos en 6 huecos con pasivas y desventajas, 21 reliquias (5 de jefe), 12 enemigos, 5 eventos y 3 santuarios; mapas de 15 pisos en 3 actos (Barón, Dragón anciano, Viego). |
| Dificultad y meta | Ascensión 0–10 (nivel 10 = muerte permanente); Esquirlas y desbloqueos. |
| Guardado | Expedición v7 (punto seguro + diario de acciones, reanuda exacto) y progreso permanente v3; los datos dañados se apartan. |
| Pruebas | **474 tests en verde (31 ficheros)**, typecheck y build limpios; e2e con Playwright en `tests/e2e` sin errores de consola (`full.mjs` endurecido: su fallo era el botón «Ir al acto N»). |
| Equilibrio | Bot (`npm run balance`): gana ≈25 % en Ascensión 0 y ≈5 % en Ascensión 10. Un humano debería ganar más; falta validación humana. |
| Git | Todo en `main` y en `origin/main`. |

Planes y specs de cada pieza (todos hechos): ver la carpeta `docs/superpowers/` (`specs/` y `plans/`).

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

1. **Plan de la versión final:** [`PLAN-VERSION-FINAL.md`](PLAN-VERSION-FINAL.md). Empieza por la **validación humana** (lo único que impide dar el MVP por cerrado, ver [`AUDITORIA-MVP.md`](AUDITORIA-MVP.md)): jugar varias expediciones para juzgar equilibrio y diversión, ver el arte real de Riot, probar en móvil y con lector de pantalla.
2. **Revisar las decisiones** que tomó Claude por su cuenta: tablas «Decisiones de Claude» de [`specs/2026-10-20-revision-fase1.md`](superpowers/specs/2026-10-20-revision-fase1.md) y de [`specs/2026-10-20-contenido-fase2.md`](superpowers/specs/2026-10-20-contenido-fase2.md).
3. Fase 5: el combate en móvil (390×844) sale recortado; ver [`PLAN-VERSION-FINAL.md`](PLAN-VERSION-FINAL.md).
4. Más contenido: eventos, santuarios, enemigos por acto, campeones, logros, reglas de campaña (spec §14), dragones de hextech/químtech.
5. Alinear con el prototipo: fondo de combate, animaciones de ataque, escenas de comerciante/evento.

## Decisiones pendientes y temas aparcados

- **Vulnerable por ronda (confirmado por el usuario el 2026-10-19):** la regla aprobada («−1 al final del turno del afectado») hacía que el vulnerable de un aliado caducase antes de que atacasen los enemigos. El plan usa: aliados pierden 1 al empezar su siguiente turno; enemigos, justo después de actuar.
- Guardado: punto seguro en el mapa/Equipo + **diario** de acciones del nodo en curso (`save/saveManager.ts`, `state/gameStore.ts`); al continuar se reproducen con el motor determinista. Cualquier acción nueva que cambie el estado dentro de un nodo debe llamar a `record(...)` y estar en `JOURNAL_ACTIONS`. Si cambias la forma de `Expedition`, sube `SAVE_VERSION` y escribe una migración o los guardados viejos se descartan.
- Deriva (Presagio) combinada con revivir: comportamiento sin especificar.
- El `CLAUDE_CODE_SPEC.md` original pide listar sus reglas ambiguas antes de programar cada fase: se hizo la fase 1 sin esa ronda de preguntas (el usuario delegó); hacerla antes de la fase 3.
- Equilibrio: ver la tabla de estado; cotas anchas en `tests/balance/balance.test.ts`; afinar en `src/data/` con `npm run balance`.
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
