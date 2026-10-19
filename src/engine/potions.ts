import { CONFIG } from './config';
import { gainBlock, heal } from './units';
import type { BeltSlot, CombatState, PotionId, Unit } from './types';

export const POTIONS: Record<PotionId, { name: string; healing: boolean; target: 'ally' | 'none' }> = {
  health: { name: 'Poción de vida', healing: true, target: 'ally' },
  refillable: { name: 'Poción reutilizable', healing: true, target: 'ally' },
  iron: { name: 'Elixir de hierro', healing: false, target: 'ally' },
  sorcery: { name: 'Elixir de brujería', healing: false, target: 'none' },
};

export const emptyBelt = (): BeltSlot[] => Array.from({ length: CONFIG.potions.beltSize }, () => null);

/** Añade al primer hueco libre. Devuelve false si el cinturón está lleno (la UI ofrece descartar). */
export function addPotion(belt: BeltSlot[], id: PotionId): boolean {
  const i = belt.indexOf(null);
  if (i < 0) return false;
  belt[i] = { id, spent: false };
  return true;
}

/** Cinturón lleno: `'new'` descarta la poción nueva; un índice sustituye la de ese hueco. */
export function resolveFullBelt(belt: BeltSlot[], id: PotionId, slot: number | 'new'): void {
  if (slot === 'new') return;
  if (!Number.isInteger(slot) || slot < 0 || slot >= belt.length) throw new Error('Hueco del cinturón no válido');
  belt[slot] = { id, spent: false };
}

/** Al empezar cada combate la Poción reutilizable se rellena. */
export function refreshBelt(belt: BeltSlot[]): void {
  for (const p of belt) if (p?.id === 'refillable') p.spent = false;
}

function consume(belt: BeltSlot[], slot: number): void {
  const p = belt[slot]!;
  if (p.id === 'refillable') p.spent = true;
  else belt[slot] = null;
}

/** Motivo por el que no se puede usar (null = se puede). Ninguna poción afecta a derribados. */
export function whyCannotUse(belt: BeltSlot[], slot: number, target?: Unit): string | null {
  const p = belt[slot];
  if (!p || p.spent) return 'Hueco vacío';
  if (POTIONS[p.id].target === 'ally') {
    if (!target || target.side !== 'ally') return 'Elige un aliado';
    if (target.downed) return 'Derribado: no recibe curación normal';
  }
  return null;
}

/** Usa una poción en combate. No gasta energía ni cuenta como carta. */
export function usePotion(s: CombatState, slot: number, targetId?: string): void {
  const t = s.units.find((u) => u.id === targetId);
  const why = whyCannotUse(s.belt, slot, t);
  if (why) throw new Error(why);
  const p = s.belt[slot]!;
  switch (p.id) {
    case 'health':
      heal(t!, CONFIG.potions.health);
      break;
    case 'refillable':
      heal(t!, CONFIG.potions.refillable);
      break;
    case 'iron':
      gainBlock(t!, CONFIG.potions.iron);
      break;
    case 'sorcery':
      s.pendingApMark += CONFIG.potions.sorceryMarks;
      break;
  }
  consume(s.belt, slot);
}

/** Fuera de combate solo se pueden usar las curativas. */
export function usePotionOnMap(belt: BeltSlot[], slot: number, champ: { hp: number; maxHp: number; downed: boolean }): void {
  const p = belt[slot];
  if (!p || p.spent) throw new Error('Hueco vacío');
  if (!POTIONS[p.id].healing) throw new Error('Solo pociones curativas fuera de combate');
  if (champ.downed) throw new Error('Derribado: no recibe curación normal');
  champ.hp = Math.min(champ.maxHp, champ.hp + (p.id === 'health' ? CONFIG.potions.health : CONFIG.potions.refillable));
  consume(belt, slot);
}
