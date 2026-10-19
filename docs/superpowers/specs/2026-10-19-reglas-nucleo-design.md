# Reglas núcleo: posición, estrés, caídos, Niebla Negra y pociones

**Fecha:** 2026-10-19 · **Estado:** propuesta para revisión · **Subproyecto 1 de 3** (reglas)

Enmienda a [`docs/handoff/CLAUDE_CODE_SPEC.md`](../../handoff/CLAUDE_CODE_SPEC.md). Donde este documento y la spec original difieran, **manda este documento**. Lo que no se menciona aquí sigue como en la spec original.

Subproyectos siguientes (specs propias, fuera de alcance aquí):
2. **Interfaz:** reflejar estas reglas en el prototipo y cubrir huecos (visor de mazo/descarte, ficha de enemigo, registro de turno, Ajustes, «Continuar expedición», glosario, Cementerio, sonido y animaciones, límite de 3 cartas por campeón visible).
3. **Base técnica:** datos separados de la UI con textos de carta generados desde los números, y assets de Riot descargados localmente.

Todos los números marcados con **(ajustable)** son valores de partida para balance; deben vivir en datos/configuración, nunca repetidos en el código.

---

## 1. Posiciones: bonus en vez de restricción

**Enmienda §5.1 y §5.3 (requisitos de posición).**

- Cualquier carta se puede jugar desde cualquier posición del lanzador y puede apuntar a cualquier posición válida para su tipo de objetivo. **Se elimina** la regla de alcance «cuerpo a cuerpo = posiciones 1–2».
- Una carta puede declarar una **posición ideal** del lanzador (`idealPositions: (1|2|3|4)[]`) y un **bonus** (`positionBonus: EffectDefinition[]`) que se añade a sus efectos si el lanzador está en una posición ideal al jugarla.
  - Ejemplos: Escudo del amanecer «Desde 1–2: +3 daño»; Enlace de luz «Desde 3–4: +1 Marca».
- Los enemigos usan el mismo sistema en sus intenciones (p. ej. Centinela azul más fuerte desde el frente, Gromp desde atrás). Si la intención incluye un bonus por posición, la intención mostrada ya lo refleja.
- El bonus se evalúa en el momento de resolver la carta, con la posición actual.

**UI:** la carta muestra 4 puntos con los ideales iluminados y el bonus escrito en el texto; la carta en mano indica si el bonus está activo ahora mismo.

## 2. Movimiento

**Enmienda §5.1 (desplazamientos).**

- **Cartas de desplazamiento** (efecto `move`): p. ej. Hoja del cénit mueve a Leona a la posición 1; Hoja cortante desplaza al objetivo una posición hacia atrás. Mover a una posición ocupada **intercambia** las dos unidades. Mover fuera de los límites (antes de 1 o después de 4) no tiene efecto y la carta lo indica como objetivo no válido para ese movimiento.
- **Enemigos:** algunas intenciones reordenan su formación con la misma regla de intercambio. La intención lo muestra («Se adelanta a 1»).
- **Intercambio de aliados:** una vez por turno del equipo, por **1 de energía (ajustable)**, el jugador intercambia a dos aliados **adyacentes**. Es una acción explícita, no una carta; no cuenta para el límite de cartas por campeón.
- **Fuera de combate** (mapa, preparación): reordenación libre y gratuita.
- Un campeón **derribado conserva su posición** y puede ser intercambiado o desplazado.

## 3. Estrés en combate

**Amplía §10.1. Sustituye la frase «La crisis debe tener consecuencias deterministas» por la regla de crisis/virtud de esta sección, que usa RNG con semilla y probabilidad visible (compatible con §4.1).**

**Fuentes que suben estrés (ajustables):**
- Intenciones enemigas de **estrés**: nuevo tipo de intención con icono propio, visible como cualquier otra (§4.5 telegráfica).
- Recibir un **crítico**: +5 al objetivo.
- **Caída de un aliado** (pasa a derribado): +10 a cada aliado vivo.

**Fuentes que lo bajan (ajustables):**
- Derrotar a un enemigo: −3 a todos los aliados vivos.
- Cartas de Soraka (y otras con `reduceStress`), campamento, eventos y reliquias.

**Al llegar a 100 — crisis o virtud:**
- Antes de llegar, la UI muestra la probabilidad: **25 % virtud / 75 % crisis (ajustable)**. La tirada usa el RNG con semilla de la run y se resuelve **inmediatamente** al alcanzar 100.
- **Crisis:** el estrés queda fijado en 100 hasta reducirlo. Cada campeón tiene **una crisis fija y visible** en su ficha:

| Campeón | Crisis | Efecto mientras dure (ajustable) |
|---|---|---|
| Leona | Ira | Sus ataques +3 daño; no puede apuntar a aliados; +5 estrés a los demás al inicio de cada turno |
| Yasuo | Egoísmo | Sus cartas cuestan 1 menos pero solo puede jugarse **una** carta de otro campeón por turno |
| Lux | Pánico | No puede jugar cartas de Ataque; al inicio de cada turno se desplaza una posición hacia atrás |
| Soraka | Desesperación | Sus curaciones curan la mitad; +3 estrés a sí misma por cada carta suya jugada |

- La crisis termina cuando el estrés baja de 100 (por cualquier fuente). Al terminar el combate, el estrés persiste (§10.1), así que la crisis puede continuar en el siguiente combate.
- **Virtud:** el estrés baja a **50** y el campeón gana **Firmeza** hasta el final del combate: +4 bloqueo al inicio de cada turno y sus cartas no generan estrés. *(Efecto único de virtud en el MVP para no multiplicar contenido.)*

## 4. Presagio de los caídos (cartas de campeones derribados)

**Enmienda §5.3 («solo pueden jugarse si ese campeón está activo») y matiza §5.5 («No actúa»).**

- Las cartas de un campeón **derribado** se pueden seguir jugando. El campeón sigue sin actuar por sí mismo (no tiene intención, no recibe curación normal), pero sus cartas en mano o robadas son jugables pagando el **Presagio**.
- Al empezar cada expedición se sortea **uno** de estos cuatro presagios con el RNG con semilla; es **fijo para toda la run** y se muestra desde la preparación y en la barra superior del mapa y del combate:

| Presagio | Coste al jugar una carta de un caído (ajustable) |
|---|---|
| Lamento | +6 estrés a todos los aliados vivos |
| Peso | La carta cuesta +1 de energía |
| Deriva | No eliges objetivo: va al objetivo legal más adelantado (o, si es de apoyo, al aliado vivo con menos vida). Se marca antes de confirmar |
| Sangría | El aliado vivo más adelantado recibe 4 de daño (se puede bloquear) |

- Las cartas de un caído usan sus estadísticas para escalar, pero **nunca** activan su bonus de posición.
- Las cartas de un caído siguen contando para el límite de 3 cartas por campeón y turno (§5.3).
- Reanimar (`revive`) elimina el Presagio para ese campeón al instante.

## 5. Niebla Negra (mecánica regional de las Islas de la Sombra)

**Nueva sección; amplía §11.** Solo en las Islas de la Sombra en el MVP. Cada región futura tendrá su propio medidor con la misma estructura (Freljord: Frío; Shurima: Calor…); no se implementan ahora.

**Medidor 0–100**, visible en la barra superior del mapa y del combate (valor + tramo).

**Cambios (ajustables):**
- Entrar en cualquier nodo: **+8**. Entrar en un nodo de élite: **+15** en total.
- En el campamento, **«Avivar la hoguera»: −15** de niebla. Es una acción **adicional** que no consume la elección única del descanso (§13).
- Eventos y santuarios pueden subirla o bajarla, siempre con el número escrito en la opción.
- El mapa muestra cuánta niebla añadirá cada nodo disponible.

**Tramos (efectos acumulativos, siempre visibles en una leyenda):**

| Tramo | Enemigos | Botín |
|---|---|---|
| 0–29 **Bruma** | — | — |
| 30–59 **Niebla** | Sus intenciones de estrés hacen +3 | +15 % de oro |
| 60–89 **Niebla densa** | Empiezan el combate con 1 **Marca de Sombra** (+2 estrés al golpear) | Las recompensas de carta ofrecen 4 opciones en vez de 3 |
| 90–100 **Ruina** | +20 % de vida | Las élites dan **una reliquia extra** y los combates normales tienen un **10 % de reliquia** |

- **Jefe:** si se entra en el nodo del jefe con 60 o más de niebla, Viego tiene una **intención extra** en su primer turno.

## 6. Reliquias de élite y límite de reliquias

**Enmienda §8 y §13.**

- **Toda élite da 1 reliquia** como recompensa, con cualquier nivel de niebla (como en Slay the Spire). En Ruina, 2.
- Las tiradas de reliquia de los combates normales en Ruina usan el RNG con semilla; la probabilidad se muestra en la vista previa del nodo y en la pantalla de botín.
- Con 6/6 reliquias, una reliquia nueva ofrece **reemplazar una existente** (elegida por el jugador, irreversible y confirmada) o **convertirla en 40 de oro (ajustable)**.

## 7. Cinturón de pociones

**Nueva sección; amplía §13 (consumibles).**

- **3 huecos (ajustable)** en la barra superior del combate, junto a las reliquias.
- Usar una poción **no gasta energía** ni cuenta como carta; se puede usar en cualquier momento del turno del equipo. Su efecto y objetivo se muestran antes de confirmar.
- Las pociones curativas también se pueden usar desde el mapa.
- Con el cinturón lleno, al recibir una poción el jugador elige descartar la nueva o una de las que lleva.

**Pociones MVP** (iconos de objetos de LoL):

| Poción | Efecto (ajustable) |
|---|---|
| Poción de vida | Cura 20 a un aliado vivo |
| Poción reutilizable | Cura 8 a un aliado vivo; se rellena al empezar cada combate |
| Elixir de hierro | +15 de bloqueo a un aliado |
| Elixir de brujería | La siguiente carta de AP de este turno aplica +2 Marca |

Las pociones de curación no afectan a derribados (§5.5); solo `revive` los reanima.

---

## 8. Aleatoriedad y determinismo

Todo azar de este documento (sorteo del Presagio, tirada de crisis/virtud, reliquia en combates normales en Ruina) usa **el RNG con semilla de la run** (§4.1), se puede reproducir en tests y su probabilidad o resultado se muestra al jugador antes o en el momento de producirse. No hay azar oculto.

## 9. Modelo de datos (añadidos)

- `CardDefinition`: `idealPositions?`, `positionBonus?`.
- `EnemyIntent`: nuevo tipo `stress` (`amount`, `target`); nuevo tipo `reposition` (`to`); `positionBonus?`.
- `ChampionDefinition`: `crisis: "rage" | "selfish" | "panic" | "despair"`.
- `RunState`: `omen: "lament" | "weight" | "drift" | "bleed"`, `blackMist: number`, `potions: (PotionId | null)[]` (longitud 3), `swapUsedThisTurn: boolean`.
- `ChampionCombatState`: `crisisActive: boolean`, `virtueActive: boolean`.
- Nuevo evento de trigger `onStressThreshold` (ya sugerido en §8) dispara la tirada de crisis/virtud.
- Configuración (`difficulty.ts` o datos): todos los valores marcados como ajustables.

## 10. Criterios de aceptación (tests del motor)

- Una carta con `idealPositions` aplica su bonus solo desde esas posiciones; una carta sin él se resuelve igual desde cualquier posición; ya no existe rechazo por alcance.
- `move` a posición ocupada intercambia; fuera de límites no tiene efecto; las intenciones `reposition` siguen la misma regla.
- El intercambio de aliados cuesta 1 de energía, exige adyacencia, solo una vez por turno y no cuenta en el límite de cartas.
- Cada fuente de estrés aplica su valor exacto; al llegar a 100 la tirada con semilla fija produce el mismo resultado; crisis y virtud aplican y retiran sus efectos según lo definido.
- Con cada uno de los 4 presagios, jugar una carta de un caído aplica exactamente su coste y nada más; reanimar lo elimina; nunca se activa su bonus de posición.
- La niebla suma +8 / +15 al entrar en nodos, −15 al avivar la hoguera sin consumir la elección de descanso, y cada tramo aplica exactamente sus efectos; el jefe gana la intención extra solo con ≥60.
- Toda élite da 1 reliquia (2 en Ruina); con 6/6 se ofrece reemplazar o convertir en oro.
- Pociones: 3 huecos, sin coste de energía, gestión de cinturón lleno, curativas utilizables en el mapa, ninguna cura a derribados.

## 11. Fuera de alcance

Medidores de otras regiones, más de una virtud, pociones adicionales, rediseño visual (subproyecto 2) y refactor técnico/assets (subproyecto 3).
