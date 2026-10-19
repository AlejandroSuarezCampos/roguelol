# PROMPT PARA CLAUDE DESIGN
## Proyecto: League of Legends: Shattered Runeterra

Actúa como **director/a de arte, diseñador/a UX/UI de videojuegos y diseñador/a de sistemas visuales**. Diseña la interfaz de un roguelike táctico web para escritorio llamado provisionalmente **League of Legends: Shattered Runeterra**, inspirado en la legibilidad estratégica de *Slay the Spire*, la presentación sombría de *Darkest Dungeon* y la fantasía visual de Runaterra. No copies literalmente interfaces, ilustraciones ni assets de esos juegos.

Tu trabajo en esta fase es **diseñar la interfaz**, no implementar el motor de combate. El diseño debe poder entregarse después a Claude Code para construirlo en React + TypeScript.

## 1. Fantasía y tono

El jugador dirige una expedición de cuatro campeones por una Runaterra fracturada y peligrosa. Cada combate desgasta al equipo: quedan heridas, estrés, recursos consumidos y decisiones difíciles. La interfaz debe transmitir:
- Fantasía oscura, aventura y peligro, sin sacrificar claridad.
- Información táctica legible de un vistazo.
- Jerarquía visual fuerte entre acciones disponibles, intenciones enemigas, estado del equipo y recompensas.
- Sensación de un juego premium, no de un dashboard empresarial ni de una web genérica.
- Estética inspirada en Runaterra: metal envejecido, pergamino, piedra, magia arcana, acentos de luz y materiales diferenciados.

## 2. Dirección visual

Propón una identidad visual consistente:
- Fondo oscuro y profundo, con superficies de piedra/metal y paneles bien separados.
- Colores de estado accesibles y semánticos: vida, bloqueo, estrés, heridas, magia, peligro y selección. No dependas solo del color: acompaña con iconos, etiquetas o formas.
- Tipografía de fantasía para títulos y una sans-serif muy legible para números, reglas y texto de cartas.
- Bordes, sombras, ornamentos y partículas solo cuando ayuden a jerarquía; evita sobrecargar el área táctica.
- Iconografía consistente para AD, AP, crítico, armadura, resistencia mágica, penetración, robo de vida, velocidad de ataque, aceleración, energía, bloqueo, marca, quemadura, carga y desplazamiento.
- Cartas con coste, tipo, propietario, rareza, objetivo/alcance, efecto y estado de mejora visibles.
- Equipo y reliquias visualmente distintos: el gear pertenece a un campeón; las reliquias afectan a la expedición/equipo.
- Estados de foco, hover, seleccionado, deshabilitado, objetivo válido/ilegal, advertencia y confirmación.

Evita microtexto. En el combate, la legibilidad tiene prioridad sobre la decoración.

## 3. Pantallas que debes diseñar

Diseña un flujo completo, no una colección de pantallas inconexas.

### A. Menú principal / base ligera
Debe tener cuatro entradas principales:
1. **Equipo**: selección de campeones, heridas, estrés, gear y mazos.
2. **Mejoras**: mejoras de cartas, desbloqueos y progresión permanente moderada.
3. **Archivo**: campeones, cartas, reliquias, gear, enemigos, jefes y logros.
4. **Expedición**: región, dificultad, equipo y comienzo de run.

La base debe ser funcional y ligera; no debe convertirse en una ciudad explorable.

### B. Preparación de expedición
- Selección de región y dificultad.
- Equipo de cuatro campeones.
- Resumen de roles y sinergias.
- Heridas/estrés actuales y equipo equipado.
- Resumen claro de las reglas de dificultad.
- Botón principal para comenzar, con advertencias de consecuencias irreversibles cuando corresponda.

### C. Mapa de expedición
- Mapa ramificado estilo roguelike, con nodos conectados y caminos alternativos.
- Nodos: combate normal, élite, jefe, descanso, comerciante, evento, tesoro y santuario.
- Nodo actual, visitados, disponibles y bloqueados deben diferenciarse sin ambigüedad.
- Mostrar la región y el avance hacia el jefe.
- La primera región del prototipo es **Islas de la Sombra**.

### D. Combate táctico — pantalla más importante
Diseña esta pantalla con máximo detalle. Debe mostrar:
- Cuatro posiciones aliadas y cuatro enemigas; la posición 1 es la primera fila y la 4 la retaguardia.
- Campeones con retrato, nombre, HP actual/máximo, bloqueo, estrés, heridas y posición.
- Enemigos con HP, estados, posición e **intención visible** para su próximo turno.
- Mano compartida de cinco cartas por turno, no una mano por campeón.
- Cada carta indica a qué campeón pertenece, coste, tipo, objetivo/alcance, texto de efecto, rareza y si está mejorada.
- Energía compartida del equipo; inicialmente 3 por turno.
- Botón de terminar turno y controles de accesibilidad/ayuda.
- Estados claros al seleccionar carta y después seleccionar objetivo; resaltar objetivos legales y explicar por qué uno es ilegal.
- Feedback visual de daño, bloqueo, curación, marcas, quemadura, carga, desplazamientos, críticos, derribos y efectos de reliquias.
- Un panel compacto para reliquias de la expedición y otro para el gear del campeón seleccionado, sin tapar el campo de batalla.
- El bloqueo se reinicia al comienzo del siguiente turno del equipo.
- Al terminar el turno del jugador, se resuelven las intenciones enemigas visibles.
- Los campeones a 0 HP quedan derribados y no actúan; no reciben curación normal, salvo que una carta/consumible permita reanimarlos.

### E. Recompensas
- Mostrar recompensa principal y recompensas opcionales por separado.
- Elección entre cartas, gear, reliquias, oro, consumibles o recuperación cuando proceda.
- Comparación visual de gear nuevo frente al equipado.
- La decisión debe mostrar claramente qué se gana, qué se pierde y si una elección es irreversible.

### F. Descanso
Opciones visualmente diferenciadas:
- Recuperar vida.
- Reducir estrés.
- Tratar una herida.
- Obtener una mejora temporal.
- Prepararse para el jefe.
Mostrar coste, alcance y consecuencia de cada opción.

### G. Comerciante
- Comprar/vender cuando esté implementado.
- Separar cartas, gear, consumibles y servicios.
- Mostrar oro actual, precio, comparación y requisitos.

### H. Eventos / santuario
- Texto narrativo breve y atmosférico.
- Decisiones de riesgo/recompensa, costes y consecuencias comprensibles.
- Ejemplo: reliquia del Vacío: conservarla y ganar poder con estrés adicional, purificarla gastando recursos o abandonarla.

### I. Pantalla de equipo
- Ficha de campeón con estadísticas, mazo, heridas, estrés, rasgos y dos espacios de gear en el MVP.
- Permitir inspeccionar cartas y equipo sin tener que iniciar una expedición.
- Comparar builds y explicar qué estadísticas escalan con las cartas del campeón.

### J. Resultado de expedición
- Victoria, derrota o retirada.
- Supervivientes, derribados, heridas nuevas, cambios de estrés, botín conservado y recompensas perdidas.
- En dificultad Pesadilla, advertencias y resultado de muerte permanente según reglas visibles.
- Estadísticas de la run y desbloqueos.

## 4. Sistemas de juego que la interfaz debe reflejar

### Campeones MVP
- **Leona**: tanque/control, protección, bloqueo, provocación y aturdimientos.
- **Yasuo**: daño, cargas, crítico, combos y desplazamiento.
- **Lux**: daño mágico, marcas, área y control.
- **Soraka**: curación, estabilización del estrés y apoyo.

### Builds
El juego combina tres pilares:
1. **Cartas**: acciones tácticas.
2. **Gear**: equipamiento individual que modifica estadísticas y puede tener pasivas.
3. **Reliquias**: modificadores de expedición que alteran reglas y disparan efectos.

En el MVP hay dos espacios de gear por campeón y un límite de seis reliquias por expedición. La interfaz debe distinguir claramente el gear individual de las reliquias globales.

Estadísticas que puede haber cuando sean relevantes: AD, AP, velocidad de ataque, probabilidad de crítico, daño crítico, penetración, vida máxima, armadura, resistencia mágica, robo de vida y aceleración de habilidades. No todos los campeones usan todas las estadísticas.

Ejemplos de gear para representar visualmente:
- Filo infinito: AD y daño crítico; sinergia con críticos.
- Rabadon: AP y escalado mágico.
- Warmog: vida máxima y efectos defensivos que pueden escalar con vida.
- Guinsoo: velocidad de ataque y efectos al golpear.

Ejemplos de reliquias:
- Corazón incandescente: recuperar algo de vida al ganar un combate.
- Emblema del asalto: jugar tres ataques en un turno da una bonificación ofensiva.
- Fragmento del Vacío: efectos extra al consumir marcas/cargas a cambio de estrés.
- Estandarte de la compañía: jugar cartas de tres campeones diferentes concede bloqueo al último.

### Estrés y heridas
El estrés es persistente entre combates, de 0 a 100:
- 0–24 sereno.
- 25–49 inquieto.
- 50–74 agobiado.
- 75–99 al límite.
- 100 crisis.
La UI debe mostrar tanto la cifra como el estado. Las crisis pueden ser pánico, egoísmo, desesperación o ira. No presentar consecuencias aleatorias ocultas.

### Dificultad
MVP con Normal y Pesadilla:
- Normal: los campeones derribados sobreviven al combate, pero pueden quedar con heridas graves.
- Pesadilla: muerte permanente según reglas explícitas, menos descansos y recursos más escasos, enemigos más difíciles.
Las consecuencias irreversibles deben explicarse antes de iniciar y antes de confirmar acciones de alto riesgo.

## 5. Diseño adaptable y componentes

Prioridad: escritorio 16:9 y resoluciones habituales de PC. Diseña también una versión funcional para ventanas más estrechas, sin intentar convertir el juego táctico en una experiencia móvil completa.

Usa componentes visuales reutilizables para:
- ChampionPanel
- EnemyPanel / EnemyIntent
- Card / CardHand
- EnergyCounter
- StatusIcon / StatusTooltip
- GearSlot / GearComparison
- RelicSlot / RelicTooltip
- ExpeditionNode / ExpeditionMap
- RewardChoice
- ConfirmationModal
- StressMeter / WoundBadge

Entrega:
1. Un sistema visual con paleta, tipografía, espaciado, radios, bordes, sombras, iconos y estados.
2. Wireframes o diseños de alta fidelidad de todas las pantallas.
3. La pantalla de combate en detalle, con estados de selección de carta y objetivo.
4. Variantes de estado: campeón herido, estrés alto, derribado, carta ilegal, intención enemiga peligrosa, reliquia activada, gear mejorable.
5. Un flujo clicable/prototipo navegable si la herramienta lo permite.
6. Una guía de implementación: componentes, jerarquía, tamaños aproximados y comportamiento de interacción.
7. Assets de muestra o placeholders claramente identificados; no uses arte oficial pirateado ni inventes que los placeholders son finales.

## 6. Reglas de UX no negociables

- No esconder información esencial en hover.
- El texto de las cartas debe seguir siendo legible al tener varias cartas en mano.
- Mostrar siempre energía disponible y coste de la carta.
- Las intenciones enemigas tienen que ser visibles y entendibles.
- La información crítica de HP, bloqueo, estrés y derribo nunca debe depender solo de color.
- No mostrar todos los números de estadísticas a la vez en combate: usa paneles contextuales para detalles.
- Las consecuencias de muerte permanente deben ser explícitas.
- La UI no puede inventar reglas que no aparecen en esta especificación.
- Mantener un aspecto oscuro y atmosférico sin comprometer contraste ni accesibilidad.

Empieza proponiendo una dirección visual y el flujo de navegación; después desarrolla primero la pantalla de combate y luego el resto. No des por finalizado el diseño hasta que el flujo completo y los estados principales sean coherentes.
