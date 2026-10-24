/**
 * Importa el catálogo del LoL (campeones y objetos) desde Data Dragon a `src/data/catalog.generated.json`.
 * Hace falta internet: `npm run import:lol` (o `npm run import:lol -- 16.20.1` para fijar la versión).
 * También avisa de los objetos del juego (`src/data/gear.ts`) cuyo `itemId` no existe en esa versión.
 */
import { writeFileSync } from 'node:fs';
import { GEAR_LIST } from '../src/data/gear';
import { buildCatalog, missingItemIds, type DdChampion, type DdItem } from './catalog';

const BASE = 'https://ddragon.leagueoflegends.com';
const LANG = 'es_ES';

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return (await r.json()) as T;
}

async function main() {
  const version = process.argv[2] ?? (await get<string[]>(`${BASE}/api/versions.json`))[0];
  console.log(`Data Dragon ${version} (${LANG})`);
  const champs = await get<{ data: Record<string, DdChampion> }>(`${BASE}/cdn/${version}/data/${LANG}/champion.json`);
  const items = await get<{ data: Record<string, DdItem> }>(`${BASE}/cdn/${version}/data/${LANG}/item.json`);

  const catalog = buildCatalog(version, champs.data, items.data);
  const out = new URL('../src/data/catalog.generated.json', import.meta.url);
  writeFileSync(out, JSON.stringify(catalog, null, 1) + '\n');
  console.log(`${catalog.champions.length} campeones y ${catalog.items.length} objetos → src/data/catalog.generated.json`);

  const missing = missingItemIds(GEAR_LIST.map((g) => g.itemId), items.data);
  if (missing.length) {
    const names = missing.map((id) => `${id} (${GEAR_LIST.find((g) => g.itemId === id)!.name})`).join(', ');
    console.warn(`AVISO: objetos del juego que no existen en ${version}: ${names}`);
    process.exitCode = 1;
  } else console.log('Todos los itemId de src/data/gear.ts existen en esta versión.');
}

main().catch((e) => {
  console.error(`No se pudo importar: ${e instanceof Error ? e.message : e}. ¿Hay conexión con ${BASE}?`);
  process.exit(1);
});
