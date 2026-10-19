# Fase 1 — Esqueleto React sobre el motor

**Fecha:** 2026-10-19. **Estado:** decidido por Claude por delegación del usuario («hazlo todo, pregunta solo si hace falta»). Las decisiones marcadas **[mi decisión]** no las ha visto el usuario: revisarlas al leer.

## Intención

Tener una app React que **juegue una expedición de principio a fin con el motor real** (`src/engine`), con el lenguaje visual del prototipo `design/`. El prototipo sigue siendo la referencia visual; el motor, la de reglas. Lo que no existe todavía en el motor no se simula en la UI.

## Alcance

**Entra (rebanada vertical jugable):** Menú → Preparación (orden del equipo) → Mapa → Combate → Botín → Descanso → Resultado (victoria / derrota / retirada).

**No entra (botones del menú deshabilitados con «Próximamente»):** Equipo, Mejoras, Archivo, Comerciante, Evento, Santuario, Tesoro, reliquias con efecto, gear, guardado, metaprogresión, dificultades. Son las fases 3–5 de `CLAUDE_CODE_SPEC.md`.

## Decisiones

1. **Stack [mi decisión]:** Vite + React 19 + TypeScript estricto. Vitest con jsdom y Testing Library para tests de pantallas. CSS plano con los tokens del prototipo (sin Tailwind ni librerías de UI). Sin router: una máquina de pantallas en el store.
2. **Estado [mi decisión]:** el motor muta `CombatState` y `RunState` en sitio (no se tocan). Un store propio (`src/state/gameStore.ts`) con `useSyncExternalStore`: cada acción llama al motor y publica un snapshot nuevo. Los componentes no usan `React.memo` sobre objetos del motor.
3. **Pegamento run → combate [mi decisión]:** nuevo `src/engine/expedition.ts` con `Expedition { run, deck, map, … }`, generación del mapa con semilla, `combatFromExpedition` y `applyCombatResult`. Aditivo: `RunState` no cambia (el mazo vive en `Expedition`). Con tests.
4. **Datos temporales [mi decisión]:** 32 cartas (8 por campeón) que usan **solo** los efectos que el motor ya implementa (daño, bloqueo, curación, estados, movimiento, estrés, revivir). Las cartas del prototipo que piden robar o convertir recursos se sustituyen por equivalentes. Enemigos: Gran lobo sombrío, Centinela azul, Gromp, Picoaguzado, Heraldo de la Grieta (élite) y Viego (jefe). Todos los números viven en `src/data/` y `config.ts`; se afinan con una simulación de partidas con bot (test de equilibrio).
5. **Mapa [mi decisión]:** 8 pisos, 2–3 nodos por piso con caminos a los nodos contiguos del piso siguiente; último piso, jefe. Tipos con efecto en la fase 1: combate, élite, descanso, jefe. Semilla de la run → mismo mapa.
6. **Botín [mi decisión]:** oro (aún sin tienda: solo se muestra y cuenta en el resultado), elección de 1 carta entre `cardOptions` (o saltar) y, si hay hueco, una poción. Reliquias: el motor las cuenta pero no tienen efecto, así que no se ofrecen.
7. **Descanso [mi decisión]:** una acción por parada: curar 30 % de vida máxima a todos, o reducir 20 de estrés a todos. «Avivar la hoguera» (`stokeFire`) aparte, como pide el motor.
8. **Arte:** imágenes del repo (`design/assets`) importadas desde Vite; arte de Riot solo enlazado (hotlink) con respaldo a monograma, como el prototipo. Nada de Riot se descarga al repo.
9. **Accesibilidad:** foco visible, `aria-label` en unidades y cartas, ningún estado solo por color, atajos 1–5 para cartas y Esc para cancelar (lo que ya decía `IMPLEMENTATION.md`).
10. **Fuera de la fase:** `Rng` serializable y guardado (fase 5); Vulnerable queda como confirmó el usuario.

## Criterios de aceptación

- `npm test`, `npm run typecheck` y `npm run build` en verde.
- Se puede jugar de principio a fin una expedición (ganar y perder) sin errores en consola.
- El combate muestra posiciones, bonus de posición, intenciones con `intentValue`, estrés con crisis/virtud, estados, poción y el motivo de cada carta ilegal (`whyCannotPlay`).
- Un test de equilibrio con bot demuestra que un combate normal no es trivial ni imposible (ver plan).
