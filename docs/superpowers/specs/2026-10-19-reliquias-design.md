# Fase 3b — Reliquias con efectos

**Fecha:** 2026-10-19. Implementa §8 de `CLAUDE_CODE_SPEC.md` con las enmiendas de la spec de reglas núcleo (sin límite de reliquias). Decidido por Claude por delegación del usuario; lo marcado **[mi decisión]** está pendiente de revisión.

## Intención

Reliquias que **cambian decisiones**, no solo suman números: se activan por eventos del combate y de la expedición, con límite de activaciones y una cola de eventos con tope de seguridad contra bucles.

## Alcance

**Entra:** 9 reliquias con efecto real (combate y expedición); cola de eventos `processRelics`; registro de activaciones (`relicLog`) y su feedback visual; botín de reliquias de élite (y combates normales en Ruina, ya calculado por `rollRewards`); barra de reliquias en combate y mapa; lista con texto en Equipo; guardado; tests de cada trigger y del límite anti-bucle.

**No entra:** pasivas y efectos negativos de gear (se pueden expresar ya con este sistema; contenido más adelante), reliquias legendarias de jefe, `onStressThreshold`, reliquias en tienda o eventos.

## Decisiones

1. **Eventos [mi decisión]:** `combatStart`, `turnStart`, `cardPlayed`, `statusConsumed`, `championDowned` (en combate) y `combatEnd`, `nodeEntered` (en la expedición). `onAttack`/`onCriticalHit` quedan fuera: el motor no expone el crítico a ese nivel todavía.
2. **Cola de eventos [mi decisión]:** el motor y las cartas **empujan** eventos de datos a `CombatState.relicQueue` (sin importar reliquias) y `processRelics` los drena al final de cada acción del jugador y del turno enemigo. Así `units.ts` no depende de las reliquias.
3. **Anti-bucle:** como mucho `CONFIG.relics.maxActivationsPerDrain` (30) activaciones por vaciado de cola. Los efectos de una reliquia **no** generan eventos salvo que su definición lo declare (`chains: true`); ninguna de las 9 lo hace. Cada reliquia declara su límite (`turn`/`combat`/ninguno).
4. **Efectos [mi decisión]:** bloqueo, curación, daño verdadero, estrés, energía y estados, con destinatario explícito (todos, dueño, el de menos vida, enemigo al azar…). Todo por las rutas únicas del motor (`applyDamage`, `gainBlock`, `heal`, `addStress`).
5. **Obtención [mi decisión]:** `rewards.relics` (ya calculado: 1 en élite, 2 en Ruina, 10 % en combates normales de Ruina) se concreta como reliquias **no repetidas al azar**, recogidas automáticamente y mostradas en el botín. Sin límite de reliquias (enmienda del usuario).
6. **Las 9:** Corazón incandescente, Emblema del asalto, Fragmento del Vacío, Estandarte de la compañía (del prototipo y de la spec), más Talismán de piedra, Reloj roto, Cuenco de plata, Colmillo del lobo y Lámpara de la Niebla.

## Criterios de aceptación

- `npm test`, `npm run typecheck`, `npm run build` en verde.
- Un test por reliquia (activa, no activa, límite) y un test de que una reliquia en cadena no puede bucle infinito.
- Se ven en HUD y Equipo con su texto; el orbe pulsa al activarse.
- El equilibrio con bot sigue dentro de las cotas del test.
