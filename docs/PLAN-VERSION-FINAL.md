# Plan de desarrollo — versión final

**Fecha:** 2026-10-23. Parte del MVP completo ([`AUDITORIA-MVP.md`](AUDITORIA-MVP.md)). Las fases son secuenciales; cada una termina con tests en verde, e2e sin errores y commit en `main`. Las decisiones que cambian reglas existentes se consultan antes (regla de trabajo de [`HANDOFF.md`](HANDOFF.md)).

## Decisiones del usuario (2026-10-23)

1. **Uso personal:** el arte de Riot sigue enlazado; no hay que sustituirlo ni cumplir requisitos de publicación.
2. **Objetivos de contenido y dificultad: sin decidir.** Las cifras de la fase 2 son orientativas; se fijan tras la fase 0 y se pueden recortar.
3. **Audio y tutorial: sí, pero lo último** (pasan a la fase 7, tras todo lo demás).
4. **Desafíos diarios: sí. Multijugador: no.**

## Qué significa «versión final»

Un juego que un desconocido pueda abrir, entender sin ayuda, jugar de principio a fin varias veces con variedad real, en escritorio y móvil, sin errores, con sonido y tutorial, y fácil de abrir (para uso personal basta un `npm run dev`/build local; el despliegue estático es opcional).

## Fase 0 — Validación humana (bloqueante, 1 semana)

Sin esto el resto se construye a ciegas.
- Jugar 10+ expediciones a mano (A0, A3, A6, A10) y anotar: dónde se aburre, dónde muere sin entender por qué, qué carta/objeto/reliquia domina.
- Ver el arte real de Riot con red abierta (hasta ahora las imágenes se simularon en los e2e).
- Probar en móvil real y con lector de pantalla.
- Salida: lista priorizada de problemas (bloqueante / molesto / pulido) en `docs/superpowers/specs/` como `2026-xx-validacion.md`.

## Fase 1 — Equilibrio y estabilidad (1–2 semanas)

**Estado (2026-10-23):** parte técnica hecha; el ajuste de equilibrio espera a la fase 0.
- ✅ `tests/e2e/full.mjs` endurecido: la causa del fallo era que el botón del final de acto se llama «Ir al acto N» y el script solo buscaba «Continuar»/«Ver resultado»; ahora también falla con código de salida ≠ 0 si no termina o hay errores de consola.
- ✅ Exportar/importar partida (`src/save/backup.ts`, botones en el menú, 6 tests): valida todo en memoria antes de escribir.
- ✅ Migraciones: las del progreso permanente (v1→v2→v3) ya tenían tests; las expediciones antiguas (≤v6) **no se migran por diseño** y se apartan, con test.
- ✅ Reanudar a mitad de nodo: ya cubierto en `tests/state/journal.test.ts` (combate, botín, evento, tienda, descanso, tesoro).
- ✅ `tests/e2e/sizes.mjs` comprueba desbordamiento horizontal. **Hallazgo para la fase 5:** el combate a 390×844 sale recortado (enemigos fuera de pantalla, sin scroll), que el comprobador de desbordamiento no detecta.
- ⏳ Ajuste de `src/data/` y búsqueda de combinaciones rotas: tras la fase 0.

Plan original de la fase:

- Ajustar `src/data/` según la fase 0; objetivo orientativo: humano medio ≈35–45 % en A0, bot ≈25 % como suelo. Los objetivos exactos los fija el usuario.
- Revisar combinaciones rotas (reliquias × pasivas de gear × cartas de robar/convertir) con el bot y simulaciones por semilla.
- Endurecer `tests/e2e/full.mjs` (espera explícita del botón «Continuar»), añadir e2e de móvil y de recarga a mitad de nodo en cada tipo de nodo.
- Guardado: prueba de migración v6→v7 y meta v2→v3 con fixtures reales; botón visible de «exportar/importar partida».

## Fase 2 — Contenido de la versión final (3–4 semanas)

Meta propuesta (a confirmar con el usuario):
| Elemento | Hoy | Objetivo |
|---|---|---|
| Campeones | 5 | 8 (3 desbloqueables) |
| Cartas | 40 | ~90 (≈18 por campeón + neutras) |
| Objetos de gear | 28 | ~45 |
| Reliquias | 21 | ~35 |
| Enemigos | 12 | ~25, con 3 por acto de élite propia |
| Eventos / santuarios | 5 / 3 | ~20 / 8 |

Orden: campeones y sus cartas (con tests de datos y de balance por campeón) → enemigos y élites por acto → eventos → reliquias/objetos. Cada lote pasa por el bot antes de fusionarse. Incluye los dragones de hextech y químtech pendientes.

## Fase 3 — Metaprogresión y reglas de campaña (2 semanas)

- Estado de campeones y heridas entre expediciones (spec §14, «reglas de campaña»): ronda previa de preguntas al usuario, que el spec original exige para esta fase.
- Logros y Archivo ampliado (bestiario, cartas vistas, reliquias vistas).
- Desafíos diarios (sí): semilla derivada de la fecha, un campeón/modificador fijo por día, resultado guardado en local; más pantalla de semilla personalizada. El motor ya es determinista. Sin multijugador ni ranking en línea.

## Fase 4 — Presentación visual (2 semanas)

- Fondo de combate por acto, animaciones de ataque, daño flotante, transiciones entre pantallas, escenas de comerciante/evento (alinear con `design/`).

## Fase 5 — Accesibilidad y móvil (1–2 semanas)

**Estado (2026-10-23):** hecha la parte técnica; falta la prueba con dispositivos y lector de pantalla reales.
- ✅ Móvil vertical: combate con enemigos arriba y equipo debajo, controles en dos filas, mano con scroll horizontal, barra superior en dos filas, objetivos táctiles ≥44 px. Pantallas bajas (móvil apaisado o 360×640): el combate se desplaza en vertical. Se corrigieron dos causas de recorte: columnas de rejilla `1fr` que crecían con su contenido (ahora `minmax(0,1fr)`) y una colisión de clase `.hand` entre la mano y la carta.
- ✅ `tests/e2e/mobile.mjs`: recorre menú, preparación, mapa, 8 tipos de nodo, equipo, campeones, desbloqueos y archivo, y falla si hay botones fuera de pantalla o desbordamiento (probado a 390×844, 360×640, 412×915 y 768×1024).
- ✅ Teclado: `tests/e2e/keyboard.mjs` juega 6 turnos de combate solo con teclado (atajos 1–5, Tab hasta el objetivo, Intro, E).
- ✅ axe-core (`tests/e2e/a11y.mjs`, requiere `npm i --no-save axe-core`): 0 violaciones en todas las pantallas (landmark `main`, un `h1` por pantalla con orden de encabezados, nombres accesibles que contienen el texto visible).
- ✅ Preferencias en el menú: «Reducir movimiento» y «Alto contraste» (se recuerdan en el navegador). Texto secundario subido a contraste AA.
- ⏳ Pendiente: prueba real con lector de pantalla y en móvil físico; Lighthouse (no disponible sin red); tooltips que hoy dependen del ratón (`title`); cartas legibles en móvil (el texto de la carta en la mano mide ≈9 px).

Plan original de la fase:

- Layout táctil completo: sin hover obligatorio, objetivos ≥44 px, arrastrar/tocar para jugar cartas.
- Teclado completo, foco visible, roles ARIA en modales y mapa, `prefers-reduced-motion`, modo de alto contraste y paleta apta para daltonismo (no depender solo del color en estados).
- Auditoría con lector de pantalla y Lighthouse (objetivo ≥90 en accesibilidad).

## Fase 6 — Rendimiento y cierre técnico (1 semana)

- Rendimiento: división de código por pantalla, carga diferida del arte, presupuesto de bundle.
- CI con tests + typecheck + build + e2e en cada push a `main`. Despliegue estático opcional (uso personal).
- Botón «copiar diagnóstico» para errores.
- Arte: se mantiene enlazado de Riot con crédito (uso personal; si algún día se publica, se sustituye).

## Fase 7 — Audio y tutorial (lo último, 2 semanas)

- Audio: música por acto y efectos; mute/volumen persistentes; fuentes con licencia libre y créditos.
- Tutorial interactivo de la primera expedición (posiciones, intercambio, estrés, Presagio), enlazado con el glosario in-game.
- Salida: versión 1.0 etiquetada y notas de versión.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Más contenido rompe el equilibrio | Lotes pequeños + bot + cotas en `tests/balance` |
| Cambios de forma en `Expedition` invalidan guardados | `SAVE_VERSION` + migración + fixtures (fase 1) |
| Acciones nuevas fuera del diario rompen la reanudación | Test que recorre `JOURNAL_ACTIONS` por cada acción nueva |
| Alcance de contenido excesivo | Reducir la tabla de objetivos; el orden de fase 2 permite cortar en cualquier punto |

## Pendiente de decidir

- Objetivos de contenido (fase 2) y de dificultad (humano medio en A0): tras la fase 0.
- Qué campeones nuevos entran y con qué identidad de juego.
