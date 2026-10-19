# CLAUDE CODE SPEC — League of Legends: Shattered Runeterra
## Especificación principal de producto e implementación
**Objetivo:** construir un prototipo web jugable del roguelike táctico descrito aquí, usando como referencia visual la interfaz final aprobada en Claude Design. Este documento es el contrato funcional. No implementes sistemas solo porque una maqueta los sugiera si contradicen estas reglas.

---

## 0. Instrucciones para Claude Code (Opus 5.5)

Trabaja como **ingeniero principal de gameplay y frontend**, con criterio de arquitectura y pruebas.

Antes de editar archivos:
1. Lee este documento entero y revisa todos los artefactos finales de Claude Design que se te hayan entregado.
2. Resume arquitectura, riesgos y decisiones que faltan.
3. Propón un plan incremental con entregables verificables.
4. No reescribas el proyecto entero en una sola operación.
5. Si la interfaz de diseño incluye una función no especificada, no inventes reglas: anótala y propone una interpretación mínima antes de implementarla.

Implementa el motor de juego separado de React/UI. Las reglas de combate, estadísticas, cartas, gear, reliquias, estrés y expedición deben ser deterministas y testeables. Evita lógica de combate dentro de componentes visuales.

Cuando termines cada fase:
- Ejecuta tests y lint/typecheck disponibles.
- Resume archivos cambiados y comportamiento implementado.
- Explica pruebas manuales necesarias y cualquier deuda técnica.
- No afirmes que algo funciona si no lo has ejecutado.

## 1. Visión del producto

**League of Legends: Shattered Runeterra** es un roguelike táctico web de expediciones por una Runaterra fracturada, que combina:
- Combate por turnos y construcción de mazos, con claridad estratégica tipo Slay the Spire.
- Desgaste, heridas, estrés, posiciones y gestión del grupo, con inspiración de Darkest Dungeon.
- Campeones, estadísticas y builds inspirados en League of Legends.
- Reliquias de expedición que alteran reglas y gear individual que cambia estadísticas y estilo de juego.

La run es el centro del juego. La base entre runs debe ser ligera, no una ciudad compleja.

El prototipo es primero para escritorio. No requiere backend, multijugador ni cuentas.

## 2. Stack y arquitectura

Stack recomendado:
- Vite
- React
- TypeScript en modo estricto
- CSS modular o una solución de estilos consistente con los artefactos de diseño
- Vitest para tests
- localStorage para guardado local, detrás de una capa `saveManager`

No añadas dependencias grandes sin justificarlo. No necesitas Canvas para el MVP: usa DOM/CSS para la UI. Si Claude Design entrega código generado, intégralo de forma ordenada, conserva los patrones útiles y evita sustituirlo todo sin razón.

Arquitectura orientativa:

```text
src/
  app/
    App.tsx
    routes.ts
  data/
    champions.ts
    cards.ts
    gear.ts
    relics.ts
    enemies.ts
    regions.ts
    events.ts
  engine/
    types.ts
    rng.ts
    stats.ts
    damage.ts
    effects.ts
    status.ts
    cards.ts
    combat.ts
    stress.ts
    rewards.ts
    expedition.ts
    difficulty.ts
  state/
    gameStore.ts
    selectors.ts
  save/
    saveManager.ts
  components/
    ChampionPanel.tsx
    EnemyPanel.tsx
    EnemyIntent.tsx
    Card.tsx
    CardHand.tsx
    EnergyCounter.tsx
    StatusIcon.tsx
    GearSlot.tsx
    RelicSlot.tsx
    ExpeditionMap.tsx
    RewardChoice.tsx
  screens/
    MainMenuScreen.tsx
    PartySetupScreen.tsx
    TeamScreen.tsx
    ArchiveScreen.tsx
    ExpeditionMapScreen.tsx
    BattleScreen.tsx
    EventScreen.tsx
    RestScreen.tsx
    MerchantScreen.tsx
    RewardScreen.tsx
    ResultsScreen.tsx
  styles/
  tests/
```

Esta estructura es una guía, no una obligación rígida. Ajusta nombres si los artefactos de interfaz o la estructura real lo justifican, pero mantén la separación entre `data`, `engine`, `state`, `save` y UI.

## 3. Alcance exacto del MVP

Construir una experiencia jugable completa de principio a fin, no una maqueta estática:

- Menú/base ligera con Equipo, Mejoras, Archivo y Expedición.
- Cuatro campeones: Leona, Yasuo, Lux y Soraka.
- Un equipo de cuatro campeones en cada run.
- 8 cartas iniciales por campeón (32 definiciones iniciales).
- Combate táctico con cuatro posiciones por bando.
- Mano compartida de cinco cartas por turno.
- Energía compartida: 3 al comienzo del turno del equipo.
- Dos enemigos básicos y un jefe final.
- Una región: Islas de la Sombra.
- Mapa ramificado de 12–15 nodos.
- Nodos: combate, élite, jefe, descanso, comerciante, evento, tesoro y santuario. Si el contenido inicial no permite una versión completa de todos, crea al menos un ejemplo funcional de cada tipo o documenta explícitamente qué queda aplazado.
- Gear: dos espacios por campeón.
- Reliquias: máximo seis por expedición.
- Estrés persistente y heridas.
- Dificultades Normal y Pesadilla.
- Recompensas, retirada, victoria y derrota.
- Guardado local básico.
- Tests del motor para daño, alcance/posiciones, cartas, estados, reliquias, gear, estrés y consecuencias de dificultad.

No es parte del MVP: multijugador, backend, login, PvP, campaña narrativa larga, todas las regiones, tienda de monetización, voces o animaciones complejas.

## 4. Principios de diseño

1. **Reglas deterministas:** sin tiradas ocultas arbitrarias. Si se usa azar de combate, debe depender de un RNG con semilla y poder reproducirse en tests.
2. **Datos separados de lógica:** campeones, cartas, enemigos, gear, reliquias y eventos definidos como datos.
3. **Efectos declarativos:** no codificar un `if` específico para cada carta dentro del motor.
4. **Interfaz no autoritativa:** UI presenta el estado; el motor valida y resuelve acciones.
5. **Telegráfica:** las intenciones enemigas se muestran antes de terminar el turno.
6. **Sin recursión de triggers:** una reliquia no debe activarse recursivamente por su propio efecto salvo que se permita explícitamente y se limite.
7. **Consecuencias visibles:** especialmente muerte permanente en Pesadilla.
8. **Balance inicial antes que cantidad:** mejor pocas mecánicas coherentes que docenas de keywords incompletas.

## 5. Modelo de combate

### 5.1 Posiciones
Cada bando tiene cuatro posiciones:
- 1 = primera fila.
- 2 = segunda posición.
- 3 = tercera posición.
- 4 = retaguardia.

Las cartas declaran sus reglas de alcance. Un ataque cuerpo a cuerpo normal podría alcanzar las posiciones delanteras; una habilidad a distancia puede alcanzar cualquier posición. Define el alcance por carta como datos y prueba cada regla. Los desplazamientos deben actualizar posiciones de forma determinista y gestionar espacios ocupados de forma explícita.

### 5.2 Turno
- Al empezar el turno del equipo, la energía vuelve a 3 (MVP).
- El bloqueo temporal de los aliados se reinicia al comienzo del siguiente turno del equipo.
- Se roba hasta disponer de una mano compartida de cinco cartas, respetando las reglas de robo y descartes.
- El jugador juega cartas hasta quedarse sin energía o decidir terminar.
- Al terminar el turno, se resuelven las intenciones enemigas visibles en un orden definido.
- Después se inicia el turno del equipo, se refresca energía, bloqueo y robo.
- La primera implementación debe definir inequívocamente si la mano no jugada se descarta al final del turno. Para el MVP: descartar las cartas restantes y robar cinco al inicio del siguiente turno, salvo que una carta diga lo contrario.
- Si un bando no tiene unidades activas, comprobar victoria/derrota inmediatamente tras resolver el efecto actual.

### 5.3 Energía y mano
- Energía inicial compartida: 3.
- Mano compartida de 5 cartas.
- Las cartas pertenecen a un campeón; solo pueden jugarse si ese campeón está activo y se cumplen requisitos de posición/objetivo.
- Para evitar que un campeón monopolice la mano, empieza con un límite suave de tres cartas por campeón y turno. Debe ser una regla explícita, fácil de modificar y comunicada en UI. Si hace falta, ajusta durante balance, pero no ocultes el límite.
- Las cartas sin objetivo deben declarar `targeting: "none"`.

### 5.4 Bloqueo y daño
- El bloqueo absorbe daño antes de HP.
- El bloqueo temporal se elimina en el siguiente inicio de turno aliado.
- Los efectos de daño deben usar una única ruta de cálculo.
- El daño debe permitir escalado por AD/AP, crítico, penetración y defensas cuando aplique.
- No apliques estadísticas que no correspondan al tipo de efecto.
- Define el orden de cálculo y cúbrelo con tests. Orden recomendado:
  1. Calcular daño base y escalados.
  2. Aplicar modificadores aditivos de fuente/objetivo.
  3. Resolver crítico si el efecto puede criticar.
  4. Aplicar penetración a la defensa pertinente, con mínimo cero.
  5. Aplicar armadura o resistencia mágica usando una fórmula común documentada.
  6. Redondear según regla única (daño final mínimo 0; usa enteros en HP).
  7. Consumir bloqueo y después HP.
- Fórmula de defensa inicial recomendada: `dañoMitigado = daño * 100 / (100 + defensa)` para defensa positiva; para defensa negativa usa una fórmula simétrica documentada o limita defensa efectiva a cero en el MVP.
- Crítico y multiplicadores deben ser configurables; no hardcodear los mismos valores en múltiples funciones.

### 5.5 Derribo
- A 0 HP, un campeón queda `downed = true`.
- No actúa y no recibe curación normal.
- Solo una carta/consumible con efecto explícito `revive` puede reanimarlo.
- Normal: al acabar el combate, el derribado sobrevive pero recibe una herida grave y queda con HP reducido al recuperarse.
- Pesadilla: la muerte permanente se aplica conforme a una regla visible y definida. MVP recomendado: si el campeón sigue derribado al finalizar el combate, muere permanentemente; si es reanimado antes de acabar, sobrevive, pero recibe una herida grave. Explicar esta regla antes de iniciar la run.
- No decidir la muerte mediante una moneda oculta ni por probabilidad no mostrada.

## 6. Campeones y estadísticas

Los campeones tienen estadísticas base, rol, cartas iniciales, mazo, HP, posición, estrés, heridas, equipo y rasgos.

### 6.1 Campeones MVP
- **Leona**: tanque/control; bloqueo, protección, provocación, aturdimientos.
- **Yasuo**: daño/combos/crítico; cargas, crítico, desplazamiento.
- **Lux**: AP/control; marcas, daño mágico de área y control.
- **Soraka**: curación y soporte; curación, estabilización de estrés y apoyo.

Cada campeón debe tener 8 cartas iniciales distintas o bien justificadas por variaciones. Los textos deben ser claros y las cartas deben poder expresarse con el sistema declarativo.

### 6.2 Estadísticas soportadas
- AD
- AP
- Attack Speed
- Crit Chance
- Crit Damage
- Penetration
- Max HP
- Armor
- Magic Resist
- Lifesteal
- Ability Haste

No todos los campeones deben aprovechar todas. Implementa un `StatBlock` extensible y evita convertir cada estadística en lógica UI independiente.

### 6.3 Orden de estadísticas
Como regla general:
`base stats + gear plano + bonificaciones planas` → modificadores porcentuales → límites y validación → cálculo de cada efecto de carta.

Debe existir una función central `getFinalStats(champion, gear, modifiers)`. Las estadísticas mostradas por la UI deben proceder del mismo resultado que usa el motor.

### 6.4 Builds
Las builds deben permitir cambiar estilo, no limitarse a sumar daño:
- Yasuo crítico: crítico, daño crítico, velocidad de ataque y cartas de combo.
- Lux AP: AP, aceleración y efectos de marca/área.
- Leona tanque: HP, armadura, resistencia mágica y bloqueo.
- Soraka soporte: AP/curación, reducción de estrés y sinergias defensivas.

## 7. Gear / equipamiento

- Gear es individual por campeón.
- Dos slots por campeón en el MVP.
- El gear puede modificar estadísticas y tener una pasiva.
- Puede aparecer como recompensa, botín de élite/jefe o compra.
- Debe permitir comparar el objeto encontrado con el equipado antes de reemplazarlo.
- Los efectos negativos son válidos, pero deben mostrarse de forma explícita.

Ejemplos de datos:
- Filo infinito: AD y daño crítico; pasiva orientada a críticos.
- Rabadon: AP y escalado mágico.
- Warmog: vida máxima y posible sinergia defensiva.
- Guinsoo: velocidad de ataque y efectos al golpear.

Estructura de datos orientativa:

```ts
type GearDefinition = {
  id: string;
  name: string;
  rarity: "common" | "rare" | "legendary";
  slot: "weapon" | "armor" | "accessory";
  statModifiers: Partial<StatBlock>;
  passive?: EffectDefinition[];
  drawbacks?: EffectDefinition[];
  tags: string[];
};
```

Si la definición del slot incluye más categorías que los dos slots visibles, decide y documenta qué categorías comparten espacio. MVP simple recomendado: `weapon` y `armor`, dejando accesorio para una futura ampliación.

## 8. Reliquias

- Las reliquias afectan al equipo/expedición, no son gear individual.
- Máximo de seis reliquias activas por run.
- Rarezas: común, rara y legendaria.
- Algunas se activan por evento y otras una vez por combate/turno.
- Deben alterar reglas, crear sinergias o cambiar decisiones; no ser solo +1 a una estadística.

Triggers sugeridos:
`onCombatStart`, `onTurnStart`, `onCardPlayed`, `onAttack`, `onCriticalHit`, `onChampionDowned`, `onCombatEnd`, `onNodeEntered`, `onStressThreshold`.

Ejemplos:
- Corazón incandescente: al ganar combate, recuperar una pequeña cantidad de vida.
- Emblema del asalto: jugar tres ataques en un turno concede carga/bonificación ofensiva.
- Fragmento del Vacío: consumir marcas/cargas produce un efecto adicional a cambio de estrés.
- Estandarte de la compañía: jugar cartas de tres campeones distintos en un turno concede bloqueo al último.

Cada trigger debe declarar:
- Evento que lo activa.
- Condición.
- Efectos.
- Límite de activación si corresponde.
- Si puede generar nuevos eventos.
- Si puede activarse por un efecto producido por otra reliquia.

Usa una cola de eventos o mecanismo equivalente para procesar efectos. Incluye límite de seguridad contra loops y tests para los triggers.

## 9. Sistema declarativo de cartas y efectos

Evita escribir lógica específica por carta en `combat.ts`. Las cartas deben definirse como datos. Puedes usar un DSL tipado o un conjunto de efectos tipados.

Ejemplo conceptual:

```ts
type EffectDefinition =
  | { type: "damage"; amount: number; scaling?: { stat: "ad" | "ap"; ratio: number }; damageType: "physical" | "magic" | "true"; target: "enemy" | "allEnemies" }
  | { type: "block"; amount: number; target: "self" | "ally" | "allAllies" }
  | { type: "heal"; amount: number; target: "self" | "ally" | "allAllies" }
  | { type: "applyStatus"; status: "mark" | "burn" | "charge" | "vulnerable" | "stun"; stacks: number; target: "enemy" | "self" | "ally" }
  | { type: "move"; direction: "forward" | "backward"; target: "self" | "ally" | "enemy" }
  | { type: "draw"; amount: number }
  | { type: "gainEnergy"; amount: number }
  | { type: "reduceStress"; amount: number; target: "self" | "ally" | "allAllies" }
  | { type: "revive"; hp: number; target: "ally" };
```

Este es un ejemplo inicial, no una lista cerrada. Ajusta tipos para que sean seguros y expresivos, pero evita `any`, funciones arbitrarias dentro de JSON y lógica eval. Valida los objetivos antes de ejecutar la carta. Cada carta debe tener:
- `id`, `name`, `ownerChampionId`
- `cost`, `rarity`, `cardType`
- `targeting` y reglas de alcance
- `effects`
- `keywords`
- `upgrade` opcional
- texto de descripción o descripción derivada cuando sea razonable.

Keywords iniciales: bloqueo, marca, quemadura, carga y desplazamiento; añade solo las necesarias para el MVP.

## 10. Estrés y heridas

### 10.1 Estrés
Cada campeón tiene estrés 0–100, persistente entre combates:
- 0–24: sereno.
- 25–49: inquieto.
- 50–74: agobiado.
- 75–99: al límite.
- 100: crisis.

Fuentes posibles: golpes fuertes, caída de un compañero, emboscadas, maldiciones y regiones hostiles. Se reduce mediante descansos, cartas de apoyo, eventos y algunas reliquias.

La crisis debe tener consecuencias deterministas en el MVP: pánico, egoísmo, desesperación o ira. No uses azar oculto. Si hay un componente aleatorio, usa RNG con semilla y muestra la regla relevante al jugador.

### 10.2 Heridas
- Heridas leves y graves persistentes entre combates y runs según el sistema de progresión que se implemente.
- Las heridas deben tener definición y efecto de juego explícitos, no ser solo etiquetas cosméticas.
- MVP mínimo: herida leve reduce una estadística o HP efectivo; herida grave tiene un impacto mayor y puede requerir tratamiento en descanso/base.
- No acumular efectos sin límite sin mostrarlos: establece topes o reglas de sustitución y documenta las interacciones.

## 11. Expedición y mapa

- Mapa ramificado de 12–15 nodos.
- Un nodo contiene `id`, `type`, conexiones siguientes, estado, recompensa potencial y contenido si corresponde.
- Tipos: combate normal, élite, jefe, descanso, comerciante, evento, tesoro y santuario.
- La región inicial es Islas de la Sombra.
- Regiones futuras posibles: Freljord, Shurima, Vacío y Noxus; no hacen falta en el MVP.
- El generador debe poder usar una semilla fija para tests y runs reproducibles.
- No permitir saltarse restricciones de conexión o entrar en nodos no accesibles.
- La run finaliza al vencer al jefe, si el equipo entero queda incapacitado o por retirada.
- La retirada conserva parte del oro/materiales, pero pierde la recompensa principal; la penalización aumenta en Pesadilla. Define valores concretos en configuración y muéstralos al jugador.

## 12. Dificultades

MVP:
- **Normal**: los campeones derribados sobreviven al terminar el combate, pero reciben herida grave.
- **Pesadilla**: si un campeón sigue derribado al acabar el combate, muere permanentemente; hay menos descansos, recursos más escasos y enemigos más duros.

Todos los modificadores deben residir en `difficulty.ts` o datos equivalentes. Evita repartir `if (difficulty === ...)` por toda la aplicación.

## 13. Recompensas, descanso, comerciante y eventos

- Recompensas posibles: carta, gear, reliquia, oro, consumible o recuperación.
- Las elecciones deben tener una consecuencia clara y no aplicar efectos dos veces.
- Descanso: elegir una acción entre recuperar HP, bajar estrés, tratar herida, mejora temporal o prepararse para el jefe.
- Comerciante: comprar gear/cartas/consumibles y servicios si están implementados; comprobar oro y requisitos en el motor.
- Eventos: opciones de riesgo/recompensa. Ejemplo: reliquia del Vacío — conservar y obtener poder a cambio de estrés, purificar gastando recursos o abandonar.
- Santuario: efecto poderoso con coste claro.
- Retirada: conserva parte del botín, pierde recompensa principal y aplica penalización según dificultad.

## 14. Metaprogresión y guardado

Menú base con:
1. Equipo.
2. Mejoras.
3. Archivo.
4. Expedición.

Persistente entre runs:
- Campeones y contenido desbloqueado.
- Mejoras permanentes moderadas.
- Archivo y logros.
- Estado de campeones/heridas según reglas de campaña.

Progreso de run:
- Cartas adquiridas/mejoradas.
- Reliquias y gear.
- Oro/consumibles.
- Estado de HP, estrés y heridas.

Las mejoras permanentes no deben hacer trivial el juego. Guardar con `saveManager`, versionar el formato y gestionar datos corruptos con recuperación segura. No guardar estado redundante que pueda recalcularse de forma fiable.

## 15. UX e integración con el diseño

Usa el diseño final de Claude Design como fuente visual:
- Respeta paleta, tipografía, espaciado, jerarquía, estados, proporciones y componentes.
- Mantén los datos críticos siempre visibles: HP, bloqueo, estrés, energía, costes de carta e intenciones enemigas.
- No dependas solo del color para indicar estados.
- En selección de carta, muestra objetivos legales e ilegales y explica por qué.
- No escondas información crítica exclusivamente en tooltips.
- En Pesadilla, explica la regla de muerte permanente antes de empezar y antes de acciones de riesgo.
- Si los artefactos de diseño son imágenes sin código, reconstruye la interfaz con componentes React reutilizables; no conviertas capturas en fondos estáticos.

## 16. Pruebas y criterios de aceptación

### Motor
- Daño físico/mágico/verdadero y mitigación por defensa.
- Crítico y penetración con orden de cálculo documentado.
- Bloqueo absorbe daño antes de HP y se reinicia en el momento correcto.
- Alcance/posición permite y bloquea objetivos correctamente.
- Desplazamiento actualiza posiciones sin estados imposibles.
- Campeón derribado no actúa ni recibe curación normal.
- Reanimación funciona solo con efecto explícito.
- Energía compartida y límite de cartas por campeón.
- Descarte/robo de mano al acabar/iniciar turno.
- Efectos de estados con duración definida.
- Gear modifica las estadísticas que se usan en cálculo y UI.
- Reliquias se activan solo con triggers válidos y no entran en loops.
- Estrés permanece entre combates y cambia de estado en umbrales correctos.
- Normal y Pesadilla aplican consecuencias distintas según reglas.
- Mapa respeta conexiones y puede reproducirse con semilla.
- Guardado/carga conserva el estado necesario y recupera de un save inválido sin bloquear el juego.

### Producto/UI
- Se puede empezar una run nueva desde el menú.
- Se puede navegar el mapa, entrar en combate, ganar/perder, obtener recompensa y avanzar hasta el jefe.
- Se pueden equipar/reemplazar objetos con comparación.
- Se pueden obtener reliquias y ver sus efectos.
- Se puede retirar una run y ver las consecuencias.
- Se puede terminar una run por victoria/derrota y ver resultados.
- Los controles de cartas, objetivos, terminar turno y confirmación funcionan con ratón y teclado básico.
- No hay errores TypeScript, tests fallidos ni warnings graves sin explicar.

## 17. Orden de implementación

Implementa en fases y no intentes completar todo de golpe.

### Fase 0 — Auditoría y plan
- Inspeccionar repo y diseño.
- Proponer plan, riesgos y decisiones abiertas.
- No tocar archivos hasta presentar el plan.

### Fase 1 — Esqueleto y sistema visual
- Vite/React/TypeScript.
- Tokens y componentes básicos según diseño.
- Navegación entre pantallas con datos temporales.
- Typecheck y tests configurados.

### Fase 2 — Tipos y motor de combate
- Tipos de dominio.
- Stats/damage/status.
- Cartas declarativas.
- Turnos, energía, mano, intenciones y posiciones.
- Tests del motor antes de pulir UI.

### Fase 3 — Campeones, gear y reliquias
- Datos iniciales de campeones y 32 cartas.
- Gear y stats.
- Sistema de triggers de reliquias con límites anti-loop.
- Tests de build y sinergias.

### Fase 4 — Flujo de expedición
- Mapa ramificado seeded.
- Nodos y eventos.
- Recompensas, descanso, comerciante, santuario y jefe.
- Condiciones de victoria, derrota y retirada.

### Fase 5 — Persistencia y metaprogresión
- Save versionado.
- Equipo, archivo y mejoras permanentes moderadas.
- Recuperación de datos inválidos.

### Fase 6 — Integración visual y pulido
- Reemplazar placeholders con arte disponible y autorizado.
- Estados de interacción, animaciones ligeras y feedback.
- Accesibilidad, responsive de escritorio y balance inicial.
- Pruebas de flujo completo.

## 18. Decisiones de balance provisionales

No bloquees la arquitectura por falta de valores finales. Centraliza estos valores en configuración:
- Energía por turno: 3.
- Tamaño de mano: 5.
- Límite suave: 3 cartas por campeón/turno.
- Slots de gear: 2 por campeón (arma + armadura).
- Máximo de reliquias: 6.
- Estrés: umbrales definidos en sección 10.
- Mapa: 12–15 nodos.
- Dificultades: Normal y Pesadilla.

El daño, HP, precios, recompensas, frecuencia de eventos y modificadores concretos pueden balancearse después. Documenta los valores provisionales y evita duplicarlos en múltiples archivos.

## 19. Restricciones de calidad y propiedad intelectual

- No descargues ni extraigas arte oficial de Riot Games de forma no autorizada.
- Usa placeholders, ilustraciones originales o assets con licencia compatible.
- El nombre, campeones, objetos y mundo de League of Legends pueden implicar derechos de terceros. Este prototipo no debe presentarse como producto oficial.
- No añadas analítica, telemetría, servicios externos ni monetización.
- Mantén el proyecto local y sin backend salvo que el usuario lo solicite explícitamente.

## 20. Primer mensaje esperado de Claude Code

Tras leer el paquete y los artefactos de diseño, responde con:
1. Resumen del proyecto y de la arquitectura.
2. Inventario de artefactos de diseño recibidos y cómo se integrarán.
3. Plan de implementación por fases.
4. Decisiones ambiguas que necesitan confirmación, separando bloqueantes de no bloqueantes.
5. Pruebas que se ejecutarán en cada fase.

**No empieces a programar antes de presentar ese plan.**
