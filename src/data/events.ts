import type { Rarity } from '../engine/types';

export type EventEffect =
  | { type: 'gold'; amount: number }
  | { type: 'healAll'; fraction: number }
  /** Daño a todos los campeones en pie; los eventos nunca derriban (mínimo 1 de vida). */
  | { type: 'damageAll'; amount: number }
  | { type: 'stressAll'; amount: number }
  | { type: 'mist'; amount: number }
  | { type: 'addCard'; rarity?: Rarity }
  | { type: 'addPotion' }
  | { type: 'wound' };

export interface EventChoice {
  label: string;
  /** Lo que se gana y lo que cuesta, tal y como se enseña antes de elegir (ganancia en verde, coste en rojo). */
  gain: string;
  cost: string;
  tone: 'ok' | 'warn' | '';
  effects: EventEffect[];
  requiresGold?: number;
  /** Pide confirmación: no se puede deshacer. */
  irreversible?: boolean;
  /** Texto narrativo tras elegir. */
  result: string;
}

export interface EventDef {
  id: string;
  title: string;
  /** Clave de la imagen de fondo/ilustración (ver `ui/images.ts`). */
  art: 'void' | 'camp' | 'menu';
  text: string[];
  choices: EventChoice[];
}

/** Eventos provisionales: formato del prototipo, `[Acción] ganancia · coste`. */
export const EVENTS: EventDef[] = [
  {
    id: 'void_altar', title: 'Santuario del Vacío', art: 'void',
    text: ['La niebla se abre sobre un altar de coral negro. En su centro late una esquirla que no refleja la luz: la absorbe.', 'Lux se estremece. «Me susurra… pero no sé si quiero entenderlo».'],
    choices: [
      { label: 'Conservar la esquirla', gain: 'Una carta épica al azar', cost: '+15 de estrés a todos', tone: 'warn', effects: [{ type: 'addCard', rarity: 'epic' }, { type: 'stressAll', amount: 15 }], result: 'La esquirla se funde con vuestras armas. El susurro no se detiene.' },
      { label: 'Purificarla', gain: '−15 de estrés a todos', cost: '60 de oro', tone: 'ok', requiresGold: 60, effects: [{ type: 'gold', amount: -60 }, { type: 'stressAll', amount: -15 }], result: 'El coral se deshace en ceniza blanca. El aire se aligera.' },
      { label: 'Abandonarla', gain: 'Nada', cost: 'Pierdes la oportunidad', tone: '', irreversible: true, effects: [], result: 'Dais la espalda al altar. La niebla se cierra tras vosotros.' },
    ],
  },
  {
    id: 'ghost_ferryman', title: 'El barquero fantasma', art: 'menu',
    text: ['Un barquero translúcido espera junto a un canal de agua negra. Sostiene una linterna que no da calor.', '«Cruzad conmigo y descansad. O sentaos y escuchad lo que vi al fondo».'],
    choices: [
      { label: 'Pagar el pasaje', gain: 'Cura el 25% a todos', cost: '30 de oro', tone: 'ok', requiresGold: 30, effects: [{ type: 'gold', amount: -30 }, { type: 'healAll', fraction: 0.25 }], result: 'El barco avanza sin ruido. Al otro lado, las heridas duelen menos.' },
      { label: 'Escuchar su historia', gain: 'Una carta rara al azar', cost: '+12 de niebla', tone: 'warn', effects: [{ type: 'addCard', rarity: 'rare' }, { type: 'mist', amount: 12 }], result: 'Lo que cuenta os enseña algo… y la niebla se espesa a vuestro alrededor.' },
      { label: 'Ignorarlo', gain: 'Nada', cost: 'Nada', tone: '', effects: [], result: 'El barquero os ve marchar sin decir palabra.' },
    ],
  },
  {
    id: 'fallen_altar', title: 'Altar de los Caídos', art: 'void',
    text: ['Un círculo de lápidas rodea un altar manchado. Alguien ha dejado monedas de oro oxidado en la piedra.', 'Cada lápida lleva el nombre de un campeón que no volvió.'],
    choices: [
      { label: 'Ofrenda de sangre', gain: '60 de oro', cost: '−8 de vida a todos', tone: 'warn', effects: [{ type: 'damageAll', amount: 8 }, { type: 'gold', amount: 60 }], result: 'La piedra bebe. Las monedas brillan un instante y pasan a vuestras manos.' },
      { label: 'Rezar por los caídos', gain: '−12 de estrés a todos', cost: '+8 de niebla', tone: 'warn', effects: [{ type: 'stressAll', amount: -12 }, { type: 'mist', amount: 8 }], result: 'El silencio pesa menos. Algo, a lo lejos, ha tomado nota.' },
      { label: 'Marcharse', gain: 'Nada', cost: 'Nada', tone: '', effects: [], result: 'No es vuestro altar.' },
    ],
  },
  {
    id: 'chained_chest', title: 'Cofre encadenado', art: 'camp',
    text: ['Un cofre cubierto de cadenas cuelga de un árbol muerto. Las cadenas se mueven sin viento.', 'Del interior llega un tintineo de monedas… y algo más.'],
    choices: [
      { label: 'Romper las cadenas', gain: '90 de oro', cost: 'Una herida grave a un campeón', tone: 'warn', effects: [{ type: 'gold', amount: 90 }, { type: 'wound' }], result: 'Las cadenas se rompen con un grito. Alguien del equipo no volverá a ser el mismo.' },
      { label: 'Forzar la cerradura', gain: 'Una poción', cost: '−6 de vida a todos', tone: 'warn', effects: [{ type: 'addPotion' }, { type: 'damageAll', amount: 6 }], result: 'La cerradura cede con una descarga. Dentro hay un frasco intacto.' },
      { label: 'Dejarlo', gain: 'Nada', cost: 'Nada', tone: '', effects: [], result: 'Las cadenas se aquietan cuando os alejáis.' },
    ],
  },
  {
    id: 'abandoned_camp', title: 'Campamento abandonado', art: 'camp',
    text: ['Una hoguera aún tibia, tiendas rasgadas y ni rastro de sus dueños.', 'Todo está dispuesto como si fueran a volver enseguida.'],
    choices: [
      { label: 'Registrar las tiendas', gain: 'Una poción y 25 de oro', cost: '+10 de niebla', tone: 'warn', effects: [{ type: 'addPotion' }, { type: 'gold', amount: 25 }, { type: 'mist', amount: 10 }], result: 'Encontráis algo útil. Tenéis la sensación de que os miran.' },
      { label: 'Dormir junto a las brasas', gain: 'Cura el 20% y −10 de estrés a todos', cost: '+15 de niebla', tone: 'warn', effects: [{ type: 'healAll', fraction: 0.2 }, { type: 'stressAll', amount: -10 }, { type: 'mist', amount: 15 }], result: 'Dormís mejor de lo que deberíais. La niebla entra con el sueño.' },
      { label: 'Seguir camino', gain: 'Nada', cost: 'Nada', tone: '', effects: [], result: 'Dejáis el campamento tal y como estaba.' },
    ],
  },
];
