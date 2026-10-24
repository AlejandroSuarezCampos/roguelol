/** Catálogo del LoL a partir de los JSON de Data Dragon (solo datos; el arte se sigue enlazando, nunca se descarga). */

export interface DdChampion {
  id: string;
  key: string;
  name: string;
  title: string;
  tags: string[];
  info: { attack: number; defense: number; magic: number; difficulty: number };
  stats: { hp: number; armor: number; spellblock: number; attackdamage: number; movespeed: number; attackrange: number };
}

export interface DdItem {
  name: string;
  gold?: { total: number; purchasable?: boolean };
  tags?: string[];
  maps?: Record<string, boolean>;
  into?: string[];
  inStore?: boolean;
  requiredChampion?: string;
}

export interface CatalogChampion {
  id: string;
  key: number;
  name: string;
  title: string;
  roles: string[];
  info: DdChampion['info'];
  hp: number;
  armor: number;
  mr: number;
  ad: number;
  range: number;
}

export interface CatalogItem {
  id: number;
  name: string;
  gold: number;
  tags: string[];
  /** Objeto final: no se convierte en nada más. */
  final: boolean;
}

export interface Catalog {
  version: string;
  generatedAt: string;
  champions: CatalogChampion[];
  items: CatalogItem[];
}

/** Convierte los dos JSON de Data Dragon en el catálogo del juego: ordenado por nombre, sin objetos que no están a la venta en la Grieta. */
export function buildCatalog(version: string, champions: Record<string, DdChampion>, items: Record<string, DdItem>, now: () => Date = () => new Date()): Catalog {
  const champs: CatalogChampion[] = Object.values(champions)
    .map((c) => ({
      id: c.id,
      key: Number(c.key),
      name: c.name,
      title: c.title,
      roles: c.tags,
      info: c.info,
      hp: c.stats.hp,
      armor: c.stats.armor,
      mr: c.stats.spellblock,
      ad: c.stats.attackdamage,
      range: c.stats.attackrange,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const its: CatalogItem[] = Object.entries(items)
    // «11» es la Grieta del Invocador; fuera los objetos de otros modos, no comprables o exclusivos de un campeón.
    .filter(([, i]) => i.maps?.['11'] && i.gold?.purchasable !== false && i.inStore !== false && !i.requiredChampion && (i.gold?.total ?? 0) > 0)
    .map(([id, i]) => ({ id: Number(id), name: i.name, gold: i.gold!.total, tags: i.tags ?? [], final: !i.into?.length }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return { version, generatedAt: now().toISOString(), champions: champs, items: its };
}

/** Ids de objeto que el juego usa pero que Data Dragon no conoce (su icono saldría roto). */
export function missingItemIds(used: number[], items: Record<string, DdItem>): number[] {
  return used.filter((id) => !(String(id) in items));
}
