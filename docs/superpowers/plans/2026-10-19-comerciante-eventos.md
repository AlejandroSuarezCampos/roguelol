# Plan — Fase 1b: comerciante y eventos

**Spec:** [`../specs/2026-10-19-comerciante-eventos-design.md`](../specs/2026-10-19-comerciante-eventos-design.md). Un commit por tarea; tests primero.

- [x] **U1 Mapa y config.** `CONFIG.shop`, nodos `shop`/`event` en `generateMap` con garantías; actualizar tests del mapa.
- [x] **U2 Comerciante (engine).** `shop.ts`: `generateShop`, `buyCard`, `buyPotion`, `treatWound`, `removeCard`. Tests.
- [x] **U3 Eventos (engine + datos).** `data/events.ts`, `engine/events.ts`: `pickEvent`, `resolveChoice`, requisitos. Tests.
- [x] **U4 Store.** Pantallas `shop`/`event`, acciones y entrada desde el mapa. Tests.
- [x] **U5 UI.** `MerchantScreen`, `EventScreen`, leyenda y vista previa del mapa, estilos.
- [x] **U6 Bot y equilibrio.** El bot compra y elige opciones de evento; reajustar números.
- [x] **U7 Verificación.** e2e con capturas, README y traspaso.
