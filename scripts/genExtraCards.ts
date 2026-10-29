/**
 * Genera las 12 cartas «extra» de cada campeón (de la 9.ª a la 20.ª) en `src/data/cardsExtra.json`.
 * Es determinista (semilla = id del campeón). Para cada campeón mira cómo son sus 8 primeras cartas (Marcas, quemadura, Cargas,
 * curación…) y su papel (tanque, tirador, mago…), y elige 12 «recetas» distintas con esa tendencia: 4 comunes, 5 raras y 3 épicas.
 * Uso: `npm run gen:cards`. Si cambias una receta, vuelve a ejecutarlo y revisa el resultado con `npm test`.
 */
import { writeFileSync } from 'node:fs';
import { BASE_CARD_LIST } from '../src/data/cards';
import { buildExtra, type ExtraEffect, type ExtraSpec } from '../src/data/cardGen';
import { MANUAL_SPECS } from '../src/data/cardsManual';
import { CHAMPION_IDS, CHAMPIONS } from '../src/data/champions';
import type { CardDef, CardType, Pos, Rarity, TargetKind } from '../src/engine/types';

// ——— azar determinista ———
function seeded(text: string): () => number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ——— perfil del campeón ———
type Tag = 'mark' | 'burn' | 'vuln' | 'stun' | 'charge' | 'heal' | 'block' | 'draw' | 'stress' | 'move' | 'aoe' | 'multi' | 'crit' | 'consume' | 'ally' | 'drain';
interface Profile {
  id: string;
  dt: 'p' | 'm';
  crit: boolean;
  role: 'tank' | 'support' | 'mage' | 'marksman' | 'assassin' | 'fighter';
  sweet: Pos[];
  feat: Record<Tag, number>;
  hasEpicStunAll: boolean;
  hasRevive: boolean;
}
const TAGS: Tag[] = ['mark', 'burn', 'vuln', 'stun', 'charge', 'heal', 'block', 'draw', 'stress', 'move', 'aoe', 'multi', 'crit', 'consume', 'ally', 'drain'];

function profileOf(id: string, base: CardDef[]): Profile {
  const def = CHAMPIONS[id as keyof typeof CHAMPIONS];
  const feat = Object.fromEntries(TAGS.map((t) => [t, 0])) as Record<Tag, number>;
  let phys = 0;
  let mag = 0;
  let hasEpicStunAll = false;
  let hasRevive = false;
  for (const c of base) {
    const dmg = c.effects.filter((e) => e.type === 'damage');
    if (dmg.length > 1) feat.multi++;
    if (c.target === 'allEnemies') feat.aoe++;
    if (c.target === 'ally' || c.target === 'allAllies') feat.ally++;
    for (const e of c.effects) {
      if (e.type === 'damage') {
        if (e.damageType === 'physical') phys++;
        else mag++;
        if (e.canCrit) feat.crit++;
        if (e.consumeStatus) feat.consume++;
      }
      if (e.type === 'applyStatus') {
        if (e.status === 'mark') feat.mark++;
        if (e.status === 'burn') feat.burn++;
        if (e.status === 'vulnerable') feat.vuln++;
        if (e.status === 'stun') feat.stun++;
        if (e.status === 'charge') feat.charge++;
      }
      if (e.type === 'heal') {
        feat.heal++;
        if (e.on === 'self') feat.drain++;
      }
      if (e.type === 'block') feat.block++;
      if (e.type === 'draw') feat.draw++;
      if (e.type === 'reduceStress') feat.stress++;
      if (e.type === 'move') feat.move++;
      if (e.type === 'revive') hasRevive = true;
    }
    if (c.rarity === 'epic' && c.target === 'allEnemies' && c.effects.some((e) => e.type === 'applyStatus' && e.status === 'stun')) hasEpicStunAll = true;
  }
  const role = def.role.toLowerCase();
  const kind: Profile['role'] = /tirador/.test(role) ? 'marksman' : /asesin/.test(role) ? 'assassin' : /tanque/.test(role) ? 'tank' : /apoyo|curaci/.test(role) ? 'support' : /mag/.test(role) ? 'mage' : 'fighter';
  return { id, dt: phys >= mag ? 'p' : 'm', crit: (def.stats.critChance ?? 0) > 0 || feat.crit > 0, role: kind, sweet: def.sweetSpot, feat, hasEpicStunAll, hasRevive };
}

// ——— recetas ———
interface Ctx {
  r: Rarity;
  p: Profile;
  rnd: () => number;
}
interface Draft {
  cost: number;
  type: CardType;
  target: TargetKind;
  e: ExtraEffect[];
  /** true: añade bono de posición (+3) si encaja. */
  bonus?: boolean;
}
type Stem = [string, 'm' | 'f'];
interface Recipe {
  id: string;
  tags: Tag[];
  rarities: Rarity[];
  stems: Stem[];
  make(c: Ctx): Draft | null;
}
const tier = <T,>(r: Rarity, c: T, ra: T, e: T): T => (r === 'common' ? c : r === 'rare' ? ra : e);
const costOf = (r: Rarity) => tier(r, 1, 2, 3);
const jit = (n: number, rnd: () => number) => {
  const w = n >= 8 ? 2 : 1;
  const r = rnd();
  return Math.max(1, n + (r < 0.2 ? -w : r < 0.4 ? -Math.ceil(w / 2) : r < 0.6 ? 0 : r < 0.8 ? Math.ceil(w / 2) : w));
};
const D = (n: number, c: Ctx, over: Partial<Extract<ExtraEffect, { k: 'dmg' }>> = {}): ExtraEffect => ({ k: 'dmg', n: jit(n, c.rnd), t: c.p.dt, ...over });
const B = (n: number, c: Ctx, self = false): ExtraEffect => ({ k: 'block', n: jit(n, c.rnd), ...(self ? { self: 1 as const } : {}) });
const H = (n: number, c: Ctx, self = false): ExtraEffect => ({ k: 'heal', n: jit(n, c.rnd), ...(self ? { self: 1 as const } : {}) });
const S = (n: number, c: Ctx, self = false): ExtraEffect => ({ k: 'stress', n: jit(n, c.rnd), ...(self ? { self: 1 as const } : {}) });
const SD = (n: number): ExtraEffect => ({ k: 'selfdmg', n });
const ST = (s: 'stun' | 'vulnerable' | 'mark' | 'burn' | 'charge', n = 1, self = false): ExtraEffect => ({ k: 'st', s, n, ...(self ? { self: 1 as const } : {}) });
const DR = (n: number): ExtraEffect => ({ k: 'draw', n });
const att = (c: Ctx, cost: number, e: ExtraEffect[], bonus = false): Draft => ({ cost, type: 'attack', target: 'enemy', e, bonus });
const ctl = (cost: number, e: ExtraEffect[]): Draft => ({ cost, type: 'control', target: 'enemy', e });
const aoe = (cost: number, e: ExtraEffect[]): Draft => ({ cost, type: 'skill', target: 'allEnemies', e });
const def = (cost: number, target: TargetKind, e: ExtraEffect[], bonus = false): Draft => ({ cost, type: 'defense', target, e, bonus });
const sup = (cost: number, target: TargetKind, e: ExtraEffect[]): Draft => ({ cost, type: 'support', target, e });
const skl = (cost: number, e: ExtraEffect[]): Draft => ({ cost, type: 'skill', target: 'self', e });
const ALL: Rarity[] = ['common', 'rare', 'epic'];
const CR: Rarity[] = ['common', 'rare'];
const RE: Rarity[] = ['rare', 'epic'];

const RECIPES: Recipe[] = [
  // ——— ataques a un enemigo ———
  { id: 'strike', tags: [], rarities: ALL, stems: [['Golpe', 'm'], ['Tajo', 'm'], ['Estocada', 'f'], ['Embestida', 'f'], ['Mandoble', 'm'], ['Zarpazo', 'm'], ['Impacto', 'm']],
    make: (c) => att(c, costOf(c.r), [D(tier(c.r, 6, 10, 15), c)], c.r !== 'epic') },
  { id: 'flurry', tags: ['multi'], rarities: ALL, stems: [['Ráfaga', 'f'], ['Andanada', 'f'], ['Lluvia', 'f'], ['Combo', 'm'], ['Salva', 'f'], ['Torbellino', 'm']],
    make: (c) => att(c, costOf(c.r), [D(tier(c.r, 3, 4, 5), c, { times: tier(c.r, 2, 3, 4) })]) },
  { id: 'critical', tags: ['crit'], rarities: ALL, stems: [['Golpe certero', 'm'], ['Disparo preciso', 'm'], ['Tajo mortal', 'm'], ['Estocada letal', 'f'], ['Remate', 'm']],
    make: (c) => (c.p.crit || c.rnd() < 0.25 ? att(c, costOf(c.r), [D(tier(c.r, 6, 10, 14), c, { crit: 1 })], c.r === 'common') : null) },
  { id: 'marker', tags: ['mark'], rarities: ALL, stems: [['Marca', 'f'], ['Sello', 'm'], ['Presa', 'f'], ['Señal', 'f'], ['Estigma', 'm']],
    make: (c) => att(c, costOf(c.r), [D(tier(c.r, 5, 7, 9), c), ST('mark', tier(c.r, 1, 2, 3))]) },
  { id: 'scorch', tags: ['burn'], rarities: ALL, stems: [['Llamarada', 'f'], ['Abrasador', 'm'], ['Incendio', 'm'], ['Chispazo', 'm']],
    make: (c) => att(c, costOf(c.r), [D(tier(c.r, 4, 6, 9), c), ST('burn', tier(c.r, 1, 2, 3))]) },
  { id: 'sunder', tags: ['vuln'], rarities: ALL, stems: [['Quiebre', 'm'], ['Fisura', 'f'], ['Rotura', 'f'], ['Desgarro', 'm'], ['Debilitar', 'm']],
    make: (c) => att(c, costOf(c.r), [D(tier(c.r, 5, 7, 10), c), ST('vulnerable', tier(c.r, 1, 1, 2))]) },
  { id: 'shove', tags: ['move'], rarities: CR, stems: [['Empellón', 'm'], ['Rechazo', 'm'], ['Sacudida', 'f'], ['Repulsión', 'f'], ['Choque', 'm']],
    make: (c) => att(c, costOf(c.r), c.r === 'common' ? [D(5, c), { k: 'push' }] : [D(8, c), { k: 'push' }, ST('vulnerable')]) },
  { id: 'hook', tags: ['move', 'stun'], rarities: ALL, stems: [['Gancho', 'm'], ['Cadena', 'f'], ['Anzuelo', 'm'], ['Lazo', 'm'], ['Arrastre', 'm']],
    make: (c) => ctl(costOf(c.r), [D(tier(c.r, 4, 6, 9), c), { k: 'pullto', to: 1 }, ...(c.r === 'common' ? [] : c.r === 'rare' ? [ST('vulnerable')] : [ST('stun')])]) },
  { id: 'stunstrike', tags: ['stun'], rarities: RE, stems: [['Golpe aturdidor', 'm'], ['Martillazo', 'm'], ['Conmoción', 'f'], ['Embate', 'm'], ['Porrazo', 'm']],
    make: (c) => ctl(costOf(c.r), [D(tier(c.r, 5, 6, 11), c), ST('stun')]) },
  { id: 'finisher', tags: ['mark', 'consume'], rarities: ALL, stems: [['Ejecución', 'f'], ['Remate', 'm'], ['Cosecha', 'f'], ['Sentencia', 'f'], ['Golpe de gracia', 'm']],
    make: (c) => att(c, costOf(c.r), [D(tier(c.r, 4, 6, 8), c, { cons: ['mark', 'target', tier(c.r, 3, 4, 6)] })]) },
  { id: 'charger', tags: ['charge', 'consume'], rarities: ALL, stems: [['Descarga', 'f'], ['Estallido', 'm'], ['Liberación', 'f'], ['Explosión', 'f'], ['Detonación', 'f']],
    make: (c) => att(c, costOf(c.r), [D(tier(c.r, 4, 6, 8), c, { cons: ['charge', 'self', tier(c.r, 3, 4, 6)] })]) },
  { id: 'builder', tags: ['charge'], rarities: ALL, stems: [['Acumular', 'm'], ['Carga', 'f'], ['Concentración', 'f'], ['Impulso', 'm'], ['Reserva', 'f']],
    make: (c) => att(c, costOf(c.r), [D(tier(c.r, 5, 7, 10), c), ST('charge', tier(c.r, 1, 2, 3), true)]) },
  { id: 'drain', tags: ['drain', 'heal'], rarities: ALL, stems: [['Mordisco', 'm'], ['Succión', 'f'], ['Sed de sangre', 'f'], ['Absorción', 'f'], ['Festín', 'm']],
    make: (c) => att(c, costOf(c.r), [D(tier(c.r, 4, 7, 11), c), H(tier(c.r, 3, 6, 10), c, true)]) },
  { id: 'dash', tags: ['move'], rarities: ALL, stems: [['Carga', 'f'], ['Salto', 'm'], ['Acometida', 'f'], ['Irrupción', 'f'], ['Zambullida', 'f']],
    make: (c) => att(c, costOf(c.r), [D(tier(c.r, 5, 8, 12), c), { k: 'mv', to: c.p.sweet[Math.floor(c.rnd() * c.p.sweet.length)] }]) },
  { id: 'cantrip', tags: ['draw'], rarities: CR, stems: [['Tanteo', 'm'], ['Provocación', 'f'], ['Roce', 'm'], ['Sondeo', 'm']],
    make: (c) => (c.r === 'common' ? att(c, 0, [D(3, c)]) : att(c, 1, [D(5, c), DR(1)])) },
  { id: 'bruiser', tags: ['block'], rarities: ALL, stems: [['Guardia ofensiva', 'f'], ['Contragolpe', 'm'], ['Parada', 'f'], ['Embestida protegida', 'f'], ['Réplica', 'f']],
    make: (c) => att(c, costOf(c.r), [D(tier(c.r, 4, 7, 11), c), B(tier(c.r, 4, 7, 11), c, true)]) },
  { id: 'smite', tags: [], rarities: ['epic'], stems: [['Golpe definitivo', 'm'], ['Cataclismo', 'm'], ['Sentencia final', 'f'], ['Ira', 'f'], ['Juicio', 'm']],
    make: (c) => att(c, 3, [D(17, c)]) },
  // ——— a todos los enemigos ———
  { id: 'volley', tags: ['aoe'], rarities: ALL, stems: [['Oleada', 'f'], ['Barrido', 'm'], ['Tormenta', 'f'], ['Estallido', 'm'], ['Onda', 'f'], ['Granizada', 'f']],
    make: (c) => aoe(costOf(c.r), [D(tier(c.r, 3, 5, 8), c)]) },
  { id: 'blight', tags: ['aoe', 'burn'], rarities: ALL, stems: [['Plaga', 'f'], ['Nube tóxica', 'f'], ['Veneno', 'm'], ['Fuego', 'm'], ['Marea ácida', 'f']],
    make: (c) => aoe(costOf(c.r), [D(tier(c.r, 3, 4, 7), c), ST('burn', tier(c.r, 1, 2, 2))]) },
  { id: 'expose', tags: ['aoe', 'vuln'], rarities: ALL, stems: [['Debilitar', 'm'], ['Escarcha', 'f'], ['Grito', 'm'], ['Mirada', 'f'], ['Pavor', 'm']],
    make: (c) => aoe(costOf(c.r), [D(tier(c.r, 3, 5, 7), c), ST('vulnerable', tier(c.r, 1, 1, 2))]) },
  { id: 'tag', tags: ['aoe', 'mark'], rarities: ALL, stems: [['Rastro', 'm'], ['Cacería', 'f'], ['Baliza', 'f'], ['Caza', 'f']],
    make: (c) => aoe(costOf(c.r), [D(tier(c.r, 2, 4, 6), c), ST('mark', tier(c.r, 1, 1, 2))]) },
  { id: 'quake', tags: ['aoe', 'stun'], rarities: ['epic'], stems: [['Temblor', 'm'], ['Cataclismo', 'm'], ['Aullido', 'm'], ['Estruendo', 'm'], ['Maldición', 'f']],
    make: (c) => (c.p.hasEpicStunAll && c.rnd() < 0.7 ? null : aoe(3, [D(8, c), ST('stun')])) },
  { id: 'barrage', tags: ['aoe', 'multi'], rarities: RE, stems: [['Lluvia', 'f'], ['Bombardeo', 'm'], ['Metralla', 'f'], ['Furia', 'f'], ['Aluvión', 'm']],
    make: (c) => aoe(costOf(c.r), [D(tier(c.r, 3, 3, 4), c, { times: tier(c.r, 2, 2, 3) })]) },
  { id: 'reap', tags: ['aoe', 'mark', 'consume'], rarities: RE, stems: [['Siega', 'f'], ['Cosecha', 'f'], ['Guadaña', 'f'], ['Barrido letal', 'm'], ['Vendimia', 'f']],
    make: (c) => aoe(costOf(c.r), [D(tier(c.r, 4, 4, 6), c, { cons: ['mark', 'target', tier(c.r, 3, 3, 5)] })]) },
  // ——— defensa ———
  { id: 'guard', tags: ['block'], rarities: ALL, stems: [['Guardia', 'f'], ['Escudo', 'm'], ['Muro', 'm'], ['Coraza', 'f'], ['Baluarte', 'm'], ['Barrera', 'f']],
    make: (c) => def(costOf(c.r), 'self', [B(tier(c.r, 8, 12, 17), c)], c.r === 'common') },
  { id: 'bulwark', tags: ['block', 'charge'], rarities: ALL, stems: [['Temple', 'm'], ['Fortaleza', 'f'], ['Resistencia', 'f'], ['Postura firme', 'f'], ['Aguante', 'm']],
    make: (c) => def(costOf(c.r), 'self', [B(tier(c.r, 6, 9, 14), c, true), ST('charge', tier(c.r, 1, 2, 3), true)]) },
  { id: 'recover', tags: ['block', 'heal', 'drain'], rarities: ALL, stems: [['Recuperación', 'f'], ['Respiro', 'm'], ['Sosiego', 'm'], ['Regeneración', 'f'], ['Descanso', 'm']],
    make: (c) => def(costOf(c.r), 'self', [B(tier(c.r, 6, 9, 14), c, true), H(tier(c.r, 3, 6, 10), c, true)]) },
  { id: 'brace', tags: ['block', 'draw'], rarities: CR, stems: [['Cautela', 'f'], ['Previsión', 'f'], ['Estrategia', 'f'], ['Astucia', 'f'], ['Maniobra', 'f']],
    make: (c) => def(c.r === 'common' ? 1 : 2, 'self', [B(c.r === 'common' ? 5 : 8, c, true), DR(1)]) },
  { id: 'shield', tags: ['block', 'ally'], rarities: ALL, stems: [['Escudo aliado', 'm'], ['Protección', 'f'], ['Amparo', 'm'], ['Égida', 'f'], ['Resguardo', 'm']],
    make: (c) => def(costOf(c.r), 'ally', [B(tier(c.r, 8, 12, 16), c)]) },
  { id: 'ward', tags: ['block', 'ally', 'move'], rarities: CR, stems: [['Rescate', 'm'], ['Salvaguarda', 'f'], ['Retirada', 'f'], ['Cobijo', 'm'], ['Refugio', 'm']],
    make: (c) => def(costOf(c.r), 'ally', [B(c.r === 'common' ? 6 : 10, c), { k: 'allyto', to: 4 }]) },
  { id: 'aegis', tags: ['block', 'ally', 'aoe'], rarities: ALL, stems: [['Muralla', 'f'], ['Formación', 'f'], ['Bastión', 'm'], ['Cúpula', 'f'], ['Estandarte', 'm']],
    make: (c) => def(costOf(c.r), 'allAllies', [B(tier(c.r, 4, 6, 10), c)]) },
  { id: 'dodge', tags: ['block', 'move'], rarities: CR, stems: [['Esquiva', 'f'], ['Pirueta', 'f'], ['Evasión', 'f'], ['Paso lateral', 'm'], ['Cabriola', 'f']],
    make: (c) => def(c.r === 'common' ? 1 : 2, 'self', [B(c.r === 'common' ? 5 : 8, c, true), { k: 'mv', to: c.p.sweet[Math.floor(c.rnd() * c.p.sweet.length)] }]) },
  // ——— apoyo ———
  { id: 'mend', tags: ['heal', 'ally'], rarities: ALL, stems: [['Sanación', 'f'], ['Bálsamo', 'm'], ['Cura', 'f'], ['Alivio', 'm'], ['Tónico', 'm'], ['Ungüento', 'm']],
    make: (c) => sup(costOf(c.r), 'ally', [H(tier(c.r, 7, 11, 16), c)]) },
  { id: 'mendward', tags: ['heal', 'block', 'ally'], rarities: ALL, stems: [['Cuidado', 'm'], ['Abrazo', 'm'], ['Vendaje', 'm'], ['Consuelo', 'm'], ['Remedio', 'm']],
    make: (c) => sup(costOf(c.r), 'ally', [H(tier(c.r, 5, 8, 12), c), B(tier(c.r, 3, 6, 10), c)]) },
  { id: 'rally', tags: ['heal', 'ally', 'aoe'], rarities: ALL, stems: [['Himno', 'm'], ['Plegaria', 'f'], ['Canción', 'f'], ['Rezo', 'm'], ['Bendición', 'f']],
    make: (c) => sup(costOf(c.r), 'allAllies', [H(tier(c.r, 3, 5, 8), c)]) },
  { id: 'soothe', tags: ['stress', 'ally'], rarities: ALL, stems: [['Calma', 'f'], ['Serenidad', 'f'], ['Sosiego', 'm'], ['Paz', 'f'], ['Alivio', 'm']],
    make: (c) => sup(costOf(c.r), 'ally', [S(tier(c.r, 7, 11, 16), c)]) },
  { id: 'calmall', tags: ['stress', 'ally', 'aoe'], rarities: ALL, stems: [['Armonía', 'f'], ['Melodía', 'f'], ['Quietud', 'f'], ['Tregua', 'f'], ['Murmullo', 'm']],
    make: (c) => sup(costOf(c.r), 'allAllies', c.r === 'common' ? [S(4, c)] : [S(tier(c.r, 4, 6, 9), c), B(tier(c.r, 0, 2, 4), c)]) },
  { id: 'renew', tags: ['heal', 'stress', 'ally', 'aoe'], rarities: RE, stems: [['Renacimiento', 'm'], ['Florecer', 'm'], ['Manantial', 'm'], ['Aurora', 'f'], ['Primavera', 'f']],
    make: (c) => sup(costOf(c.r), 'allAllies', c.r === 'rare' ? [H(4, c), S(4, c)] : [H(7, c), S(6, c), B(4, c)]) },
  { id: 'revive', tags: ['heal', 'ally'], rarities: ['epic'], stems: [['Segunda oportunidad', 'f'], ['Resurrección', 'f'], ['Retorno', 'm'], ['Último aliento', 'm'], ['Despertar', 'm']],
    make: (c) => (c.p.hasRevive || (c.p.role !== 'support' && c.rnd() < 0.75) ? null : sup(3, 'ally', [{ k: 'revive', n: 20 }])) },
  { id: 'selfheal', tags: ['heal', 'drain'], rarities: CR, stems: [['Meditación', 'f'], ['Trago', 'm'], ['Vigor', 'm'], ['Concentración curativa', 'f'], ['Rejuvenecer', 'm']],
    make: (c) => sup(c.r === 'common' ? 1 : 2, 'self', c.r === 'common' ? [H(6, c, true)] : [H(10, c, true), B(4, c, true)]) },
  // ——— más variedad: precio en vida, debilitar sin dañar, combinaciones raras ———
  { id: 'bloodpact', tags: ['draw'], rarities: CR, stems: [['Pacto de sangre', 'm'], ['Sacrificio', 'm'], ['Ofrenda', 'f'], ['Apuesta', 'f'], ['Trueque', 'm']],
    make: (c) => skl(c.r === 'common' ? 0 : 1, c.r === 'common' ? [SD(4), DR(2)] : [SD(5), DR(2), ST('charge', 2, true)]) },
  { id: 'reckless', tags: ['drain'], rarities: ALL, stems: [['Arrebato', 'm'], ['Temeridad', 'f'], ['Locura', 'f'], ['Frenesí', 'm'], ['Desesperación', 'f']],
    make: (c) => att(c, tier(c.r, 1, 2, 3), [D(tier(c.r, 9, 14, 20), c), SD(tier(c.r, 3, 4, 5))]) },
  { id: 'compose', tags: ['stress', 'block'], rarities: CR, stems: [['Templanza', 'f'], ['Calma interior', 'f'], ['Respiración profunda', 'f'], ['Autodominio', 'm'], ['Mente fría', 'f']],
    make: (c) => def(c.r === 'common' ? 1 : 2, 'self', [S(c.r === 'common' ? 8 : 14, c, true), B(c.r === 'common' ? 5 : 8, c, true)]) },
  { id: 'overload', tags: ['charge'], rarities: RE, stems: [['Sobrecarga', 'f'], ['Fusión', 'f'], ['Descontrol', 'm'], ['Ruptura de límites', 'f'], ['Pico de poder', 'm']],
    make: (c) => skl(c.r === 'rare' ? 1 : 2, [ST('charge', c.r === 'rare' ? 3 : 5, true), SD(c.r === 'rare' ? 3 : 4)]) },
  { id: 'warcry', tags: ['vuln', 'aoe'], rarities: CR, stems: [['Grito de guerra', 'm'], ['Desafío', 'm'], ['Bramido', 'm'], ['Provocación', 'f'], ['Aullido', 'm']],
    make: (c) => aoe(c.r === 'common' ? 1 : 2, [ST('vulnerable', c.r === 'common' ? 1 : 2), ...(c.r === 'rare' ? [DR(1)] : [])]) },
  { id: 'bait', tags: ['mark', 'vuln'], rarities: RE, stems: [['Cebo', 'm'], ['Emboscada', 'f'], ['Trampa', 'f'], ['Celada', 'f'], ['Engaño', 'm']],
    make: (c) => ctl(costOf(c.r), [D(tier(c.r, 4, 5, 8), c), ST('mark', c.r === 'rare' ? 1 : 2), ST('vulnerable', c.r === 'rare' ? 1 : 2)]) },
  { id: 'siege', tags: ['burn'], rarities: ['epic'], stems: [['Asedio', 'm'], ['Incineración', 'f'], ['Hoguera', 'f'], ['Fuego devastador', 'm'], ['Bombardeo ígneo', 'm']],
    make: (c) => att(c, 3, [D(11, c), ST('burn', 3)]) },
  { id: 'bastion', tags: ['block', 'charge'], rarities: ['rare'], stems: [['Bastión férreo', 'm'], ['Torre', 'f'], ['Trinchera', 'f'], ['Ciudadela', 'f'], ['Roca firme', 'f']],
    make: (c) => def(2, 'self', [B(13, c, true), ST('charge', 2, true)]) },
  { id: 'twinmark', tags: ['mark', 'multi'], rarities: RE, stems: [['Doble marca', 'f'], ['Saeta gemela', 'f'], ['Par de dagas', 'm'], ['Tijera', 'f'], ['Colmillos gemelos', 'm']],
    make: (c) => att(c, costOf(c.r), [D(tier(c.r, 3, 4, 5), c, { times: 2 }), ST('mark', c.r === 'rare' ? 1 : 2)]) },
  { id: 'harass', tags: ['mark'], rarities: ['common'], stems: [['Hostigamiento', 'm'], ['Pinchazo', 'm'], ['Escaramuza', 'f'], ['Tiro de tanteo', 'm'], ['Rasguño', 'm']],
    make: (c) => att(c, 0, [D(2, c), ST('mark')]) },
  { id: 'spearhead', tags: ['move', 'vuln'], rarities: RE, stems: [['Vanguardia', 'f'], ['Punta de lanza', 'f'], ['Carga frontal', 'f'], ['Irrupción', 'f'], ['Arremetida', 'f']],
    make: (c) => att(c, costOf(c.r), [D(tier(c.r, 5, 7, 10), c), ST('vulnerable'), { k: 'mv', to: c.p.sweet[0] }]) },
  { id: 'toll', tags: ['mark', 'burn'], rarities: RE, stems: [['Tributo', 'm'], ['Maldición', 'f'], ['Hechizo', 'm'], ['Peste', 'f'], ['Condena', 'f']],
    make: (c) => att(c, costOf(c.r), [D(tier(c.r, 4, 6, 9), c), ST('mark', c.r === 'rare' ? 1 : 2), ST('burn', c.r === 'rare' ? 1 : 2)]) },
  { id: 'renewself', tags: ['heal', 'charge'], rarities: RE, stems: [['Fuente de vida', 'f'], ['Segunda piel', 'f'], ['Savia', 'f'], ['Renovación', 'f'], ['Latido', 'm']],
    make: (c) => sup(costOf(c.r), 'self', [H(tier(c.r, 6, 9, 14), c, true), ST('charge', c.r === 'rare' ? 1 : 2, true)]) },
  // ——— utilidad ———
  { id: 'focus', tags: ['charge'], rarities: ALL, stems: [['Preparación', 'f'], ['Enfoque', 'm'], ['Furia contenida', 'f'], ['Sobrecarga', 'f'], ['Tensión', 'f']],
    make: (c) => skl(tier(c.r, 1, 2, 3), tier<ExtraEffect[]>(c.r, [ST('charge', 2, true)], [ST('charge', 3, true), DR(1)], [ST('charge', 4, true), DR(2)])) },
  { id: 'insight', tags: ['draw'], rarities: RE, stems: [['Visión', 'f'], ['Inspiración', 'f'], ['Estudio', 'm'], ['Presentimiento', 'm'], ['Plan', 'm']],
    make: (c) => skl(c.r === 'rare' ? 1 : 2, c.r === 'rare' ? [DR(2)] : [DR(3), B(4, c, true)]) },
  { id: 'tempo', tags: ['draw', 'charge'], rarities: ['common'], stems: [['Ritmo', 'm'], ['Instinto', 'm'], ['Respiración', 'f'], ['Pulso', 'm']],
    make: () => skl(0, [ST('charge', 1, true), DR(1)]) },
  { id: 'markall', tags: ['mark', 'aoe'], rarities: ALL, stems: [['Señalar', 'm'], ['Marcar', 'm'], ['Rastreo', 'm'], ['Escrutinio', 'm'], ['Lista negra', 'f']],
    make: (c) => aoe(tier(c.r, 1, 1, 2), tier<ExtraEffect[]>(c.r, [ST('mark')], [ST('mark'), DR(1)], [ST('mark', 2), DR(1)])) },
  { id: 'hinder', tags: ['vuln'], rarities: ['common'], stems: [['Obstáculo', 'm'], ['Zancadilla', 'f'], ['Trampa', 'f'], ['Estorbo', 'm'], ['Hostigar', 'm']],
    make: (c) => ctl(1, [D(3, c), ST('vulnerable')]) },
];

// ——— nombres ———
const TRAIT_ADJ: Record<string, [string, string][]> = {
  Marcas: [['certero', 'certera'], ['letal', 'letal']],
  Quemadura: [['ardiente', 'ardiente'], ['ígneo', 'ígnea']],
  Vulnerable: [['debilitante', 'debilitante'], ['implacable', 'implacable']],
  Aturdimientos: [['brutal', 'brutal'], ['atronador', 'atronadora']],
  Cargas: [['crepitante', 'crepitante'], ['eléctrico', 'eléctrica']],
  Curación: [['vital', 'vital'], ['sereno', 'serena']],
  Protección: [['férreo', 'férrea'], ['inquebrantable', 'inquebrantable']],
  Desplazamiento: [['veloz', 'veloz'], ['fugaz', 'fugaz']],
  Atracción: [['magnético', 'magnética'], ['voraz', 'voraz']],
  Crítico: [['mortal', 'mortal'], ['afilado', 'afilada']],
  Área: [['devastador', 'devastadora'], ['expansivo', 'expansiva']],
  Ráfagas: [['frenético', 'frenética'], ['incesante', 'incesante']],
  'Robo de vida': [['sanguinario', 'sanguinaria'], ['voraz', 'voraz']],
  'Robo de cartas': [['astuto', 'astuta'], ['ingenioso', 'ingeniosa']],
  Estrés: [['sereno', 'serena'], ['sosegado', 'sosegada']],
  Reanimar: [['eterno', 'eterna'], ['sagrado', 'sagrada']],
  'Daño masivo': [['colosal', 'colosal'], ['brutal', 'brutal']],
  Robo: [['astuto', 'astuta']],
};
const GENERIC_ADJ: [string, string][] = [['feroz', 'feroz'], ['salvaje', 'salvaje'], ['sombrío', 'sombría'], ['radiante', 'radiante'], ['gélido', 'gélida'], ['arcano', 'arcana'], ['místico', 'mística'], ['audaz', 'audaz'], ['oscuro', 'oscura'], ['fulgurante', 'fulgurante'], ['rápido', 'rápida'], ['ancestral', 'ancestral'], ['violento', 'violenta'], ['sutil', 'sutil'], ['furioso', 'furiosa']];

function nameFor(recipe: Recipe, r: Rarity, champ: string, traits: string[], taken: Set<string>, rnd: () => number): string {
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const adjPool = [...traits.flatMap((t) => TRAIT_ADJ[t] ?? []), ...GENERIC_ADJ];
  for (let tries = 0; tries < 60; tries++) {
    const [stem, g] = pick(recipe.stems);
    let name: string;
    if (r === 'epic' && tries % 2 === 0) name = `${stem} de ${champ}`;
    else if (tries % 5 === 4) name = stem;
    else {
      const [m, f] = pick(adjPool);
      name = `${stem} ${g === 'm' ? m : f}`;
    }
    if (!taken.has(name.toLowerCase())) return name;
  }
  return `${pick(recipe.stems)[0]} ${taken.size}`;
}

// ——— selección ———
const BIAS = {
  tank: { block: 1.4, stun: 0.8, ally: 0.5, drain: 0.4, charge: 0.4 },
  support: { heal: 1.4, ally: 1.4, stress: 0.8, block: 0.4 },
  mage: { aoe: 0.9, burn: 0.7, mark: 0.7, vuln: 0.5, consume: 0.4 },
  marksman: { crit: 1.1, multi: 1, charge: 0.7, mark: 0.5 },
  assassin: { crit: 0.8, mark: 0.9, consume: 0.9, move: 0.9, multi: 0.8 },
  fighter: { drain: 0.7, charge: 0.7, stun: 0.5, block: 0.6, multi: 0.5 },
} as const;

/** Recetas de apoyo a aliados: solo en las épicas de apoyos y tanques. */
const ALLY_RECIPES = ['soothe', 'calmall', 'renew', 'mend', 'mendward', 'rally', 'revive', 'shield', 'aegis', 'ward'];
const OFFENSIVE: Tag[] = ['multi', 'crit', 'mark', 'consume', 'aoe', 'burn', 'stun', 'vuln'];

function weight(rc: Recipe, p: Profile, r: Rarity): number {
  let w = 1;
  const helper = p.role === 'support' || p.role === 'tank';
  if (ALLY_RECIPES.includes(rc.id) && !helper) w *= r === 'epic' ? 0 : 0.35;
  if (r === 'epic' && rc.tags.some((t) => OFFENSIVE.includes(t))) w *= 1.8;
  for (const t of rc.tags) {
    w += Math.min(p.feat[t] ?? 0, 3) * 0.35;
    w += (BIAS[p.role] as Record<string, number>)[t] ?? 0;
  }
  return w;
}

/** Efecto añadido a una receta para que dos cartas parecidas no sean idénticas. */
function rider(d: Draft, c: Ctx): void {
  if (c.rnd() > (c.r === 'common' ? 0.3 : 0.45) || d.e.length >= 3 || d.e.some((e) => e.k === 'revive' || e.k === 'selfdmg')) return;
  const has = (k: string, s?: string) => d.e.some((e) => e.k === k && (!s || (e as { s?: string }).s === s));
  const options: ExtraEffect[] = [];
  if (!has('st', 'charge') && d.target !== 'allAllies') options.push(ST('charge', 1, true));
  if (d.type !== 'support' && d.type !== 'defense' && d.target !== 'ally' && d.target !== 'allAllies') {
    if (!has('st', 'mark')) options.push(ST('mark'));
    if (c.r !== 'common' && !has('st', 'vulnerable')) options.push(ST('vulnerable'));
    if (c.r !== 'common' && !has('st', 'burn')) options.push(ST('burn'));
  }
  if (!has('block') && d.target !== 'allAllies') options.push(B(tier(c.r, 3, 4, 6), c, true));
  if (c.r !== 'common' && !has('draw')) options.push(DR(1));
  if (c.r !== 'common' && !has('heal') && d.target !== 'allAllies') options.push(H(tier(c.r, 3, 3, 5), c, true));
  if (!options.length) return;
  d.e.push(options[Math.floor(c.rnd() * options.length)]);
}

const sig = (c: Pick<CardDef, 'cost' | 'type' | 'target' | 'effects'>) => JSON.stringify([c.cost, c.type, c.target, c.effects]);

function generate(id: string): ExtraSpec[] {
  const base = BASE_CARD_LIST.filter((c) => c.owner === id);
  const prefix = base[0].id.replace(/\d+$/, '');
  const p = profileOf(id, base);
  const rnd = seeded(id);
  const taken = new Set(base.map((c) => c.name.toLowerCase()));
  const sigs = new Set(base.map(sig));
  const used = new Set<string>();
  const out: ExtraSpec[] = [];
  const champ = CHAMPIONS[id as keyof typeof CHAMPIONS].name;
  const traits = CHAMPIONS[id as keyof typeof CHAMPIONS].traits;
  // objetivo por campeón: 9 comunes, 7 raras y 4 épicas (las 8 primeras ya tienen su reparto)
  const have = (r: Rarity) => base.filter((c) => c.rarity === r).length;
  const need: Record<Rarity, number> = { epic: Math.max(0, 4 - have('epic')), rare: Math.max(0, 7 - have('rare')), common: Math.max(0, 9 - have('common')) };
  while (need.epic + need.rare + need.common > 12) need[need.common >= need.rare ? 'common' : 'rare']--;
  while (need.epic + need.rare + need.common < 12) need[need.common <= need.rare ? 'common' : 'rare']++;
  const slots: Rarity[] = [...Array(need.epic).fill('epic'), ...Array(need.rare).fill('rare'), ...Array(need.common).fill('common')];
  let n = 9;
  for (const r of slots) {
    let chosen: { rc: Recipe; d: Draft } | null = null;
    for (let tries = 0; tries < 80 && !chosen; tries++) {
      const pool = RECIPES.filter((x) => x.rarities.includes(r) && !used.has(x.id));
      // al menos dos cartas defensivas o de apoyo y una de área entre las 12: se fuerzan al final si faltan
      const need = out.filter((o) => o.type === 'defense' || o.type === 'support').length < 2 && slots.length - out.length <= 4;
      const pool2 = need ? pool.filter((x) => ['guard', 'bulwark', 'recover', 'brace', 'shield', 'ward', 'aegis', 'dodge', 'mend', 'mendward', 'rally', 'soothe', 'calmall', 'renew', 'selfheal'].includes(x.id)) : pool;
      const cand = pool2.length ? pool2 : pool;
      const total = cand.reduce((a, x) => a + weight(x, p, r), 0);
      let t = rnd() * total;
      let rc = cand[cand.length - 1];
      for (const x of cand) {
        t -= weight(x, p, r);
        if (t <= 0) {
          rc = x;
          break;
        }
      }
      const ctx = { r, p, rnd };
      const d = rc.make(ctx);
      if (d) rider(d, ctx);
      if (!d) {
        used.add(rc.id); // receta descartada para este campeón
        continue;
      }
      const spec: ExtraSpec = { id: 'tmp', owner: id, name: 'tmp', cost: d.cost, type: d.type, target: d.target, rarity: r, e: d.e };
      const eff = buildExtra(spec).card;
      if (sigs.has(sig(eff))) continue;
      sigs.add(sig(eff));
      chosen = { rc, d };
    }
    if (!chosen) throw new Error(`${id}: sin receta para ${r}`);
    used.add(chosen.rc.id);
    const { rc, d } = chosen;
    const name = nameFor(rc, r, champ, traits, taken, rnd);
    taken.add(name.toLowerCase());
    const spec: ExtraSpec = { id: `${prefix}${n++}`, owner: id, name, cost: d.cost, type: d.type, target: d.target, rarity: r, e: d.e };
    // bono de posición: solo si encaja (ataque, defensa o curación) y alguna vez
    if (d.bonus && rnd() < 0.6) {
      const first = d.e[0];
      if (first.k === 'dmg') spec.b = [{ k: 'dmg', n: 3, t: first.t }];
      else if (first.k === 'block') spec.b = [{ k: 'block', n: 3 }];
      if (spec.b) spec.i = [...p.sweet];
    }
    out.push(spec);
  }
  return out;
}

const all: ExtraSpec[] = [];
const manual = new Set(MANUAL_SPECS.map((c) => c.owner));
for (const id of CHAMPION_IDS) if (!manual.has(id)) all.push(...generate(id));
writeFileSync(new URL('../src/data/cardsExtra.json', import.meta.url), JSON.stringify(all) + '\n');
const byRarity = all.reduce<Record<string, number>>((a, c) => ((a[c.rarity] = (a[c.rarity] ?? 0) + 1), a), {});
console.log(`${all.length} cartas extra generadas (${manual.size} campeones con cartas escritas a mano en cardsManual.ts)`, byRarity);
