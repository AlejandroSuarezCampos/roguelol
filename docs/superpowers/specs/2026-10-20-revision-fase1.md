# Revisión de las decisiones de la fase 1

**Fecha:** 2026-10-20 · **Estado:** respuestas del usuario en chat. Sustituye a las marcas **[mi decisión]** de las specs `react-fase1`, `comerciante-eventos`, `gear`, `reliquias`, `pesadilla`, `metaprogresion` y `tesoro-santuario`. Cada cambio necesita su propia spec y plan antes de implementarse.

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
