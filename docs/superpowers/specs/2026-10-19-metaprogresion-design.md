# Fase 5b — Metaprogresión: Equipo, Mejoras y Archivo

**Fecha:** 2026-10-19. Implementa §14 de `CLAUDE_CODE_SPEC.md`. Decidido por Claude por delegación del usuario; lo marcado **[mi decisión]** está pendiente de revisión.

## Intención

Que cada expedición, gane o pierda, deje algo: **Esquirlas** para mejoras permanentes moderadas y un **Archivo** que recuerda lo visto. Sin hacer trivial el juego (spec §14) y sin servicios externos: todo local, versionado y con recuperación de datos dañados.

## Alcance

**Entra:** guardado persistente entre runs (`meta`) separado del guardado de la run; Esquirlas por expedición; pantalla **Mejoras** (4 mejoras con 3 niveles); pantalla **Archivo** (campeones, bestiario e historial); pantalla **Equipo** del menú (fichas de campeones y su colección de cartas, solo lectura); los tres botones del menú dejan de estar deshabilitados.

**No entra:** desbloqueo de campeones nuevos (solo hay 4), logros con recompensa, reiniciar progreso con confirmación avanzada (sí hay botón de borrar con confirmación), estado de campeones/heridas entre runs (la spec lo deja a «reglas de campaña»; aquí cada expedición empieza con el equipo sano).

## Decisiones **[mi decisión]**

1. **Esquirlas al acabar una expedición** (una sola vez): `3 × pisos alcanzados + 2 × combates ganados + 5 × élites + 40 si victoria`, ×1,5 en Pesadilla (redondeado), y un mínimo de 5. La retirada cuenta como cualquier otra salida (no se castiga el progreso), **salvo si no se ganó ningún combate: entonces 0** (si no, entrar y retirarse al instante daría Esquirlas sin jugar).
2. **Mejoras** (3 niveles; los efectos se aplican al empezar la expedición, no cambian reglas):

| Mejora | Nivel 1 / 2 / 3 | Coste (Esquirlas) |
|---|---|---|
| Vigor | +2 / +3 / +4 de vida máxima a cada campeón | 40 / 80 / 120 |
| Provisiones | +15 / +30 / +45 de oro inicial | 30 / 60 / 90 |
| Cinturón | Empiezas con 1 / 2 / 3 pociones de vida | 35 / 70 / 105 |
| Maestría | 1 / 2 / 3 cartas del mazo inicial ya mejoradas | 50 / 100 / 150 |

3. **Techo [mi decisión]:** medido con el bot, **+15 de vida fue la ventaja más potente** (por sí sola pasaba del 27 % al 56 % de victorias), así que Vigor es pequeño a propósito. Con todo al máximo el bot pasa de ~26 % a ~60 % (Normal): sube mucho, pero cuesta ~465 Esquirlas (unas 10 expediciones) y Pesadilla existe para quien lo domine. Un test acota que el máximo nunca llegue al 75 %.
4. **Archivo:** campeones (ficha y cartas), bestiario (cuántas veces visto y derrotado cada enemigo; lo no visto sale como «???») e historial (expediciones, victorias, derrotas, retiradas, mejor piso, muertes de Pesadilla).
5. **Guardado:** clave propia (`shattered-runeterra:meta`), `version` propia, validación y copia de seguridad si está dañado; si no hay almacenamiento el juego funciona con progreso de la sesión.

## Criterios de aceptación

- `npm test`, `npm run typecheck`, `npm run build` en verde.
- Tests de las Esquirlas, de comprar mejoras (coste, nivel máximo, saldo), de aplicar mejoras al crear la expedición, del Archivo y del guardado dañado.
- Las Esquirlas se ganan una sola vez por expedición aunque se recargue la página.
