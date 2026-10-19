# Fase 5a — Dificultad Pesadilla

**Fecha:** 2026-10-19. Implementa §5.5 y §12 de `CLAUDE_CODE_SPEC.md`. Decidido por Claude por delegación del usuario; lo marcado **[mi decisión]** está pendiente de revisión.

## Intención

Una segunda dificultad con consecuencias reales y **explicadas antes de empezar**: la muerte permanente de un campeón. Todo modificador vive en un único sitio (`src/data/difficulty.ts`), sin `if (difficulty === …)` repartidos.

## Reglas (de la spec §12)

- **Normal:** como hasta ahora. Un campeón derribado al acabar un combate ganado sobrevive con una herida grave.
- **Pesadilla:** si un campeón **sigue derribado** al acabar el combate, **muere para siempre** (regla visible, sin tiradas ocultas). Si fue **reanimado** antes del final, sobrevive pero recibe una herida grave.
- Menos descansos, recursos más escasos y enemigos más duros.

## Decisiones **[mi decisión]**

| Modificador | Normal | Pesadilla |
|---|---|---|
| Vida de los enemigos | ×1 | ×1,25 |
| Ataque y bloqueo de los enemigos | ×1 | ×1,2 |
| Probabilidad de nodos de descanso a mitad de mapa | ×1 | ×0,5 (el descanso previo al jefe se mantiene) |
| Curación del descanso | 30 % | 20 % |
| Oro del botín | ×1 | ×0,75 |
| Probabilidad de poción | ×1 | ×0,5 |
| Precios del comerciante | ×1 | ×1,25 |

- **Muerte:** el campeón sale del equipo; su gear vuelve al inventario y **sus cartas salen del mazo** (no quedan cartas muertas). Si mueren los cuatro, derrota.
- **Avisos:** la regla se explica en la preparación (junto al selector), la etiqueta «Pesadilla» está siempre en la barra superior, y en combate un aviso rojo indica quién morirá si no se reanima. El resultado marca quién murió.
- **Guardado:** el formato sube a la versión 3 (dificultad y muertos).

## Criterios de aceptación

- `npm test`, `npm run typecheck`, `npm run build` en verde.
- Tests de cada modificador, de la muerte permanente (y de la reanimación), del mazo sin las cartas del muerto y de que Normal no cambia.
- El bot gana menos en Pesadilla que en Normal (test de equilibrio).
