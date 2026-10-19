# Game Design — Shattered Runeterra

## High concept
Un roguelike táctico de expediciones en Runaterra. El jugador lleva cuatro campeones, cada uno con mazo propio, y decide cómo sobrevivir a una cadena de combates, eventos y descansos. Las victorias dejan desgaste: estrés, heridas y recursos gastados.

## Tres pilares de build
- **Cartas:** decisiones tácticas turno a turno.
- **Gear:** equipo individual que modifica estadísticas y pasivas.
- **Reliquias:** reglas globales de expedición que generan sinergias.

## Bucle principal
Preparar equipo → seleccionar región/dificultad → recorrer mapa ramificado → combatir/resolver eventos → elegir recompensas → gestionar estrés/heridas/gear → derrotar al jefe o retirarse → revisar resultados y desbloqueos.

## Combate
- Cuatro posiciones aliadas y enemigas; 1 delante, 4 atrás.
- Energía compartida: 3 por turno.
- Mano compartida de cinco cartas.
- Cartas asociadas a un campeón.
- Intenciones enemigas visibles.
- Bloqueo temporal que se reinicia al inicio del siguiente turno aliado.
- Derribo a 0 HP; reanimación solo mediante efectos explícitos.
- Las posiciones y alcances afectan a qué objetivos se pueden seleccionar.

## Campeones iniciales
- Leona: tanque/control.
- Yasuo: daño, combos y crítico.
- Lux: daño mágico, marcas y control.
- Soraka: curación y apoyo al estrés.

## Progresión de builds
Estadísticas soportadas: AD, AP, velocidad de ataque, probabilidad de crítico, daño crítico, penetración, HP máximo, armadura, resistencia mágica, robo de vida y aceleración de habilidades. Cada campeón aprovecha un subconjunto.

Gear MVP: dos espacios por campeón (arma y armadura). Reliquias: máximo seis por expedición. Las reliquias deben cambiar reglas y producir sinergias, no limitarse a bonificaciones planas.

## Estrés y heridas
Estrés de 0 a 100:
- 0–24 sereno.
- 25–49 inquieto.
- 50–74 agobiado.
- 75–99 al límite.
- 100 crisis.

El estrés persiste entre combates. Las crisis iniciales son deterministas y visibles. Las heridas tienen efectos de juego concretos.

## Dificultades
- Normal: el derribado sobrevive, pero queda con herida grave.
- Pesadilla: si termina el combate derribado, muere permanentemente. Menos descansos, recursos más escasos y enemigos más duros. La regla se explica antes de empezar.

## Primera región
Islas de la Sombra. Regiones futuras posibles: Freljord, Shurima, Vacío y Noxus.

## Contenido mínimo
4 campeones, 32 cartas iniciales, 2 enemigos básicos, 1 jefe, 1 región, 12–15 nodos, todos los tipos de nodo representados, gear, reliquias, recompensas, retirada, guardado local y un flujo completo de victoria/derrota.
