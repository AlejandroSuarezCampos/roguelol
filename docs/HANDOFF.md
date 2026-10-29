# Traspaso — dónde estamos y cómo seguir

Léelo entero antes de tocar nada en un chat nuevo.

## Estado

**Fecha:** 2026-10-23. El MVP de la spec §3 está completo; ver la auditoría punto por punto en [`AUDITORIA-MVP.md`](AUDITORIA-MVP.md).

| Pieza | Estado |
|---|---|
| Prototipo visual (`design/`) | HTML/CSS/JS sin build; referencia visual. Arte de Riot solo enlazado. |
| Motor (`src/engine`) | Determinista con semilla: posiciones, intercambio, estrés/crisis/virtud, Presagio, Niebla Negra, botín, cinturón de pociones, intenciones, daño §5.4, gear con pasivas, reliquias con cola de eventos y tope anti-bucle, tienda, eventos, cofres, metaprogresión. |
| App React (`src/screens`, `src/state`) | Menú → Preparación → Mapa → Combate/Élite/Jefe → Botín → Descanso/Comerciante/Evento/Tesoro/Santuario → Resultado, con Equipo, Archivo y Equipo del menú. |
| Contenido | 167 campeones (Yasuo, los 26 apoyos, los 22 tiradores, 41 de la línea central, 41 de la superior y 36 de la jungla del LoL; todos desbloqueables salvo los 4 iniciales, 120 Esquirlas cada uno), 3340 cartas (20 por campeón, todas con mejora, de las tres rarezas), 60 objetos en 6 huecos con pasivas y desventajas (32 añadidos el 2026-10-24: componentes, raros y legendarios famosos del LoL), 21 reliquias (5 de jefe), 12 enemigos, 5 eventos y 3 santuarios; mapas de 15 pisos en 3 actos (Barón, Dragón anciano, Viego). |
| Dificultad y meta | Ascensión 0–10 (nivel 10 = muerte permanente); Esquirlas y desbloqueos. |
| Guardado | Expedición v7 (punto seguro + diario de acciones, reanuda exacto) y progreso permanente v3; los datos dañados se apartan. |
| Pruebas | **864 tests en verde (39 ficheros)**, typecheck y build limpios; e2e con Playwright en `tests/e2e` sin errores de consola (`full.mjs` endurecido: su fallo era el botón «Ir al acto N»). |
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

0. **Más campeones:** hechos todos los campeones cuyo papel principal en el LoL es apoyo (Leona, Lux, Soraka, Lulu ya estaban; añadidos Janna, Nami, Sona, Thresh, Alistar, Bard, Blitzcrank, Braum, Karma, Milio, Nautilus, Pyke, Rakan, Rell, Renata, Senna, Seraphine, Taric, Yuumi, Zilean, Zyra y Morgana). Los kits siguen cómo se juegan en el LoL (ganchos = «arrastra al objetivo a la posición 1» con `move to:1` sobre el enemigo; Bard recoloca aliados con `move to:4` y gasta Cargas de carillones; Thresh gasta Cargas como almas…). Las cartas de los 18 últimos están en `src/data/cardsSupports.ts` (textos generados a partir de los efectos; un empuje a todos los enemigos a la vez no funciona porque cada empuje intercambia posiciones). Con el bot (A0, 120 expediciones, sustituyendo a Soraka): entre ≈5 % (Pyke) y ≈29 % (Thresh) frente a ≈25 % del equipo base; todo provisional y sin pulir. Un equipo con menos de dos atacantes no gana (0 %). Tiradores (ADC) hechos el 2026-10-26: 22 campeones en `src/data/cardsAdc.ts` (críticos, ráfagas de varios disparos, Cargas como pasivas, Marcas como veneno o lanzas, saltos que cambian de posición); con el bot sustituyendo a Lux: entre ≈8 % (Aphelios, Jinx, Twitch) y ≈25 % (Jhin, Samira) frente a ≈24 %. Línea central hecha el 2026-10-26: 41 campeones en `src/data/cardsMid.ts` (magos de ráfagas y área, asesinos que marcan y rematan; Zed, Syndra, Sylas, Katarina… ver `tests/engine/mids.test.ts`); con el bot (60 expediciones, sustituyendo a Lux o a Yasuo) entre ≈8 % y ≈32 % frente a ≈24 %; se retocaron las estadísticas de Malzahar, Lissandra, Sylas, Mel, Azir y Akali. Línea superior hecha el 2026-10-29: 41 campeones en `src/data/cardsTop.ts` (tanques que aturden y protegen, luchadores con Cargas o Marcas, ganchos al frente); con el bot sustituyendo a Yasuo (Leona se queda) entre ≈7 % y ≈33 %; **ningún tanque de primera fila puede sustituir a Leona** (0–2 %: sus dos aturdimientos baratos del mazo inicial lo sostienen todo), y se retocó la vida de Aatrox y Maokai. Jungla hecha el 2026-10-29: 36 campeones en `src/data/cardsJungle.ts` (Viego incluido, además de ser jefe del acto 3); con el bot sustituyendo a Yasuo entre ≈8 % y ≈37 % (Nocturne bajado de vida). Con esto están todos los roles principales del LoL; el catálogo oficial de Data Dragon (`npm run import:lol`) permitirá comprobar qué campeones faltan y los `itemId`. El paquete de la web ya pesa ≈1,2 MB (214 kB comprimido) (límite del aviso de Vite subido a 1500): hay que dividirlo en la fase 6. **Las 20 cartas de cada campeón** (2026-10-29): las 8 primeras están escritas a mano/por plantilla (ver arriba) y las 12 «extra» (ids 9–20) las genera `npm run gen:cards` (`scripts/genExtraCards.ts`, determinista) a partir de ~70 recetas elegidas según el perfil de cada campeón (Marcas, quemadura, Cargas, curación…) y su papel; salen en `src/data/cardsExtra.json` en forma compacta y `src/data/cardGen.ts` genera de ellas el texto, la mejora y las palabras clave. Reparto 9 comunes / 7 raras / 4 épicas; los campeones con las 12 escritas a mano (por ahora Lulu) están en `src/data/cardsManual.ts` y el generador los salta; hay ≈1100 efectos distintos en las ≈1800 cartas extra. Botín y tienda ahora ponderan por rareza (`CONFIG.cardRarityWeights` 6/3/1) y una carta con precio en vida («Pierde N de vida») no se puede jugar si mataría a su dueño. El bot elige la mejor carta ofrecida (`cardScore` en `tests/balance/bot.ts`): ≈17 % de victorias en A0 y ≈4 % en A10. El paquete de la web pesa ≈1,2 MB (214 kB comprimido): dividirlo en la fase 6. **Revisión de todas las cartas (2026-10-29):** las Marcas y las Cargas **no hacen nada por sí solas** (solo las gastan cartas con «+N por cada Marca/Carga que consume», reliquias y objetos): 61 campeones aplicaban Marcas y 83 Cargas sin ninguna carta que las gastara; el generador ahora lo repara (cambia una carta genérica por la que falta) y `tests/data/data.test.ts` lo vigila para los 167. También: textos sin verbos repetidos («Gana 7 de bloqueo y 1 Carga»), cartas de área con efectos propios en frase aparte, campeones en Ira sin cartas de objetivo «aliado» entre las extra, daño mínimo 2, más alivio de estrés y nombres sin infinitivos. Cada campeón = tipo en `ChampionId`, `CHAMPIONS`, `CRISIS`, 8 cartas con mejora, 5 en `STARTER_DECK`, un `u('champion', …)` en `unlocks.ts` y pesos en `tests/balance/bot.ts`.
0. **Catálogo del LoL:** ejecutar en una máquina con internet `npm run import:lol` (`scripts/import-ddragon.ts`): baja campeones y objetos de Data Dragon a `src/data/catalog.generated.json` y avisa de los `itemId` de `src/data/gear.ts` que no existan en esa versión (los 32 nuevos se escribieron de memoria sin poder comprobarlos). Aún no hay campeones nuevos jugables: cada uno necesita su kit diseñado; el catálogo sirve para elegirlos.

1. **Plan de la versión final:** [`PLAN-VERSION-FINAL.md`](PLAN-VERSION-FINAL.md). Empieza por la **validación humana** (lo único que impide dar el MVP por cerrado, ver [`AUDITORIA-MVP.md`](AUDITORIA-MVP.md)): jugar varias expediciones para juzgar equilibrio y diversión, ver el arte real de Riot, probar en móvil y con lector de pantalla.
2. **Revisar las decisiones** que tomó Claude por su cuenta: tablas «Decisiones de Claude» de [`specs/2026-10-20-revision-fase1.md`](superpowers/specs/2026-10-20-revision-fase1.md) y de [`specs/2026-10-20-contenido-fase2.md`](superpowers/specs/2026-10-20-contenido-fase2.md).
3. Fase 5 hecha en lo técnico (móvil, teclado, axe); queda la prueba con dispositivos reales, ver [`PLAN-VERSION-FINAL.md`](PLAN-VERSION-FINAL.md).
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
