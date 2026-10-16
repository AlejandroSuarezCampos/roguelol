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
| Fondos de región (Freljord, Shurima, El Vacío, Noxus, Monte Targon) | Imágenes raster originales `assets/regions/*.jpg` (1600×900) pintadas con `tools/paint_regions.py` (+ `tools/paintlib.py`). Inspiradas en el arte oficial de cada facción de LoL Universe (Hielo Verdadero, Disco Solar, vórtice del Vacío, Bastión Inmortal, acantilados tallados de Targon), que solo se usó como referencia y no se incluye. Islas de la Sombra reutiliza `menu-bg.jpg` | Libre para el proyecto |
| Reliquias, fondo de combate y mapa; respaldo SVG de enemigos | SVG original generado (`art.js`) | Libre para el proyecto |
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
- Fondo: escena SVG generada (`BG_BATTLE`), sin cajas. Los personajes son sprites con máscara difuminada (retrato loading de LoL / icono de monstruo) sobre una sombra en el suelo.
- HUD superior 52px: región/piso · «Turno N» centrado · oro, accesibilidad, ayuda, retirada.
- Bajo el HUD, a la izquierda: barra de **reliquias** (orbes 40px; clic = detalle; 6 huecos). A la derecha: tira de **gear del campeón seleccionado** (cara, herida o escalado, 2 objetos con stats, enlace a la ficha). Siempre separados.
- Escenario: aliados pos 4→1 (frente hacia el centro) | enemigos pos 1→4. Bajo cada personaje: rombo/círculo de posición + nombre, escudo de bloqueo pegado a la barra de vida (estilo StS), estrés (aliados) o alcance (enemigos) y estados con icono+número+nombre. Sobre cada enemigo flota su intención: icono grande con número, texto «Ataque → Lux» y sello «¡LETAL!»/«Peligro».
- Objetivos: válido = halo verde en el suelo + etiqueta; ilegal = sprite apagado, halo rojo y motivo. Derribado = sprite gris inclinado + etiqueta.
- Zona inferior 258px: mazo (izq.), orbe de energía teal, mano en abanico (rotación ±4°/carta, sube al pasar/seleccionar), botón «Terminar turno» y descarte (der.). Pista centrada sobre la mano.
- Carta (158×228, no tocar): orbe de coste, estandarte con nombre (color = rareza), arte rectangular con el splash completo, fondo por tipo (Ataque rojo, Defensa azul, Habilidad verde, Apoyo ámbar, Control morado), etiqueta de tipo, caja de texto con alcance, pie con propietario y rareza; tamaños en `cqw`.

## Componentes (nombre → archivo sugerido)
`ChampionPanel`, `EnemyPanel`+`EnemyIntent`, `Card`/`CardHand`, `EnergyCounter`, `StatusIcon`, `GearSlot`/`GearComparison`, `RelicSlot`, `ExpeditionNode`/`ExpeditionMap`, `RewardChoice`, `ConfirmationModal`, `StressMeter`/`WoundBadge`. En el prototipo son las funciones `unitA/unitE`, `intentFor`, `card`, `.energy`, `chip`, `gearSlot`, `relicSlot`, nodo del mapa (`.nd`), `.opt`, `confirmM`, `stressM`, `woundBadge`.

## Interacción de combate
1. Clic/teclas 1–5 en carta → `seleccionada` (sube 26px, anillo oro). Esc cancela. Carta deshabilitada muestra motivo permanente (sin energía / campeón derribado).
2. Con carta seleccionada, **todas** las unidades relevantes se marcan: verde «Objetivo válido» o borde rojo discontinuo con motivo corto («Fuera de alcance», «Derribado…»); el motivo completo aparece en la barra de pista al hacer clic en un ilegal (la información no vive solo en hover).
3. Cartas sin objetivo (propio/área) → botón «Jugar carta».
4. Feedback flotante: daño (rojo), crítico (grande, oro), curación (verde), bloqueo (azul), marca (cian), relic activada (slot pulsa + texto).
5. Intención enemiga siempre visible sobre el enemigo: icono + valor + objetivo. Naranja = peligrosa (≥12 en el prototipo); «¡LETAL!» si superaría vida+bloqueo del objetivo.
6. Terminar turno: se resuelven intenciones, el bloqueo aliado se reinicia, se roba a 5, energía a 3.
7. Derribado: retrato en grises, rayado, etiqueta «DERRIBADO», sus cartas deshabilitadas.

## Estrés
Barra con marcas en 25/50/75 + cifra + estado (Sereno/Inquieto/Agobiado/Al límite/Crisis). Al límite: borde naranja; crisis: etiqueta roja + ⚠.

## Decisiones UI que requieren confirmación de reglas (no inventadas en el código final)
- Alcance «cuerpo a cuerpo = posiciones 1–2» y umbral de intención peligrosa.
- Efectos concretos de heridas, costes de descanso/comerciante/eventos, Esquirlas como moneda de Mejoras.
- Nombre/estadísticas del gear de Leona/Lux/Soraka y del jefe (Viego, el Rey Arruinado) son ilustrativos.

## Responsive
≥1360px: layout completo. <1360px: campo en dos filas, rail horizontal. <900px: mano con scroll horizontal; funcional, no pensado como móvil completo.

## Accesibilidad
Foco visible 3px; `aria-label` con vida/bloqueo/estrés/derribo; botones de texto grande, alto contraste y movimiento reducido en combate.
