# Fase 1c — Tesoro y Santuario

**Fecha:** 2026-10-19. Completa los 8 tipos de nodo de `CLAUDE_CODE_SPEC.md` §11 (ya estaban combate, élite, jefe, descanso, comerciante y evento). Decidido por Claude por delegación del usuario; lo marcado **[mi decisión]** está pendiente de revisión.

## Intención

Dos nodos de decisión más, con más riesgo y recompensa que un evento: el **Tesoro** (elegir 1 de 3 botines visibles) y el **Santuario** (un efecto poderoso con coste claro).

## Reglas **[mi decisión]**

- **Mapa:** como mucho un Tesoro (pisos 3–5) y un Santuario (pisos 2–4) por mapa, con probabilidad baja; no hay garantía de que salgan.
- **Tesoro:** al entrar se ofrecen **3 opciones distintas, todas visibles**: oro (+90), una **reliquia** concreta (o, si ya se tienen todas, oro extra) y un **objeto raro o legendario** concreto. Se elige una y el cofre se cierra. Elegir es irreversible y se confirma.
- **Santuario:** 3 santuarios con 3 opciones cada uno (formato `[Acción] ganancia · coste`, como los eventos): reliquia a cambio de estrés, vida máxima permanente a cambio de oro, curación total a cambio de niebla o una herida, etc. Usa la pantalla de eventos. Efectos nuevos: `relic` (una reliquia no repetida al azar) y `maxHpAll` (vida máxima permanente a todos).
- **Guardado y diario:** el Tesoro añade la acción `takeChestOffer` al diario; el Santuario usa `chooseEventOption`.

## Criterios de aceptación

- `npm test`, `npm run typecheck`, `npm run build` en verde.
- Tests del mapa (máximo uno de cada, solo en sus pisos), de las ofertas del Tesoro, de cada efecto nuevo, del diario y de las pantallas.
- El equilibrio con bot sigue dentro de las cotas del test.
