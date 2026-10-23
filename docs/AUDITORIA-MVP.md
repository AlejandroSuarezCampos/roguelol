# Auditoría del MVP contra la spec (§3 alcance y §16 criterios)

**Fecha:** 2026-10-23 · **Versión auditada:** `main` en `e49fafa` · **Comprobado:** `npm test` (30 archivos, 468 tests en verde, sin avisos de React ni de `act`), `npm run typecheck` (sin errores, con `noUnusedLocals`), `npm run build` (sin avisos), `npm run balance` y los scripts de `tests/e2e/` en Chromium real (sin errores de consola).

Leyenda: ✅ cumplido y probado · 🔁 cumplido con un cambio **decidido por el usuario** · ⚠️ cumplido con matiz · ⬜ no verificable sin una persona.

## §3 Alcance exacto del MVP

| Requisito | Estado | Evidencia |
|---|---|---|
| Menú/base con Equipo, Mejoras, Archivo y Expedición | ✅ | `MainMenuScreen`, `RosterScreen`, `UpgradesScreen`, `ArchiveScreen`; `tests/app/screens.test.tsx` |
| Cuatro campeones (Leona, Yasuo, Lux, Soraka) y equipo de 4 | ✅ (hay una quinta, Lulu, desbloqueable) | `data/champions.ts`; el equipo de 4 se elige entre los disponibles |
| 8 cartas iniciales por campeón (32) | ✅ (40 con Lulu) | `tests/data/data.test.ts` |
| Combate con 4 posiciones por bando | ✅ | `tests/engine/formation.test.ts`, `combat.test.ts` |
| Mano compartida de 5 y energía 3 | ✅ | `combat.test.ts` («roba 5 con 3 de energía») |
| Dos enemigos básicos y un jefe | ✅ superado | 12 enemigos, dragones como élites y 3 jefes (Barón, Anciano, Viego) |
| Una región: Islas de la Sombra | ✅ | |
| Mapa ramificado de 12–15 nodos | ⚠️ | 15 **pisos** de 2–4 nodos por acto, 3 actos: más grande que el rango pedido (decisión del usuario en la revisión de la fase 1) |
| Nodos: combate, élite, jefe, descanso, comerciante, evento, tesoro, santuario | ✅ | `tests/engine/expedition.test.ts`, `chest.test.ts`, `shop.test.ts`, `events.test.ts` |
| Gear: 2 espacios por campeón | 🔁 | 6 huecos como en el LoL, 28 objetos con pasivas (decisión del usuario) |
| Reliquias: máximo 6 por expedición | 🔁 | sin límite (enmienda del usuario en la spec de reglas núcleo) |
| Estrés persistente y heridas | ✅ | `stress.test.ts`, `expedition.test.ts` |
| Dificultades Normal y Pesadilla | 🔁 | una sola dificultad con Ascensión 0–10; el nivel 10 trae la muerte permanente (decisión del usuario) |
| Recompensas, retirada, victoria y derrota | ✅ | `expedition.test.ts`, `screens.test.tsx` |
| Guardado local básico | ✅ superado | punto seguro + diario, versionado, migraciones y recuperación |
| Tests del motor: daño, posiciones, cartas, estados, reliquias, gear, estrés, dificultad | ✅ | ver §16 |

## §16 Motor

| Criterio | Estado | Pruebas |
|---|---|---|
| Daño físico/mágico/verdadero y mitigación por defensa | ✅ | `damage.test.ts` |
| Crítico y penetración con orden de cálculo documentado | ✅ | `damage.test.ts` («orden §5.4»), spec del modelo de cartas |
| El bloqueo absorbe antes que la vida y se reinicia en el momento correcto | ✅ | `units.test.ts`, `combat.test.ts` («el bloqueo aliado se reinicia…») |
| Alcance/posición permite y bloquea objetivos | ⚠️ | **Por diseño ya no hay alcance por carta** (spec de reglas núcleo, enmienda §5.1: «se elimina la regla de alcance»). Lo que sí se prueba: objetivos legales e ilegales con su motivo (`cards.test.ts`, `selectors.test.ts`) y el bonus por posición ideal |
| Desplazamiento sin estados imposibles | ✅ | `formation.test.ts` (intercambio, huecos, nunca fuera de 1–4) |
| Derribado no actúa ni recibe curación normal | ✅ | `units.test.ts`, `potions.test.ts`, `omen.test.ts` |
| Reanimación solo con efecto explícito | ✅ | `units.test.ts` («revive solo funciona sobre derribados») |
| Energía compartida y límite de cartas por campeón | ✅ | `cards.test.ts` («límite de 3 cartas por campeón y turno») |
| Descarte/robo al acabar/iniciar turno | ✅ | `combat.test.ts`, `cards.test.ts` (robar, barajar el descarte) |
| Estados con duración definida | ✅ | `combat.test.ts` (quemadura, vulnerable, aturdido) y consumo de Marcas/Cargas en `cards.test.ts` |
| Gear modifica las estadísticas del cálculo y de la UI | ✅ | `gear.test.ts` («el combate recibe esas mismas estadísticas»); la pantalla Equipo usa `finalStatsFor` |
| Reliquias solo con triggers válidos y sin bucles | ✅ | `relics.test.ts` (cada reliquia, límites, «una reliquia en cadena no puede crear un bucle infinito») |
| El estrés permanece entre combates y cambia en los umbrales | ✅ | `stress.test.ts`, `expedition.test.ts` |
| Las dificultades aplican consecuencias distintas | ✅ | `ascension.test.ts` |
| Mapa respeta conexiones y se reproduce con semilla | ✅ | `expedition.test.ts` |
| Guardado/carga conserva el estado y recupera de un save inválido | ✅ | `saveManager.test.ts`, `journal.test.ts`, `metaManager.test.ts` |

## §16 Producto / UI

| Criterio | Estado | Pruebas |
|---|---|---|
| Empezar una run nueva desde el menú | ✅ | `screens.test.tsx` |
| Navegar el mapa, combatir, ganar/perder, recompensa y avanzar hasta el jefe | ✅ | partida completa en Chromium (`tests/e2e/full.mjs`) y 300 expediciones simuladas hasta el jefe y la victoria (`npm run balance`) |
| Equipar/reemplazar objetos con comparación | ✅ | `screens.test.tsx` («gear y pantalla de equipo», botín con comparación) |
| Obtener reliquias y ver sus efectos | ✅ | `screens.test.tsx` («reliquias en pantalla»: orbes, texto accesible, lista en mapa y Equipo) |
| Retirar una run y ver las consecuencias | ✅ | `screens.test.tsx` («confirmación de retirada», «Consecuencias de la retirada») |
| Terminar por victoria/derrota y ver resultados | ✅ | `screens.test.tsx` («resultado») |
| Cartas, objetivos, terminar turno y confirmación con ratón y teclado | ✅ | teclas 1–9, Enter, Esc y E; Tab sobre unidades y botones; atajos que no actúan con una ventana abierta (`screens.test.tsx`) |
| Sin errores de TypeScript, tests fallidos ni avisos graves | ✅ | ver cabecera |

## Otros puntos de la spec comprobados

| Punto | Estado |
|---|---|
| §15 Datos críticos siempre visibles (vida, bloqueo, estrés, energía, costes, intenciones) y no solo por color | ✅ icono + texto en todos los estados |
| §15 Objetivos legales e ilegales con motivo | ✅ `whyCannotPlay` se enseña en la carta y en la unidad |
| §15 Pesadilla: explicar la muerte permanente antes de empezar y antes de acciones de riesgo | ✅ en la preparación (Ascensión 10) y con aviso rojo en combate; confirmación de retirada |
| §12 Modificadores de dificultad en un único sitio | ✅ `src/data/ascension.ts` |
| §14 Guardado versionado, datos corruptos con recuperación | ✅ |
| §19 Sin arte oficial descargado, sin analítica, sin backend | ✅ el arte de Riot solo se enlaza (si no carga, monograma); no hay servicios externos |
| §19 No se presenta como producto oficial | ✅ crédito «proyecto fan no comercial» en el menú y el README |

## Lo que esta auditoría NO puede dar por bueno

1. ⬜ **Equilibrio y diversión.** Un bot mediocre gana ~25 % en Ascensión 0 y ~5 % en Ascensión 10. Un humano debería ganar más, pero solo jugándolo se sabrá si es fácil o difícil.
2. ⬜ **Aspecto con el arte real de Riot.** Las capturas automáticas usan imágenes simuladas porque el entorno de pruebas no tiene acceso a esos dominios.
3. ⬜ **Móvil y pantallas pequeñas.** Probado a 1280×720, 1366×680 y 1600×900; el prototipo ya declaraba que no está pensado para móvil.
4. ⬜ **Accesibilidad con lector de pantalla.** Hay `aria-label` y roles, y los tests los usan, pero no se ha probado con un lector real.

## Resultado

**El MVP de la spec §3 está completo.** Las únicas diferencias con el texto original (gear de 6 huecos, reliquias sin límite, Ascensión en vez de Normal/Pesadilla y mapa más grande) son decisiones del usuario, ya reflejadas en `specs/2026-10-20-revision-fase1.md`. No queda ningún criterio de §16 sin cubrir por un test o una ejecución real; lo pendiente es validación humana (arriba).
