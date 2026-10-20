# Revisión de las decisiones de la fase 1

**Fecha:** 2026-10-20 · **Estado:** respuestas del usuario en chat, **implementadas** el mismo día (el usuario pidió hacerlo todo sin parar). Sustituye a las marcas **[mi decisión]** de las specs `react-fase1`, `comerciante-eventos`, `gear`, `reliquias`, `pesadilla`, `metaprogresion` y `tesoro-santuario`. Cada cambio necesita su propia spec y plan antes de implementarse.

## Se queda como está

- Stack, store, pegamento run→combate y guardado (decisiones técnicas, sin efecto de juego).
- **Descanso:** una acción por hoguera, curar 30 % a todos, −20 de estrés a todos o forjar una carta.
- **Cartas:** las 32 actuales valen como provisionales; las originales con robar/convertir recursos vuelven cuando el motor tenga esos efectos.
- **Enemigos actuales:** se quedan (lobo, centinela, Gromp, Picoaguzado, Heraldo, Viego).
- **Eventos:** los 5 actuales y su formato; se amplían en la fase de contenido.
- **Reliquias:** las 9 actuales, al azar sin repetir y sin límite; se amplían en la fase de contenido.

## Cambios pedidos

| # | Tema | Pedido del usuario | Notas |
|---|---|---|---|
| 1 | Mapa | **~15 pisos** (como un acto de Slay the Spire) | Reequilibrar enemigos, botín y reparto de nodos con el bot |
| 2 | Reparto de nodos | Lo decide Claude | Con 15 pisos: comerciantes, eventos, Tesoros y Santuarios por todo el mapa salvo el primer piso y los previos al jefe; mostrar el resultado al usuario |
| 3 | Enemigos nuevos | Más variedad del LoL, sobre todo jefes: **dragones elementales, Dragón Anciano y Barón Nashor** | Dónde se colocan, por decidir |
| 4 | Comerciante | **Como Slay the Spire:** más cartas, **3 reliquias**, 3 pociones y eliminar cartas | Hoy: 3 cartas, 3 pociones, 2 objetos, tratar herida y eliminar. Por confirmar si siguen los objetos y «tratar herida» |
| 5 | Huecos de gear | **Los mismos que en el LoL** (6 objetos) | Hoy: arma y armadura. Por concretar si hay restricción por tipo y si se añade abalorio |
| 6 | Equipo inicial | **Objeto inicial elegible desde el menú principal** según la build | Se compra/desbloquea fuera de la run (ver 9) |
| 7 | Gear en el botín | **Más gear** | Hoy: élite 3 opciones, jefe 3, normal 20 % |
| 8 | Dificultad | **Una sola dificultad** que se aumenta por niveles **como la Ascensión de Slay the Spire** | Sustituye a Normal/Pesadilla; la muerte permanente puede ser uno de los niveles |
| 9 | Metaprogresión | **Desbloqueos, no estadísticas** | Las Esquirlas desbloquean cartas, reliquias, campeones y objetos iniciales en lugar de Vigor/Provisiones/Cinturón/Maestría. *Interpretación de Claude:* el objeto inicial del punto 6 es uno de esos desbloqueos |
| 10 | Tesoro | **Como Slay the Spire:** un cofre que da siempre una reliquia, sin elegir | |
| — | Santuario | Sin cambios | |

## Decisiones de Claude al implementarlo (pendientes de revisar)

| # | Decisión | Dónde |
|---|---|---|
| 1 | 15 pisos de 2–4 nodos. Piso 1 de combates, piso 8 entero de tesoros (como Slay the Spire), piso 14 de descanso y 15 el jefe. Élites desde el piso 5. Niebla reajustada al mapa largo: +5 por nodo, +9 por élite, −10 al avivar; la Lámpara resta 2 | `engine/expedition.ts`, `config.ts` |
| 2 | Reparto: comerciantes, eventos y santuarios (máx. 2) por todo el mapa salvo el primer piso y los dos últimos; siempre un comerciante en los pisos 3–7 y otro en 9–13, y un evento en 2–7 | `generateMap` |
| 3 | Tesoro: una reliquia no repetida, sin elegir (oro si ya se tienen todas) | `engine/chest.ts` |
| 4 | Comerciante: 6 cartas, 3 reliquias (120 / 170 / 230 según rareza), 3 pociones y eliminar carta. **Ya no vende objetos ni «Tratar herida»** (las heridas se tratan en el descanso) | `engine/shop.ts` |
| 5 | Gear: 6 huecos sin restricción de tipo (sin regla de botas). Con los 6 llenos, hay que elegir cuál sustituir. 28 objetos: 4 iniciales, 7 comunes, 11 raros y 6 legendarios. Los combates normales sueltan gear el 45 % de las veces (antes 20 %) | `data/gear.ts`, `engine/gear.ts` |
| 6 | Ascensión: 10 niveles (lista en `data/ascension.ts`); el 10 es la muerte permanente. Ganar en el nivel más alto desbloqueado desbloquea el siguiente. Las Esquirlas suben un 10 % por nivel | `data/ascension.ts`, `engine/meta.ts` |
| 7 | Desbloqueos: empiezan bloqueados 4 objetos iniciales (30), 4 cartas (60: Llamarada solar, Camino del Errante, Fulgor final, Equinoccio) y 3 reliquias (Emblema del asalto y Cuenco de plata 60, Fragmento del Vacío 90). El objeto inicial se elige por campeón en Equipo del menú. **No hay campeones que desbloquear** (solo existen 4) | `data/unlocks.ts` |
| 8 | Dragones de élite: infernal, oceánico, de montaña y de nube (los de hextech y químtech no tienen icono en CommunityDragon). Jefes: Viego, Dragón anciano y Barón Nashor, sorteados de momento | `data/enemies.ts` |
| 9 | Los guardados de expedición anteriores (v4/v5) no se migran: se apartan como dañados. El progreso permanente v1 sí se migra y devuelve las Esquirlas gastadas en mejoras | `save/*` |
