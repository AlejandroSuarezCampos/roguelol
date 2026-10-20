import { CONFIG } from '../engine/config';
import type { CrisisKind, Omen, StatusId } from '../engine/types';
import type { MistTier } from '../engine/mist';
import type { StressTier } from '../engine/stress';

export const OMEN_INFO: Record<Omen, { name: string; text: string }> = {
  lament: { name: 'Lamento', text: `Jugar una carta de un caído: +${CONFIG.omen.lamentStress} de estrés a todos los aliados vivos.` },
  weight: { name: 'Peso', text: `Las cartas de un caído cuestan +${CONFIG.omen.weightCost} de energía.` },
  drift: { name: 'Deriva', text: 'Las cartas de un caído no eligen objetivo: van al más adelantado (o, si curan, al aliado con menos vida).' },
  bleed: { name: 'Sangrado', text: `Jugar una carta de un caído: ${CONFIG.omen.bleedDamage} de daño al aliado de la posición 1.` },
};

export const CRISIS_INFO: Record<CrisisKind, { name: string; text: string }> = {
  rage: { name: 'Ira', text: `Sus ataques hacen +${CONFIG.crisis.rageDamage} de daño, no puede apuntar a aliados y suma +${CONFIG.crisis.rageStressOthers} de estrés a los demás cada turno.` },
  selfish: { name: 'Egoísmo', text: 'Sus cartas cuestan 1 menos, pero solo se puede jugar una carta de otro campeón por turno.' },
  panic: { name: 'Pánico', text: 'No puede jugar cartas de Ataque y retrocede una posición al empezar cada turno.' },
  despair: { name: 'Desesperación', text: `Sus curaciones curan la mitad y cada carta suya le suma +${CONFIG.crisis.despairSelfStress} de estrés.` },
};

export const STATUS_INFO: Record<StatusId, { name: string; icon: string; text: string }> = {
  mark: { name: 'Marca', icon: 'mark', text: 'Marcado: algunas cartas de Lux consumen las Marcas para hacer más daño.' },
  stun: { name: 'Aturdido', icon: 'stun', text: 'No actúa en su próximo turno.' },
  shadowMark: { name: 'Marca de sombra', icon: 'void', text: `Cuando este enemigo ataca, suma +${CONFIG.mist.shadowMarkStress} de estrés a su objetivo.` },
  burn: { name: 'Quemadura', icon: 'burn', text: 'Al empezar su turno recibe daño verdadero igual a las acumulaciones, y pierde 1.' },
  charge: { name: 'Carga', icon: 'charge', text: 'Recurso de Yasuo: algunas cartas lo consumen para hacer más daño.' },
  vulnerable: { name: 'Vulnerable', icon: 'warn', text: `Recibe +${CONFIG.status.vulnerableBonus * 100}% de daño. Pierde 1 acumulación por ronda.` },
};

export const MIST_INFO: Record<MistTier, { name: string; text: string }> = {
  haze: { name: 'Bruma', text: 'Sin efectos.' },
  mist: { name: 'Niebla', text: `Las intenciones de estrés enemigas suman +${CONFIG.mist.intentStressBonus}. Oro +${CONFIG.mist.goldBonus * 100}%.` },
  dense: { name: 'Niebla densa', text: `Además, los enemigos empiezan con Marca de sombra. El botín ofrece ${CONFIG.mist.denseCardOptions} cartas. El jefe ataca dos veces.` },
  ruin: { name: 'Ruina', text: `Además, enemigos con +${Math.round((CONFIG.mist.ruinHpMultiplier - 1) * 100)}% de vida. Los combates normales pueden soltar reliquia.` },
};

export const STRESS_LABEL: Record<StressTier, string> = {
  calm: 'Sereno', uneasy: 'Inquieto', overwhelmed: 'Agobiado', edge: 'Al límite', crisis: 'Crisis',
};

export const NODE_INFO: Record<string, { name: string; icon: string; text: string }> = {
  combat: { name: 'Combate', icon: 'card', text: 'Un grupo de monstruos de las Islas de la Sombra.' },
  elite: { name: 'Élite', icon: 'elite', text: 'Enemigo poderoso. Sube más la niebla; siempre suelta reliquia y casi siempre una poción.' },
  boss: { name: 'Jefe', icon: 'boss', text: 'Viego, el Rey Arruinado. Vencerlo gana la expedición.' },
  rest: { name: 'Descanso', icon: 'rest', text: 'Cura a todos, calma el estrés o trata una herida.' },
  shop: { name: 'Comerciante', icon: 'shop', text: 'Compra cartas y pociones, trata heridas o elimina cartas del mazo con oro.' },
  event: { name: 'Evento', icon: 'event', text: 'Una decisión con ganancia y coste. Algunas opciones no se pueden deshacer.' },
  chest: { name: 'Tesoro', icon: 'chest', text: 'Un cofre con una reliquia. Todo el piso del medio del mapa es de tesoros.' },
  shrine: { name: 'Santuario', icon: 'shrine', text: 'Un efecto poderoso con un coste claro. Siempre puedes marcharte.' },
};

