import type { StatBlock } from '../engine/types';

const LABEL: Record<keyof StatBlock | 'hp', string> = {
  ad: 'AD', ap: 'AP', critChance: 'Prob. crítico', critDamage: 'Daño crítico', penetration: 'Penetración', armor: 'Armadura', mr: 'Res. mágica', hp: 'Vida máx.',
};
const PERCENT = new Set<string>(['critChance', 'critDamage']);
const ORDER: (keyof StatBlock | 'hp')[] = ['hp', 'ad', 'ap', 'critChance', 'critDamage', 'penetration', 'armor', 'mr'];

/** `delta`: con signo (+25, −10, +20%); si no, valor absoluto. */
export function formatStat(key: keyof StatBlock | 'hp', v: number, delta = true): { label: string; value: string } {
  const n = PERCENT.has(key) ? Math.round(v * 100) : Math.round(v * 100) / 100;
  const sign = !delta ? '' : n < 0 ? '−' : '+';
  return { label: LABEL[key], value: `${sign}${Math.abs(n)}${PERCENT.has(key) ? '%' : ''}` };
}

/** Líneas de estadísticas en orden fijo, sin ceros. */
export function statLines(stats: Partial<StatBlock>, hp = 0, absolute = false): { key: string; label: string; value: string; raw: number }[] {
  const all: Partial<Record<keyof StatBlock | 'hp', number>> = { ...stats, hp };
  return ORDER.filter((k) => all[k]).map((k) => ({ key: k, raw: all[k]!, ...formatStat(k, all[k]!, !absolute) }));
}
