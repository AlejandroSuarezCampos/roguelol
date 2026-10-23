# Plan de desarrollo — versión final

**Fecha:** 2026-10-23. Parte del MVP completo ([`AUDITORIA-MVP.md`](AUDITORIA-MVP.md)). Las fases son secuenciales; cada una termina con tests en verde, e2e sin errores y commit en `main`. Las decisiones que cambian reglas existentes se consultan antes (regla de trabajo de [`HANDOFF.md`](HANDOFF.md)).

## Qué significa «versión final»

Un juego que un desconocido pueda abrir, entender sin ayuda, jugar de principio a fin varias veces con variedad real, en escritorio y móvil, sin errores, con arte y sonido propios o correctamente acreditados, y publicado en una URL estable.

## Fase 0 — Validación humana (bloqueante, 1 semana)

Sin esto el resto se construye a ciegas.
- Jugar 10+ expediciones a mano (A0, A3, A6, A10) y anotar: dónde se aburre, dónde muere sin entender por qué, qué carta/objeto/reliquia domina.
- Ver el arte real de Riot con red abierta (hasta ahora las imágenes se simularon en los e2e).
- Probar en móvil real y con lector de pantalla.
- Salida: lista priorizada de problemas (bloqueante / molesto / pulido) en `docs/superpowers/specs/` como `2026-xx-validacion.md`.

## Fase 1 — Equilibrio y estabilidad (1–2 semanas)

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
- Desafíos diarios con semilla compartida (el motor ya es determinista) y pantalla de semilla personalizada.

## Fase 4 — Presentación (2–3 semanas)

- Fondo de combate por acto, animaciones de ataque, daño flotante, transiciones entre pantallas, escenas de comerciante/evento (alinear con `design/`).
- Audio: música por acto y efectos; mute/volumen persistentes. Fuentes de audio con licencia libre y créditos.
- Tutorial interactivo de la primera expedición (posiciones, intercambio, estrés, Presagio) y glosario in-game ya existente enlazado desde el tutorial.

## Fase 5 — Accesibilidad y móvil (1–2 semanas)

- Layout táctil completo: sin hover obligatorio, objetivos ≥44 px, arrastrar/tocar para jugar cartas.
- Teclado completo, foco visible, roles ARIA en modales y mapa, `prefers-reduced-motion`, modo de alto contraste y paleta apta para daltonismo (no depender solo del color en estados).
- Auditoría con lector de pantalla y Lighthouse (objetivo ≥90 en accesibilidad).

## Fase 6 — Rendimiento, legal y publicación (1–2 semanas)

- Arte: decidir entre enlazado de Riot (solo uso personal) o arte propio/libre para publicar. **Si se publica, se sustituye** (regla ya fijada). Revisar la política de contenido de fans de Riot, créditos y aviso de no afiliación en menú y README.
- Rendimiento: división de código por pantalla, carga diferida del arte, presupuesto de bundle, caché con service worker (modo offline opcional).
- Despliegue estático (GitHub Pages u otro) con CI: tests + typecheck + build + e2e en cada push a `main`.
- Telemetría mínima opcional y solo con consentimiento; informe de errores local (botón «copiar diagnóstico»).
- Salida: versión 1.0 etiquetada, notas de versión, guía de contribución.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Más contenido rompe el equilibrio | Lotes pequeños + bot + cotas en `tests/balance` |
| Arte de Riot impide publicar | Decidirlo en fase 0 y planificar arte propio en fase 4 |
| Cambios de forma en `Expedition` invalidan guardados | `SAVE_VERSION` + migración + fixtures (fase 1) |
| Acciones nuevas fuera del diario rompen la reanudación | Test que recorre `JOURNAL_ACTIONS` por cada acción nueva |
| Alcance de contenido excesivo | Reducir la tabla de objetivos; el orden de fase 2 permite cortar en cualquier punto |

## Decisiones que necesito del usuario

1. ¿Se publicará (arte propio) o es de uso personal (arte enlazado)?
2. Objetivos de contenido de la fase 2 y de dificultad (humano medio en A0).
3. ¿Audio y tutorial dentro del alcance de 1.0?
4. ¿Desafíos diarios / multijugador asíncrono sí o no?
