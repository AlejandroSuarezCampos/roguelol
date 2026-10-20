# Contenido (fase 2 de la lista de siguientes pasos)

**Fecha:** 2026-10-20 · **Estado:** implementado. El usuario eligió en chat las tres decisiones de diseño; el resto lo decidió Claude y está marcado para revisar.

## Decisiones del usuario

| Tema | Elección |
|---|---|
| Gear | Pasivas inspiradas en el LoL en raros y legendarios, y **algunas desventajas** visibles en rojo |
| Jefes | **3 actos como Slay the Spire**, un jefe por acto: Barón Nashor, Dragón anciano y Viego |
| Campeón nuevo | **Lulu** («no puede faltar»), desbloqueable con Esquirlas |

## Lo implementado

1. **Efectos de carta nuevos:** `draw` (robar; mano máxima 10) y `convertStatus` (consume Cargas o Marcas del lanzador y da bloqueo por cada una). Destello, Sacrificio y Camino del Errante recuperan su efecto del prototipo.
2. **Pasivas y desventajas del gear** (`data/gear.ts › TRIGGERS`), sobre el mismo motor que las reliquias: una pasiva solo reacciona a eventos cuyo protagonista es su portador. Eventos nuevos: `criticalHit` (crítico con una carta) y `allyHit` (golpe enemigo recibido). Límite nuevo `expedition` (Ángel de la guarda) guardado en `Expedition.spentGear`. Desventajas: Filo infinito (−10 armadura), Rabadon (+2 estrés por carta) y Lord Dominik (+3 estrés por crítico).
3. **Reliquias:** 7 normales nuevas (incluido el evento nuevo `stressThreshold` al cruzar 50 o 75 de estrés) y 5 **de jefe** (rareza `boss`): muy fuertes, casi todas con coste. Nunca salen en botín, tienda, tesoros ni eventos.
4. **3 actos:** un mapa de 15 pisos por acto (`a1n…`, `a2n…`). Al vencer al jefe de los actos 1 y 2 se elige 1 de 3 reliquias de jefe y empieza el siguiente acto. Vencer a Viego (acto 3) gana la expedición.
5. **Lulu:** 8 cartas (Lanza brillante, ¡Ayuda, Pix!, Capricho, Capricho veloz, Pix, Crecimiento salvaje, Polvo de hadas, Revoloteo de Pix), crisis Pánico, posición ideal 3–4. Se desbloquea por 120 Esquirlas y en la preparación se eligen 4 de los campeones disponibles.

## Decisiones de Claude (pendientes de revisar)

| # | Decisión | Dónde |
|---|---|---|
| 1 | Entre actos: se cura **toda** la vida perdida, −20 de estrés y la Niebla vuelve a 0 / 10 / 20 según el acto | `config.ts › expedition` |
| 2 | Escalado por acto: vida ×1 / 1,3 / 1,6, ataque ×1 / 1,2 / 1,4, oro ×1 / 1,25 / 1,5 | `config.ts › actScaling` |
| 3 | Los objetos iniciales se rebajaron (sin vida, o casi): con vida, el bot pasaba del 40 % al 80 % de victorias | `data/gear.ts` |
| 4 | Lanza brillante aplica Vulnerable solo desde 3–4: con Vulnerable siempre, Lulu subía al 43 % frente al 27 % | `data/cards.ts` |
| 5 | Posiciones del equipo elegido: por la posición de partida de cada campeón (Lulu, 3) | `createExpedition` |
| 6 | Lulu cuesta 120 Esquirlas; Égida de fuego solar y Segador de esencia se añaden a los desbloqueos | `data/unlocks.ts` |
| 7 | Guardado de expedición v7 (las anteriores se apartan); progreso permanente v3 (v1 y v2 se migran sin perder nada) | `save/*` |

## Equilibrio (bot, 200 expediciones)

- Ascensión 0: ~27 % de victorias, piso medio ~24 de 45.
- Ascensión 10: ~4 %.
- Lulu en lugar de Lux o Yasuo: ~24 %. Sin Leona el equipo se queda sin tanque y casi nunca gana.
