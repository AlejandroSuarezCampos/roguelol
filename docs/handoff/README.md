# League of Legends: Shattered Runeterra — Handoff pack

Este paquete separa el trabajo en dos fases:

1. **Claude Design**: diseñar la interfaz y sus estados visuales a partir de `PROMPT_CLAUDE_DESIGN.md`.
2. **Claude Code (Opus 5.5)**: implementar el juego usando `CLAUDE_CODE_SPEC.md` como especificación principal y la interfaz aprobada como referencia visual.

## Archivos

- `PROMPT_CLAUDE_DESIGN.md`: prompt listo para pegar en Claude Design.
- `CLAUDE_CODE_SPEC.md`: especificación de producto, reglas, arquitectura, datos, criterios de aceptación y plan de implementación para Claude Code.
- `docs/GAME_DESIGN.md`: visión y sistemas del juego, para consulta humana.
- `docs/INTERFACE_HANDOFF_CHECKLIST.md`: qué debe entregar Claude Design y cómo pasárselo a Claude Code.

## Orden de uso recomendado

1. Abre Claude Design y pega `PROMPT_CLAUDE_DESIGN.md`.
2. Pide primero el flujo completo y las pantallas principales; revisa y corrige el diseño antes de darlo por terminado.
3. Exporta o comparte con Claude Code todos los artefactos disponibles del diseño: código, estructura de componentes, tokens, assets, capturas y notas de interacción.
4. Abre Claude Code en una carpeta de proyecto vacía y dale `CLAUDE_CODE_SPEC.md` junto con los artefactos finales de diseño.
5. Pide a Claude Code que lea toda la especificación y haga un plan antes de modificar archivos. Después, implementad por fases con pruebas.

## Principio importante

La especificación funcional manda sobre las decisiones visuales si hay contradicción. La interfaz debe representar las reglas del juego; no debe inventar reglas nuevas. Si falta una decisión funcional, Claude Code debe registrarla como pregunta o proponer una opción mínima y documentarla antes de implementarla.

El proyecto es un prototipo de juego para uso personal. Si se pretende publicar o monetizar, revisa antes las marcas, personajes, nombres, arte y demás propiedad intelectual de Riot Games. No incluyas assets oficiales extraídos sin permiso.
