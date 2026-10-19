# Guía de implementación — Shattered Runeterra (UI)

Prototipo navegable: `design/index.html` (servir con `python -m http.server --directory design`). Números = ilustrativos, no reglas finales (manda `CLAUDE_CODE_SPEC.md`).

## Assets y procedencia
| Asset | Fuente | Uso |
|---|---|---|
| Campeones (retrato) | Data Dragon `cdn/img/champion/loading/{Champ}_0.jpg` (skin base) | Paneles, fichas |
| Arte de carta | Data Dragon `cdn/img/champion/splash/{Champ}_0.jpg`, completo dentro de una ventana rectangular con su misma proporción | Cabecera de carta |
| Objetos/gear y consumibles | Data Dragon `cdn/16.20.1/img/item/{id}.png` (3031, 3124, 3089, 3083, 3075, 3748, 3102, 3107, 3190, 2003, 2031, 2138) | GearSlot, tienda, recompensas |
| Habilidades (cartas que son literalmente una Q/W/E/R) | Data Dragon `cdn/16.20.1/img/spell/{id}.png`, campo `sp` + tecla `k` en la carta | Icono enmarcado sobre el splash |
| Enemigos normales: Gran lobo sombrío, Centinela azul, Gromp, Picoaguzado; élite: Heraldo de la Grieta; futuro: Barón Nashor | CommunityDragon `raw.communitydragon.org/latest/game/assets/characters/sru_*/hud/*_square.png` (128px, arte oficial in-game) | EnemyPanel, Archivo |
| Jefe: Viego, el Rey Arruinado (lore de las Islas de la Sombra) | Data Dragon `loading/Viego_0.jpg` | EnemyPanel, Archivo |
| Fondo del menú | Imagen raster original `assets/menu-bg.jpg` (1920×1080), pintada por código con `tools/paint_menu_bg.py` (ruido fractal, niebla, reflejos, pase de pincel); regenerable con `python tools/paint_menu_bg.py` | Libre para el proyecto |
| Fondos de región (Freljord, Shurima, El Vacío, Noxus, Monte Targon) | Imágenes raster originales `assets/regions/*.jpg` (1600×900) pintadas con `tools/paint_regions.py` (+ `tools/paintlib.py`; `python tools/paint_regions.py [región…]`). Inspiradas en el arte oficial de cada facción de LoL Universe (Hielo Verdadero, Disco Solar, vórtice del Vacío, Bastión Inmortal, acantilados tallados de Targon), que solo se usó como referencia y no se incluye. Islas de la Sombra reutiliza `menu-bg.jpg` | Tarjetas de región en Preparación (`.opt.reg`) |
| Pergamino del mapa | Imagen raster original `assets/map-shadow-isles.jpg` (1000×2160): papel envejecido, manchas, costas a tinta y bordes quemados, pintada con `tools/paint_map.py` | Mapa de expedición y leyenda |
| Reliquias y fondo de combate; respaldo SVG de enemigos | SVG original generado (`art.js`) | Libre para el proyecto |
| Iconos de UI (stats, estados, nodos) | Sprite SVG original (`index.html`) | Libre para el proyecto |

Arte de Riot: © Riot Games, uso fan no comercial según su política «Legal Jibber Jabber»; hotlinkeado, no redistribuido. Si el proyecto se publica o monetiza, sustituirlo. Si una imagen no carga, el retrato cae a un monograma con el color del campeón.

## Flujo
Menú → (Equipo | Mejoras | Archivo) · Menú → Expedición → Preparación → Mapa → {Combate/Élite/Jefe → Recompensas, Descanso, Comerciante, Evento/Santuario, Tesoro → Recompensas} → … → Jefe → Resultado → Menú. Retirada desde Combate → Resultado.

## Dirección estética
Base del cliente actual de LoL (azul abisal `#010a13`/`#091428`, oro hextech `#c8aa6e`/`#785a28`/`#f0e6d2`, acento teal `#0ac8b9`; esquinas rectas, filetes dorados de 1px con remate en rombo, botones con borde degradado oro y primario con brillo teal, pestañas subrayadas sin cajas). Toques de Darkest Dungeon: grano y viñeta global, luz de antorcha cálida en el lado aliado y niebla fría en el enemigo. Slay the Spire: escena de combate sin paneles y cartas.

## Tokens (`styles.css :root`)
Semánticos: vida `#e5594f`, bloqueo `#6cabee`, estrés `#bb8cf5`, herida `#e0698e`, magia/marca `#0ac8b9`, peligro `#ff8c3a`, válido `#7ddc92`, ilegal `#ff5f5f`, selección `#f5d36e`. Fuentes: Cinzel (sustituto de Beaufort, títulos en mayúsculas), Inter (sustituto de Spiegel, texto/números). Espaciado 8px; radio 2px; foco 2px teal.
Regla: ningún estado depende solo del color (icono + etiqueta/forma).

## Layout de combate (escena tipo Slay the Spire, 1600×900 de referencia)
- Estructura: rejilla de 4 filas en `.cb` — HUD 52px · fila de reliquias/gear · escenario `minmax(0,1fr)` · zona inferior `--bot: clamp(196px, 29vh, 258px)`. Nada se posiciona por coordenadas fijas, así que no se solapa con ventanas bajas.
- Tamaño de los personajes: el escenario es un contenedor de consulta (`container-type:size`) y cada personaje mide `clamp(70px, min(9.4vw, (100cqh − 172px)/1.46), 172px)`; los 172px reservan las barras y la intención. Las cartas de la mano escalan con `--bot` (118–158px de ancho).
- Fondo: escena SVG generada (`BG_BATTLE`), sin cajas. Los personajes son sprites con máscara difuminada (retrato loading de LoL / icono de monstruo) sobre una sombra en el suelo.
- HUD superior 52px: región/piso · «Turno N» centrado · oro, accesibilidad, ayuda, retirada.
- Bajo el HUD, a la izquierda: barra de **reliquias** (orbes 40px; clic = detalle; 6 huecos). A la derecha: tira de **gear del campeón seleccionado** (cara, herida o escalado, 2 objetos con stats, enlace a la ficha). Siempre separados.
- Escenario: aliados pos 4→1 (frente hacia el centro) | enemigos pos 1→4. Bajo cada personaje: rombo/círculo de posición + nombre, escudo de bloqueo pegado a la barra de vida (estilo StS), estrés (aliados) o alcance (enemigos) y estados con icono+número+nombre. Sobre cada enemigo flota su intención: icono grande con número, texto «Ataque → Lux» y sello «¡LETAL!»/«Peligro».
- Objetivos: válido = halo verde en el suelo + etiqueta; ilegal = sprite apagado, halo rojo y motivo. Derribado = sprite gris inclinado + etiqueta.
- Zona inferior (`--bot`): mazo (izq.), orbe de energía teal, mano en abanico (rotación ±4°/carta, sube al pasar/seleccionar), botón «Terminar turno» y descarte (der.). Pista centrada sobre la mano.
- Carta (158×228, no tocar): orbe de coste, estandarte con nombre (color = rareza), arte rectangular con el splash completo, fondo por tipo (Ataque rojo, Defensa azul, Habilidad verde, Apoyo ámbar, Control morado), etiqueta de tipo, caja de texto con alcance, pie con propietario y rareza; tamaños en `cqw`.

## Mapa de expedición (estilo Slay the Spire)
- Pergamino vertical desplazable: inicio abajo, jefe arriba (retrato circular de Viego). Al abrirlo se desplaza hasta la posición actual y conserva el desplazamiento al seleccionar nodos.
- Nodos sin cajas: iconos a tinta sobre el papel (élite en rojo óxido, descanso en ocre, santuario en verde). Estados sin depender solo del color: **visitado** = rodeado con un círculo de tinta trazado a mano; **actual** = círculo rojo + «Estás aquí»; **disponible** = late y muestra su nombre; **no alcanzable** = atenuado.
- Caminos punteados a tinta; los recorridos en rojo y los siguientes más marcados. Coordenadas con un desplazamiento fijo por nodo para un aspecto dibujado a mano.
- Barra superior: región y piso, los 4 campeones con vida y estrés, oro, reliquias, volver. A la derecha, leyenda en pergamino con los 8 tipos, los estados y el detalle del nodo seleccionado con «Entrar».

## Componentes (nombre → archivo sugerido)
`ChampionPanel`, `EnemyPanel`+`EnemyIntent`, `Card`/`CardHand`, `EnergyCounter`, `StatusIcon`, `GearSlot`/`GearComparison`, `RelicSlot`, `ExpeditionNode`/`ExpeditionMap`, `RewardChoice`, `ConfirmationModal`, `StressMeter`/`WoundBadge`. En el prototipo: personajes `unitA/unitE` (`.ftr`), `intentFor` (`.intent`), `card` dentro de `.hand .slot`, orbe `.orb`, mazos `.pile`, estados `.st` (combate) / `chip` (resto), `gearSlot` y tira `.gearbar`, `relicSlot` y barra `.relbar`, nodo del mapa (`.nd`), `.opt` / `.opt.reg`, `confirmM`, `stressM`, `woundBadge`.

## Interacción de combate
1. Clic/teclas 1–5 en carta → `seleccionada` (se endereza en el abanico, sube y crece; anillo oro). Volver a pulsarla o Esc cancela. La selección y el descarte van **por posición en la mano** (`G.si`), no por id: dos copias iguales son cartas distintas. Carta deshabilitada muestra motivo permanente (sin energía / campeón derribado).
2. Con carta seleccionada, **todas** las unidades relevantes se marcan: halo verde en el suelo + «Objetivo válido», o sprite apagado + halo rojo + motivo corto («Fuera de alcance», «Derribado…»); el motivo completo aparece en la barra de pista al hacer clic en un ilegal (la información no vive solo en hover).
3. Cartas sin objetivo (propio/área) → botón «Jugar carta».
4. Feedback flotante: daño (rojo), crítico (grande, oro), curación (verde), bloqueo (azul), marca (cian), relic activada (slot pulsa + texto).
5. Intención enemiga siempre visible sobre el enemigo: icono + valor + objetivo. Naranja = peligrosa (≥12 en el prototipo); «¡LETAL!» si superaría vida+bloqueo del objetivo.
6. Terminar turno: se resuelven intenciones, el bloqueo aliado se reinicia, se roba a 5, energía a 3.
7. Derribado: sprite en grises e inclinado, etiqueta «DERRIBADO», sus cartas deshabilitadas.
8. Reliquias: clic en el orbe abre su detalle; al activarse, el orbe pulsa y aparece texto flotante.

## Estrés
Barra con marcas en 25/50/75 + cifra + estado (Sereno/Inquieto/Agobiado/Al límite/Crisis). Al límite: borde naranja; crisis: etiqueta roja + ⚠.

## Decisiones UI que requieren confirmación de reglas (no inventadas en el código final)
- Alcance «cuerpo a cuerpo = posiciones 1–2» y umbral de intención peligrosa.
- Efectos concretos de heridas, costes de descanso/comerciante/eventos, Esquirlas como moneda de Mejoras.
- Nombre/estadísticas del gear de Leona/Lux/Soraka y del jefe (Viego, el Rey Arruinado) son ilustrativos.

## Responsive
Probado en 1920×1050, 1920×905, 1920×780 y 1366×680 sin solapes (personajes de 172 a 75px de ancho). <1500px: la tira de gear muestra solo iconos (nombre en `title`). <1360px: ficha de Equipo en una columna, menú en 2×2. <1100px: reliquias y gear en filas separadas, escenario con scroll horizontal. <900px: mano con scroll horizontal; funcional, no pensado como móvil completo. Nombres largos e intenciones pasan a dos líneas.

## Accesibilidad
Foco visible 2px teal; `aria-label` con vida/bloqueo/estrés/derribo y en la intención enemiga; botones de texto grande, alto contraste y movimiento reducido en combate.
