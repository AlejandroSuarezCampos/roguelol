import type { CardDef, CardUpgrade, CardType, Effect, Keyword, Pos, Rarity, TargetKind } from '../engine/types';
import { block, magic, phys, status } from './cardHelpers';

/**
 * Cartas «extra» de cada campeón (de la 9.ª a la 20.ª), escritas en una forma compacta (`src/data/cardsExtra.json`, generada por
 * `npm run gen:cards`). Aquí se convierten en cartas del juego: el texto, la mejora y las palabras clave salen de los propios
 * efectos, así que nunca pueden contradecirse.
 */
export type ExtraEffect =
  | { k: 'dmg'; n: number; t: 'p' | 'm'; crit?: 1; cons?: ['mark' | 'charge', 'target' | 'self', number]; times?: number }
  | { k: 'block'; n: number; self?: 1 }
  | { k: 'heal'; n: number; self?: 1 }
  | { k: 'stress'; n: number; self?: 1 }
  /** Daño verdadero al propio campeón (el precio de una carta potente). */
  | { k: 'selfdmg'; n: number }
  | { k: 'st'; s: 'stun' | 'vulnerable' | 'mark' | 'burn' | 'charge'; n: number; self?: 1 }
  | { k: 'push' }
  | { k: 'pull' }
  | { k: 'pullto'; to: 1 }
  | { k: 'mv'; to: number }
  | { k: 'allyto'; to: number }
  | { k: 'draw'; n: number }
  | { k: 'revive'; n: number };

export interface ExtraSpec {
  id: string;
  owner: string;
  name: string;
  cost: number;
  type: CardType;
  target: TargetKind;
  rarity: Rarity;
  e: ExtraEffect[];
  /** Posiciones ideales y su bono (solo daño, bloqueo o curación). */
  i?: Pos[];
  b?: ExtraEffect[];
}

const NUMW: Record<number, string> = { 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis' };
const SN = { stun: 'Aturdido', vulnerable: 'Vulnerable', mark: 'Marca', burn: 'Quemadura', charge: 'Carga' } as const;
const plural = (n: number, w: string) => (w === 'Aturdido' || w === 'Vulnerable' || n === 1 ? w : `${w}s`);
const scale = (n: number) => Math.ceil(n * 1.4);

/** El efecto del motor. Un efecto de daño con `times` se repite `times` veces (lo hace `toEffects`). */
function toEffect(e: ExtraEffect, bonus = false): Effect {
  switch (e.k) {
    case 'dmg': {
      const over: Parameters<typeof phys>[1] = {};
      if (e.crit) over.canCrit = true;
      if (e.cons) over.consumeStatus = { status: e.cons[0], from: e.cons[1], bonusPerStack: e.cons[2] };
      if (bonus) over.scaling = undefined;
      return (e.t === 'p' ? phys : magic)(e.n, over);
    }
    case 'block':
      return block(e.n, e.self ? 'self' : undefined);
    case 'heal':
      return e.self ? { type: 'heal', amount: e.n, on: 'self' } : { type: 'heal', amount: e.n };
    case 'stress':
      return e.self ? { type: 'reduceStress', amount: e.n, on: 'self' } : { type: 'reduceStress', amount: e.n };
    case 'selfdmg':
      return { type: 'damage', amount: e.n, damageType: 'true', on: 'self' };
    case 'st':
      return status(e.s, e.n, e.self ? 'self' : undefined);
    case 'push':
      return { type: 'move', by: 1 };
    case 'pull':
      return { type: 'move', by: -1 };
    case 'pullto':
    case 'allyto':
      return { type: 'move', to: e.to as Pos };
    case 'mv':
      return { type: 'move', to: e.to as Pos, on: 'self' };
    case 'draw':
      return { type: 'draw', amount: e.n };
    case 'revive':
      return { type: 'revive', hp: e.n };
  }
}
const toEffects = (list: ExtraEffect[], bonus = false): Effect[] => list.flatMap((e) => Array.from({ length: e.k === 'dmg' ? (e.times ?? 1) : 1 }, () => toEffect(e, bonus)));

/** Una frase por efecto; `special` indica que ya dice «a todos» por su cuenta (daño que consume). */
function phrase(e: ExtraEffect, target: TargetKind): [string, boolean] {
  switch (e.k) {
    case 'dmg':
      if (e.cons) {
        const w = e.cons[0] === 'mark' ? 'Marca' : 'Carga';
        return [`Inflige ${e.n}${target === 'allEnemies' ? ' a todos' : ''}, +${e.cons[2]} por cada ${w} que consume`, true];
      }
      return [e.times && e.times > 1 ? `Inflige ${e.n} ${NUMW[e.times]} veces` : `Inflige ${e.n}`, false];
    case 'block':
      return [e.self || target === 'self' ? `Gana ${e.n} de bloqueo` : `Otorga ${e.n} de bloqueo`, false];
    case 'heal':
      return [e.self ? `Recupera ${e.n} de vida` : `Cura ${e.n}`, false];
    case 'stress':
      return [e.self ? `Reduce ${e.n} de su estrés` : `Reduce ${e.n} de estrés`, false];
    case 'selfdmg':
      return [`Pierde ${e.n} de vida`, false];
    case 'st':
      if (e.self) return [`Gana ${e.n} ${plural(e.n, SN[e.s])}`, false];
      return [e.s === 'stun' ? 'Aplica Aturdido' : `Aplica ${e.n} ${plural(e.n, SN[e.s])}`, false];
    case 'push':
      return [target === 'allEnemies' ? 'Empuja una posición' : 'Empuja al objetivo una posición', false];
    case 'pull':
      return ['Atrae al objetivo una posición', false];
    case 'pullto':
      return ['Arrastra al objetivo a la posición 1', false];
    case 'allyto':
      return [`Lleva al aliado a la posición ${e.to}`, false];
    case 'mv':
      return [e.to === 1 ? 'Avanza a la posición 1' : `Se mueve a la posición ${e.to}`, false];
    case 'revive':
      return [`Reanima a un aliado derribado con ${e.n} de vida`, false];
    case 'draw':
      return ['', false];
  }
}

export function describe(eff: ExtraEffect[], target: TargetKind, ideal?: Pos[], bonus?: ExtraEffect[]): string {
  const rev = eff.find((e) => e.k === 'revive');
  if (rev) return `${phrase(rev, target)[0]}.`;
  const draw = eff.find((e) => e.k === 'draw') as { n: number } | undefined;
  const crit = eff.some((e) => e.k === 'dmg' && e.crit);
  let special = false;
  const parts: string[] = [];
  for (const e of eff) {
    if (e.k === 'draw') continue;
    const [p, sp] = phrase(e, target);
    special ||= sp;
    parts.push(p);
  }
  if (!parts.length) return `Roba ${draw!.n} carta${draw!.n > 1 ? 's' : ''}.`;
  const low = parts.map((p, i) => (i ? p[0].toLowerCase() + p.slice(1) : p));
  let s = low.length === 1 ? low[0] : low.length === 2 ? `${low[0]} y ${low[1]}` : `${low.slice(0, -1).join(', ')} y ${low[low.length - 1]}`;
  if (target === 'allEnemies' && !special) s += ' a todos los enemigos';
  if (target === 'allAllies') s += ' a todos los aliados';
  if (crit) s += '. Puede ser crítico';
  if (draw) s += `. Roba ${draw.n} carta${draw.n > 1 ? 's' : ''}`;
  if (ideal?.length && bonus?.length) {
    const a = ideal[0];
    const z = ideal[ideal.length - 1];
    s += `. Desde ${a === z ? a : `${a}–${z}`}: +${(bonus[0] as { n: number }).n}`;
  }
  return `${s}.`;
}

/** Mejora: números un 40 % más altos; si no hay números, un acumulable más; y si tampoco, un coste menos. */
export function upgradeOf(spec: ExtraSpec): { effects: ExtraEffect[]; cost?: number } {
  let changed = false;
  const effects = spec.e.map((e) => {
    const n = { ...e } as ExtraEffect;
    if (n.k === 'dmg' || n.k === 'block' || n.k === 'heal' || n.k === 'stress') {
      n.n = scale(n.n);
      changed = true;
    }
    if (n.k === 'dmg' && n.cons) n.cons = [n.cons[0], n.cons[1], scale(n.cons[2])];
    if (n.k === 'selfdmg' && n.n > 1) {
      n.n = Math.ceil(n.n / 2);
      changed = true;
    }
    if (n.k === 'revive') {
      n.n += 10;
      changed = true;
    }
    return n;
  });
  if (!changed) {
    const bump = effects.find((e) => (e.k === 'st' && e.s !== 'stun') || e.k === 'draw') as { n: number } | undefined;
    if (bump) {
      bump.n += 1;
      changed = true;
    }
  }
  return changed ? { effects } : { effects: spec.e, cost: Math.max(spec.cost - 1, 0) };
}

const keywordsOf = (e: ExtraEffect[]): Keyword[] => {
  const kw = new Set<Keyword>();
  for (const x of e) {
    if (x.k === 'block') kw.add('block');
    if (x.k === 'push' || x.k === 'pull' || x.k === 'pullto' || x.k === 'allyto' || x.k === 'mv') kw.add('displacement');
    if (x.k === 'st' && (x.s === 'mark' || x.s === 'burn' || x.s === 'charge')) kw.add(x.s);
    if (x.k === 'dmg' && x.cons) kw.add(x.cons[0]);
  }
  return (['block', 'mark', 'burn', 'charge', 'displacement'] as Keyword[]).filter((k) => kw.has(k));
};

export function buildExtra(spec: ExtraSpec): { card: CardDef; upgrade: CardUpgrade } {
  const card: CardDef = {
    id: spec.id, name: spec.name, owner: spec.owner as CardDef['owner'], cost: spec.cost, type: spec.type, target: spec.target, rarity: spec.rarity,
    keywords: keywordsOf(spec.e), text: describe(spec.e, spec.target, spec.i, spec.b), effects: toEffects(spec.e),
    ...(spec.i && spec.b ? { idealPositions: spec.i, positionBonus: toEffects(spec.b, true) } : {}),
  };
  const u = upgradeOf(spec);
  const base = describe(u.effects, spec.target, spec.i, spec.b);
  const upgrade: CardUpgrade = u.cost === undefined ? { text: base, effects: toEffects(u.effects) } : { text: `${base.slice(0, -1)}. Cuesta ${u.cost}.`, cost: u.cost };
  return { card, upgrade };
}
