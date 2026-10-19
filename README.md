# League of Legends: Shattered Runeterra — diseño de interfaz

Prototipo navegable de la interfaz de un roguelike táctico (Slay the Spire + Darkest Dungeon + LoL). Proyecto fan no comercial.

## Ver el prototipo

```bash
python -m http.server 5188 --directory design
```

Abre http://localhost:5188. La barra inferior «PROTOTIPO» salta entre pantallas; el combate es jugable.

- `design/` — prototipo (HTML/CSS/JS sin dependencias) y `IMPLEMENTATION.md` con la guía para implementarlo.
- `design/tools/` — scripts que pintan los fondos.

Arte de campeones, objetos y monstruos © Riot Games (Data Dragon / CommunityDragon), enlazado, no incluido. Fondos e iconos: arte original.

## Motor de reglas (TypeScript)

Motor de combate y expedición sin interfaz en `src/engine/` (datos en `src/data/`, balance en `src/engine/config.ts`), con tests en `tests/engine/`. Implementa la spec [`docs/superpowers/specs/2026-10-19-reglas-nucleo-design.md`](docs/superpowers/specs/2026-10-19-reglas-nucleo-design.md).

    npm install
    npm test
    npm run typecheck

Todo el azar usa un RNG con semilla guardado en el estado, así que cualquier combate se puede reproducir.

## Requisitos para tenerlo igual en otro PC

| Herramienta | Versión usada | Para qué | ¿Obligatorio? |
|---|---|---|---|
| Navegador moderno (Chrome/Edge/Firefox) | — | Ver el prototipo (usa `:has()`, container queries y `color-mix()`) | Sí |
| Conexión a internet | — | Fuentes de Google (Cinzel, Inter) y arte de Riot enlazado desde Data Dragon y CommunityDragon | Sí, para verlo completo |
| Python | 3.12.10 (vale 3.10+) | Servidor local `http.server` y scripts de pintura | Sí |
| numpy, Pillow | 2.5.4 / 12.3.0 | Regenerar los fondos (`design/tools/`) | Solo si regeneras imágenes |
| Git | 2.54 | Clonar y subir el repositorio | Sí |
| Node.js | 24.19 (instalado, **no usado**) | No hace falta para el prototipo; lo necesitará la implementación final (Vite + React + TypeScript, según `CLAUDE_CODE_SPEC.md` del paquete de handoff, que no está en este repo), Node 20+ | Más adelante |
| React / Vite / TypeScript | — | No se usan todavía: el prototipo es HTML/CSS/JS puro | Más adelante |

Instalación en otro PC:

```bash
git clone https://github.com/AlejandroSuarezCampos/roguelol.git
```

```bash
python -m pip install -r roguelol/design/tools/requirements.txt
```

Regenerar fondos (desde `design/`): `python tools/paint_menu_bg.py`, `python tools/paint_map.py`, `python tools/paint_scenes.py [camp shop]` y `python tools/paint_regions.py [freljord shurima void noxus targon]`.

## Entorno de Claude Code usado

Se trabajó con **Claude Code (app de escritorio, pestaña Code)**. `.claude/launch.json` define el servidor `design` para la vista previa del navegador integrado.

### Plugins instalados (alcance usuario)

| Plugin | Versión | Origen | Uso en este proyecto |
|---|---|---|---|
| `ui-ux-pro-max` | 2.11.0 | Subido localmente (`local-desktop-app-uploads`) | **Sí** — skills `ui-ux-pro-max:design`, `ui-ux-pro-max:ui-styling`, `ui-ux-pro-max:ui-ux-pro-max` usadas para todo el diseño |
| `superpowers` | 6.3.0 | Subido localmente (`local-desktop-app-uploads`) | Flujo de trabajo (brainstorming, planes, verificación) |
| `ponytail` | 4.8.4 | Subido localmente (`local-desktop-app-uploads`) | Estilo de código mínimo |
| `pokemon-champions` | c3a6909 | GitHub `pmwl0128/pokemon_champion_agent` | No relacionado |
| `vgc-coach-claude` | 0.2.0 | GitHub `NoahJenkins/vgc-coach` | No relacionado |

Los tres plugins «subidos localmente» no vienen de un marketplace público: en el otro PC hay que volver a subir sus archivos desde la sección de plugins de la app o copiar la carpeta `%USERPROFILE%\.claude\plugins\marketplaces\local-desktop-app-uploads\` y activarlos. Los de GitHub se instalan con `/plugin marketplace add <owner/repo>` y `/plugin install <plugin>@<marketplace>` desde una terminal de `claude`.

### Skills sueltas de usuario (`%USERPROFILE%\.claude\skills\`)

Útiles para este proyecto: `awesome-design`, `design-taste-frontend`, `hallmark`, `image-to-code`, `web-design-guidelines`, `playwright-cli`.
No relacionadas: la familia `seo-*` (`seo`, `seo-audit`, `seo-technical`, …).
Se copian tal cual a la misma carpeta en el otro PC.

### Opcional

- Generación de imágenes con IA del plugin `ui-ux-pro-max` (logos, iconos, fotos): requiere `GEMINI_API_KEY` y `pip install google-genai pillow`. No se usó: los fondos se pintaron por código.
