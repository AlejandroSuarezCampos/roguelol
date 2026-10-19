export type PerkId = 'vigor' | 'provisions' | 'belt' | 'mastery';
export const PERK_IDS: PerkId[] = ['vigor', 'provisions', 'belt', 'mastery'];

export interface PerkDef {
  id: PerkId;
  name: string;
  icon: string;
  /** Texto del efecto con el valor de un nivel. */
  text: (value: number) => string;
  /** Coste en Esquirlas de comprar el nivel 1, 2 y 3. */
  costs: [number, number, number];
  /** Valor del efecto en el nivel 1, 2 y 3. */
  values: [number, number, number];
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Mejoras permanentes provisionales (spec §14: moderadas). Se aplican al empezar cada expedición. */
export const PERKS: Record<PerkId, PerkDef> = {
  vigor: { id: 'vigor', name: 'Vigor', icon: 'hp', text: (v) => `+${v} de vida máxima a cada campeón`, costs: [40, 80, 120], values: [2, 3, 4] },
  provisions: { id: 'provisions', name: 'Provisiones', icon: 'gold', text: (v) => `+${v} de oro al empezar`, costs: [30, 60, 90], values: [15, 30, 45] },
  belt: { id: 'belt', name: 'Cinturón', icon: 'potion', text: (v) => `Empiezas con ${plural(v, 'poción', 'pociones')} de vida`, costs: [35, 70, 105], values: [1, 2, 3] },
  mastery: { id: 'mastery', name: 'Maestría', icon: 'up', text: (v) => `${plural(v, 'carta', 'cartas')} del mazo inicial ya ${v === 1 ? 'mejorada' : 'mejoradas'}`, costs: [50, 100, 150], values: [1, 2, 3] },
};
