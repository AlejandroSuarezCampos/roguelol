# Fase 3a — Gear y pantalla de Equipo

**Fecha:** 2026-10-19. Implementa §6.3 y §7 de `CLAUDE_CODE_SPEC.md`. Decidido por Claude por delegación del usuario; todo lo marcado **[mi decisión]** está pendiente de revisión.

## Intención

Que las builds importen: el gear cambia las estadísticas que ya usa el motor (AD, AP, crítico, penetración, armadura, resistencia mágica) y la vida máxima, y el jugador decide a quién equiparlo comparando con lo que ya lleva.

## Alcance

**Entra:** 12 objetos (2 slots por campeón: arma y armadura); inventario de la expedición; botín de gear (élite, jefe y combates normales con poca probabilidad) con comparación; gear en el comerciante; pantalla **Equipo** accesible desde el mapa (equipar, desequipar, ver estadísticas finales y el mazo); bot de equilibrio que equipa.

**No entra:** pasivas y efectos negativos de gear (`EffectDefinition`: llegan con las reliquias, que comparten sistema de triggers); velocidad de ataque, robo de vida y aceleración de habilidad (el motor aún no las usa: no se inventan); accesorios; vender gear.

## Decisiones

1. **Modelo [mi decisión]:** `GearDef { id, name, slot: 'weapon' | 'armor', rarity, stats: Partial<StatBlock>, hp?: number }`. La vida máxima del gear es un campo aparte porque la vida vive en la run, no en `StatBlock`.
2. **Estadísticas finales:** `combatFromExpedition` pasa `getFinalStats(base, [gear…])` al motor, y la UI muestra exactamente ese resultado (spec §6.3). Un solo sitio, `engine/gear.ts`.
3. **Vida máxima [mi decisión]:** `maxHp = base × (1 − 10 % × heridas) + vida del gear`. Una función única (`syncMaxHp`) sustituye a los cálculos repetidos de heridas, descanso, comerciante y eventos. Equipar vida sube también la vida actual en esa cantidad; desequiparla la recorta al máximo.
4. **Equipar [mi decisión]:** gratis y solo fuera de combate. Un objeto equipado en un slot ocupado devuelve el anterior al inventario. El inventario no tiene límite.
5. **Botín [mi decisión]:** élite → siempre 3 opciones (comunes/raras/legendarias según `CONFIG.gear.rarityWeights.elite`); jefe → 3 opciones raras o legendarias; combate normal → 20 % de ofrecer 3 opciones. Se elige 1 o ninguna.
6. **Comerciante [mi decisión]:** 2 objetos a la venta (precios por rareza en `CONFIG.shop.gearPrice`: 60 / 110 / 160).
7. **Equipo inicial [mi decisión]:** sin gear. Los campeones empiezan desnudos y el equilibrio se ajusta a que consigan 3–5 objetos por expedición.
8. **Arte:** iconos de Data Dragon enlazados (hotlink) con respaldo a un icono propio.

## Criterios de aceptación

- `npm test`, `npm run typecheck`, `npm run build` en verde.
- Equipar un objeto cambia las estadísticas que ve el combate (test), y la vida máxima se recalcula correctamente con heridas.
- Se puede ganar gear, compararlo y equiparlo desde el botín, y gestionarlo desde Equipo.
- El equilibrio con bot sigue dentro de las cotas del test.
