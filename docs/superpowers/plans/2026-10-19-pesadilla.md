# Plan — Fase 5a: Pesadilla

**Spec:** [`../specs/2026-10-19-pesadilla-design.md`](../specs/2026-10-19-pesadilla-design.md). Un commit por tarea; tests primero.

- [ ] **D1 Datos y motor.** `data/difficulty.ts`, `Expedition.difficulty`/`dead`, modificadores en mapa, combate, botín, descanso y comerciante; muerte permanente y heridas por reanimación (`CombatState.fallen`). Tests.
- [ ] **D2 Guardado y store.** Versión 3; `newExpedition(seed, difficulty)`. Tests.
- [ ] **D3 UI.** Selector en Preparación con la regla explicada, etiqueta en HUD, aviso en combate, muertos en Equipo y Resultado.
- [ ] **D4 Equilibrio y verificación.** Bot en ambas dificultades, e2e, README y traspaso.
