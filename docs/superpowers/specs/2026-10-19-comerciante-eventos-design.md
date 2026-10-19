# Fase 1b — Comerciante y eventos

**Fecha:** 2026-10-19. Continúa la [fase 1](2026-10-19-react-fase1-design.md). Decidido por Claude por delegación del usuario; todo lo marcado **[mi decisión]** está pendiente de revisión. Base visual y de contenido: `design/screens.js` (comerciante y evento del prototipo) y §13 de `CLAUDE_CODE_SPEC.md`.

## Intención

Que el oro sirva para algo y que el mapa deje de ser solo «combate o descanso». Dos tipos de nodo nuevos con efecto real en el motor: **Comerciante** y **Evento**.

## Alcance

**Entra:** nodos `shop` y `event` en el mapa (con su vista previa y leyenda); motor `shop.ts` y `events.ts` con tests; datos en `src/data/events.ts`; pantallas `MerchantScreen` y `EventScreen`; el bot de equilibrio los usa.

**No entra:** gear en venta (no existe aún), reliquias (sin efecto), Tesoro y Santuario, vender cartas, eventos encadenados.

## Comerciante **[mi decisión]**

- Stock fijo al entrar (semilla de la run): 3 cartas distintas del pool, 3 pociones distintas, y dos servicios.
- Precios en `CONFIG.shop`: carta común 50, rara 80, épica 120; pociones 35–50; **Tratar herida** 25 (quita una herida al campeón más herido y recupera su vida máxima); **Eliminar carta** 75 (+25 por cada eliminación ya hecha en la run).
- Nada se compra sin oro suficiente; lo vendido queda marcado «Vendido». Con el cinturón lleno hay que elegir qué poción sustituir.
- Se puede salir en cualquier momento. Entrar sube la niebla como cualquier nodo.

## Eventos **[mi decisión]**

Cinco eventos con 3 opciones cada una, formato del prototipo: `[Acción] ganancia · coste`. Cada opción tiene efectos declarativos (`gold`, `healAll`, `damageAll`, `stressAll`, `mist`, `addCard`, `addPotion`, `wound`) y, a veces, un requisito de oro. Se elige con la semilla de la run y no se repite dentro de una expedición. Las opciones irreversibles se confirman antes de aplicarse.

## Mapa **[mi decisión]**

Pisos 2–5 pueden traer `shop` y `event`; se garantiza al menos un comerciante (pisos 2–4) y un evento (pisos 1–4). Máximo un comerciante por piso.

## Criterios de aceptación

- `npm test`, `npm run typecheck`, `npm run build` en verde.
- Se puede comprar, eliminar una carta y salir; se puede resolver un evento de cada tipo.
- El equilibrio con bot sigue dentro de las cotas anchas del test.
