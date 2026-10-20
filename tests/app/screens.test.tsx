// @vitest-environment jsdom
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { cardOf } from '../../src/engine/cards';
import { availableNodes } from '../../src/engine/expedition';
import { game } from '../../src/state/gameStore';

const go = (fn: () => void) => act(fn);

beforeEach(() => {
  go(() => game.toMenu());
});

function toBattle(seed = 3) {
  go(() => {
    game.newExpedition(seed);
    game.startExpedition();
    game.chooseNode(availableNodes(game.getState().expedition!)[0].id);
  });
}

describe('menú y preparación', () => {
  it('desde el menú se llega a la preparación y de ahí al mapa', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Expedición/ }));
    expect(screen.getByText('Orden de combate')).toBeInTheDocument();
    expect(screen.getByText(/Presagio de los caídos/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Comenzar' }));
    expect(screen.getByText('Mapa de expedición')).toBeInTheDocument();
  });

  it('Equipo, Mejoras y Archivo abren su pantalla y se vuelve al menú', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (const [name, heading] of [[/^Equipo/, 'Equipo'], [/^Mejoras/, 'Mejoras'], [/^Archivo/, 'Archivo']] as const) {
      await user.click(screen.getByRole('button', { name }));
      expect(screen.getByText(heading, { selector: '.where b' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Volver al menú' }));
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Shattered/);
    }
  });

  it('mover a un campeón hacia el frente cambia su posición', async () => {
    const user = userEvent.setup();
    go(() => game.newExpedition(1));
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Mover a Soraka hacia el frente' }));
    expect(game.getState().expedition!.run.champions.find((c) => c.id === 'soraka')!.pos).toBe(3);
  });
});

describe('mapa', () => {
  it('solo se puede pulsar un nodo disponible y «Entrar» lleva al combate', async () => {
    const user = userEvent.setup();
    go(() => {
      game.newExpedition(1);
      game.startExpedition();
    });
    render(<App />);
    const locked = screen.getAllByRole('button', { name: /no alcanzable/ });
    for (const b of locked) expect(b).toBeDisabled();
    await user.click(screen.getAllByRole('button', { name: /disponible/ })[0]);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByLabelText('Escenario de combate')).toBeInTheDocument();
  });
});

describe('combate', () => {
  it('muestra a los 4 aliados, los enemigos con su intención y una mano de 5 cartas', () => {
    toBattle();
    render(<App />);
    const stage = screen.getByLabelText('Escenario de combate');
    expect(within(stage).getAllByRole('group').filter((g) => /posición/.test(g.getAttribute('aria-label') ?? ''))).toHaveLength(6);
    expect(within(stage).getAllByLabelText(/^Intención de/).length).toBeGreaterThan(0);
    expect(within(screen.getByRole('group', { name: 'Mano' })).getAllByRole('button')).toHaveLength(5);
    expect(screen.getByRole('img', { name: /Energía 3 de 3/ })).toBeInTheDocument();
  });

  it('seleccionar una carta de enemigo marca los objetivos y jugarla sobre uno gasta energía', async () => {
    const user = userEvent.setup();
    toBattle();
    render(<App />);
    const s = game.getState().combat!;
    const idx = s.hand.findIndex((c) => cardOf(s, c).target === 'enemy' && cardOf(s, c).cost <= s.energy);
    if (idx < 0) return;
    const hand = within(screen.getByRole('group', { name: 'Mano' })).getAllByRole('button');
    await user.click(hand[idx]);
    const targets = screen.getAllByRole('button').filter((b) => b.classList.contains('legal'));
    expect(targets.length).toBeGreaterThan(0);
    const before = s.energy;
    await user.click(targets[0]);
    expect(game.getState().combat!.energy).toBeLessThan(before);
  });

  it('una carta que no se puede jugar explica por qué al pulsarla', async () => {
    const user = userEvent.setup();
    toBattle();
    go(() => {
      game.getState().combat!.energy = 0;
      game.notify(null);
    });
    render(<App />);
    const hand = within(screen.getByRole('group', { name: 'Mano' })).getAllByRole('button');
    const costly = hand.find((b) => b.getAttribute('aria-disabled') === 'true')!;
    await user.click(costly);
    expect(screen.getByRole('status')).toHaveTextContent(/Energía insuficiente/);
  });

  it('Esc cancela la selección y las teclas numéricas eligen carta', async () => {
    const user = userEvent.setup();
    toBattle();
    render(<App />);
    const s = game.getState().combat!;
    const i = s.hand.findIndex((c) => cardOf(s, c).cost <= s.energy && ['self', 'allEnemies', 'allAllies'].includes(cardOf(s, c).target));
    if (i < 0) return;
    await user.keyboard(String(i + 1));
    expect(game.getState().selectedUid).toBe(s.hand[i].uid);
    await user.keyboard('{Escape}');
    expect(game.getState().selectedUid).toBeNull();
  });

  it('terminar el turno avanza el contador', async () => {
    const user = userEvent.setup();
    toBattle();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Terminar turno' }));
    expect(game.getState().combat!.turn).toBe(2);
  });

  it('al ganar aparece la ventana de victoria y «Recoger botín» abre el botín', async () => {
    const user = userEvent.setup();
    toBattle();
    go(() => {
      const s = game.getState().combat!;
      for (const u of s.units) if (u.side === 'enemy') { u.hp = 0; u.downed = true; }
      s.outcome = 'won';
      game.notify(null);
    });
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Recoger botín' }));
    expect(screen.getByText('Recompensas')).toBeInTheDocument();
  });
});

describe('botín y descanso', () => {
  it('elegir una carta la añade al mazo y no se puede elegir otra', async () => {
    const user = userEvent.setup();
    toBattle();
    go(() => {
      const s = game.getState().combat!;
      for (const u of s.units) if (u.side === 'enemy') { u.hp = 0; u.downed = true; }
      s.outcome = 'won';
      game.concludeCombat();
    });
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Elegir carta' }));
    const dialog = screen.getByRole('dialog', { name: 'Elige una carta' });
    await user.click(within(dialog).getAllByRole('button', { pressed: false })[0]);
    await user.click(screen.getByRole('button', { name: 'Añadir al mazo' }));
    expect(game.getState().expedition!.deck).toHaveLength(21);
    expect(screen.queryByRole('button', { name: 'Elegir carta' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText('Mapa de expedición')).toBeInTheDocument();
  });

  it('el descanso permite una acción y muestra que ya se usó', async () => {
    const user = userEvent.setup();
    go(() => {
      game.newExpedition(2);
      game.startExpedition();
      const e = game.getState().expedition!;
      e.currentId = 'n5-0';
      const rest = e.map.nodes.find((n) => n.floor === 6)!;
      e.map.nodes.find((n) => n.id === 'n5-0')!.next = [rest.id];
      e.run.champions[0].hp = 10;
      game.chooseNode(rest.id);
    });
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Descansar/ }));
    expect(game.getState().expedition!.run.champions[0].hp).toBeGreaterThan(10);
    expect(screen.getByRole('button', { name: /Meditar/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Seguir camino' }));
    expect(screen.getByText('Mapa de expedición')).toBeInTheDocument();
  });
});

describe('confirmación de retirada', () => {
  it('explica el oro que se conserva según la dificultad, y cancelar no hace nada', async () => {
    const user = userEvent.setup();
    go(() => {
      game.newExpedition(3, 'nightmare');
      game.startExpedition();
      game.getState().expedition!.run.gold = 80;
      game.notify(null);
    });
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Retirada/ }));
    const d = screen.getByRole('alertdialog');
    expect(d).toHaveTextContent(/25%/);
    expect(d).toHaveTextContent(/20 de 80/);
    expect(d).toHaveTextContent(/Pesadilla/);
    await user.click(within(d).getByRole('button', { name: 'Volver' }));
    expect(game.getState().expedition!.status).toBe('active');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('resultado', () => {
  it('retirarse lleva a la pantalla de retirada', async () => {
    const user = userEvent.setup();
    toBattle();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Retirada/ }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Retirarme' }));
    expect(screen.getByRole('heading', { name: 'Retirada' })).toBeInTheDocument();
    expect(screen.getByText(/Consecuencias de la retirada/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Menú principal' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Shattered/);
  });
});

function goToNode(type: 'shop' | 'event', seed = 2) {
  go(() => {
    game.newExpedition(seed);
    game.startExpedition();
    const e = game.getState().expedition!;
    const target = e.map.nodes.find((n) => n.type === type)!;
    e.currentId = 'n0-0';
    e.map.nodes.find((n) => n.id === 'n0-0')!.next = [target.id];
    game.chooseNode(target.id);
  });
}

describe('comerciante', () => {
  it('muestra las mercancías con su precio y deshabilita lo que no se puede pagar', () => {
    goToNode('shop');
    go(() => {
      game.getState().expedition!.run.gold = 60;
      game.notify(null);
    });
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Cartas' })).toBeInTheDocument();
    const buys = screen.getAllByRole('button', { name: /^Comprar/ });
    expect(buys.length).toBeGreaterThanOrEqual(6);
    expect(buys.some((b) => b.hasAttribute('disabled'))).toBe(true);
    expect(screen.getAllByText(/^Faltan \d+/).length).toBeGreaterThan(0);
  });

  it('comprar una carta la marca como vendida', async () => {
    const user = userEvent.setup();
    goToNode('shop');
    go(() => {
      game.getState().expedition!.run.gold = 999;
      game.notify(null);
    });
    render(<App />);
    const before = game.getState().expedition!.deck.length;
    await user.click(screen.getAllByRole('button', { name: /^Comprar/ })[0]);
    expect(game.getState().expedition!.deck).toHaveLength(before + 1);
    expect(screen.getAllByText('Vendido').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Salir de la tienda' }));
    expect(screen.getByText('Mapa de expedición')).toBeInTheDocument();
  });

  it('eliminar una carta pide elegirla y sube el precio', async () => {
    const user = userEvent.setup();
    goToNode('shop');
    go(() => {
      game.getState().expedition!.run.gold = 999;
      game.notify(null);
    });
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Comprar Eliminar carta/ }));
    const dialog = screen.getByRole('dialog', { name: 'Eliminar una carta' });
    await user.click(within(dialog).getAllByRole('button', { name: 'Eliminar' })[0]);
    expect(game.getState().expedition!.deck).toHaveLength(19);
    expect(game.getState().expedition!.removals).toBe(1);
  });
});

describe('precios del comerciante según la dificultad', () => {
  it('«Tratar herida» muestra y cobra el precio con el modificador de Pesadilla', async () => {
    const user = userEvent.setup();
    go(() => {
      game.newExpedition(2, 'nightmare');
      game.startExpedition();
      const e = game.getState().expedition!;
      const target = e.map.nodes.find((n) => n.type === 'shop')!;
      e.currentId = 'n0-0';
      e.map.nodes.find((n) => n.id === 'n0-0')!.next = [target.id];
      e.wounds.leona = 1;
      e.run.gold = 31;
      game.chooseNode(target.id);
    });
    render(<App />);
    const buy = screen.getByRole('button', { name: /Comprar Tratar herida por 31 de oro/ });
    expect(buy).toBeEnabled();
    await user.click(buy);
    expect(game.getState().expedition!.run.gold).toBe(0);
    expect(game.getState().expedition!.wounds.leona).toBe(0);
  });
});

describe('evento', () => {
  it('muestra las 3 opciones y, al elegir, el resultado y «Continuar»', async () => {
    const user = userEvent.setup();
    goToNode('event');
    render(<App />);
    const ev = game.getState().event!;
    expect(screen.getByRole('heading', { name: ev.title, level: 2 })).toBeInTheDocument();
    const leave = ev.choices.findIndex((c) => c.effects.length === 0 && !c.irreversible);
    const choice = leave >= 0 ? leave : ev.choices.findIndex((c) => c.effects.length === 0);
    await user.click(screen.getByRole('button', { name: new RegExp(`\\[${ev.choices[choice].label}\\]`) }));
    if (ev.choices[choice].irreversible) await user.click(screen.getByRole('button', { name: 'Elegir' }));
    expect(screen.getByText(ev.choices[choice].result, { exact: false })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText('Mapa de expedición')).toBeInTheDocument();
  });

  it('las opciones irreversibles piden confirmación antes de aplicarse', async () => {
    const user = userEvent.setup();
    goToNode('event');
    go(() => {
      // fuerza el evento con salida irreversible
      const ev = game.getState().event!;
      if (!ev.choices.some((c) => c.irreversible)) return;
    });
    const ev = game.getState().event!;
    const i = ev.choices.findIndex((c) => c.irreversible);
    if (i < 0) return;
    render(<App />);
    await user.click(screen.getByRole('button', { name: new RegExp(`\\[${ev.choices[i].label}\\]`) }));
    expect(screen.getByRole('dialog', { name: 'Confirmar' })).toBeInTheDocument();
    expect(game.getState().eventOutcome).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Volver' }));
    expect(game.getState().eventOutcome).toBeNull();
  });
});

describe('menú con guardado', () => {
  it('muestra «Continuar» con el piso y el oro, y pide confirmar antes de empezar otra', async () => {
    const user = userEvent.setup();
    go(() => {
      game.newExpedition(3);
      game.startExpedition(); // autoguarda en localStorage
      game.toMenu();
    });
    render(<App />);
    expect(screen.getByRole('button', { name: /Continuar/ })).toHaveTextContent(/Entrada · 0 de oro/);
    await user.click(screen.getByRole('button', { name: /Empezar una nueva/ }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/se perderá/);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Orden de combate')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Continuar/ }));
    expect(screen.getByText('Mapa de expedición')).toBeInTheDocument();
  });
});

describe('gear y pantalla de equipo', () => {
  it('desde el mapa se abre Equipo, se equipa un objeto del inventario y se ven las estadísticas finales', async () => {
    const user = userEvent.setup();
    go(() => {
      game.newExpedition(1);
      game.startExpedition();
      game.getState().expedition!.inventory.push('infinity', 'warmog');
    });
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Equipo \(2 sin equipar\)/ }));
    expect(screen.getByRole('heading', { name: /Leona · Tanque/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Yasuo/ }));
    await user.click(screen.getAllByRole('button', { name: 'Equipar en Yasuo' })[0]);
    expect(game.getState().expedition!.gear.yasuo.weapon).toBe('infinity');
    expect(screen.getByText('Filo infinito')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Quitar' }));
    expect(game.getState().expedition!.gear.yasuo.weapon).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Volver al mapa' }));
    expect(screen.getByText('Mapa de expedición')).toBeInTheDocument();
  });

  it('el botín de gear permite comparar y equipar en un campeón', async () => {
    const user = userEvent.setup();
    toBattle();
    go(() => {
      const s = game.getState().combat!;
      for (const u of s.units) if (u.side === 'enemy') { u.hp = 0; u.downed = true; }
      s.outcome = 'won';
      game.concludeCombat();
      game.getState().rewards!.gear = ['rabadon', 'infinity', 'warmog'];
      game.notify(null);
    });
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Elegir objeto' }));
    const dialog = screen.getByRole('dialog', { name: 'Elige un objeto' });
    await user.click(within(dialog).getByRole('button', { name: /Sombrero mortal de Rabadon/ }));
    expect(within(dialog).getAllByText(/AP \+45/).length).toBeGreaterThan(0);
    await user.click(within(dialog).getByRole('button', { name: 'Lux' }));
    expect(game.getState().expedition!.gear.lux.weapon).toBe('rabadon');
    expect(screen.getByText('Elegido')).toBeInTheDocument();
  });

  it('el comerciante vende objetos', async () => {
    const user = userEvent.setup();
    goToNode('shop');
    go(() => {
      game.getState().expedition!.run.gold = 999;
      game.notify(null);
    });
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Objetos' })).toBeInTheDocument();
    const item = game.getState().expedition!.shop!.gear[0];
    const { GEAR } = await import('../../src/data/gear');
    await user.click(screen.getByRole('button', { name: new RegExp(`^Comprar ${GEAR[item.gearId].name} por`) }));
    expect(game.getState().expedition!.inventory).toEqual([item.gearId]);
  });
});

describe('reliquias en pantalla', () => {
  it('el combate muestra los orbes de las reliquias con su texto accesible y la activa pulsa', () => {
    go(() => {
      game.newExpedition(3);
      game.getState().expedition!.run.relics.push('stone', 'clock');
      game.startExpedition();
      game.chooseNode(availableNodes(game.getState().expedition!)[0].id);
    });
    render(<App />);
    const bar = screen.getByRole('group', { name: 'Reliquias' });
    expect(within(bar).getAllByRole('button')).toHaveLength(2);
    expect(within(bar).getByRole('button', { name: /Talismán de piedra.*5 de bloqueo/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Energía 4 de 3/ })).toBeInTheDocument();
  });

  it('pulsar un orbe abre su descripción', async () => {
    const user = userEvent.setup();
    go(() => {
      game.newExpedition(3);
      game.getState().expedition!.run.relics.push('heart');
      game.startExpedition();
      game.chooseNode(availableNodes(game.getState().expedition!)[0].id);
    });
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Corazón incandescente/ }));
    expect(screen.getByText(/recupera 6 de vida/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Corazón incandescente/ }));
    expect(screen.queryByText(/recupera 6 de vida/)).not.toBeInTheDocument();
  });

  it('el mapa y Equipo listan las reliquias con su texto', async () => {
    const user = userEvent.setup();
    go(() => {
      game.newExpedition(3);
      game.getState().expedition!.run.relics.push('lamp');
      game.startExpedition();
    });
    render(<App />);
    expect(screen.getByText(/Reliquias \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/la Niebla sube 2 menos/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Equipo/ }));
    expect(screen.getByText(/Reliquias \(1\)/)).toBeInTheDocument();
  });

  it('el botín enseña las reliquias nuevas y lo que han hecho las de expedición', () => {
    go(() => {
      game.newExpedition(3);
      game.getState().expedition!.run.relics.push('heart');
      game.startExpedition();
      game.chooseNode(availableNodes(game.getState().expedition!)[0].id);
      const s = game.getState().combat!;
      for (const u of s.units) if (u.side === 'enemy') { u.hp = 0; u.downed = true; }
      s.outcome = 'won';
      game.concludeCombat();
    });
    render(<App />);
    expect(screen.getByText(/Corazón incandescente: \+6 de vida/)).toBeInTheDocument();
  });
});

describe('Pesadilla en pantalla', () => {
  it('la preparación explica la muerte permanente al elegir Pesadilla y se puede volver a Normal', async () => {
    const user = userEvent.setup();
    go(() => game.newExpedition(2));
    render(<App />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Pesadilla/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(/muere para siempre/);
    expect(game.getState().expedition!.difficulty).toBe('nightmare');
    expect(screen.getAllByText('Pesadilla').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('radio', { name: /Normal/ }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('en combate avisa de quién morirá si sigue derribado', () => {
    go(() => {
      game.newExpedition(3, 'nightmare');
      game.startExpedition();
      game.chooseNode(availableNodes(game.getState().expedition!)[0].id);
      const lux = game.getState().combat!.units.find((u) => u.id === 'lux')!;
      lux.hp = 0;
      lux.downed = true;
      game.notify(null);
    });
    render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Lux está derribado/);
  });

  it('en Normal no hay aviso de muerte', () => {
    go(() => {
      game.newExpedition(3);
      game.startExpedition();
      game.chooseNode(availableNodes(game.getState().expedition!)[0].id);
      const lux = game.getState().combat!.units.find((u) => u.id === 'lux')!;
      lux.hp = 0;
      lux.downed = true;
      game.notify(null);
    });
    render(<App />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('Equipo y Resultado marcan a los muertos', async () => {
    const user = userEvent.setup();
    go(() => {
      game.newExpedition(3, 'nightmare');
      game.startExpedition();
      const e = game.getState().expedition!;
      e.dead.push('lux');
      e.run.champions = e.run.champions.filter((c) => c.id !== 'lux');
      e.deck = e.deck.filter((id) => !id.startsWith('x'));
      game.notify(null);
    });
    render(<App />);
    expect(screen.getByText(/Caídos: Lux/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Equipo/ }));
    expect(screen.getByLabelText('Lux: muerto')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Volver al mapa' }));
    await user.click(screen.getByRole('button', { name: /Retirada/ }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Retirarme' }));
    expect(screen.getByText('Muerto para siempre')).toBeInTheDocument();
  });
});

describe('forja en el descanso', () => {
  function atRest() {
    go(() => {
      game.newExpedition(2);
      game.startExpedition();
      const e = game.getState().expedition!;
      e.currentId = 'n5-0';
      const rest = e.map.nodes.find((n) => n.floor === 6)!;
      e.map.nodes.find((n) => n.id === 'n5-0')!.next = [rest.id];
      game.chooseNode(rest.id);
    });
  }

  it('Forjar permite elegir una carta, ver el antes y el después y mejorarla', async () => {
    const user = userEvent.setup();
    atRest();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Forjar/ }));
    const dialog = screen.getByRole('dialog', { name: 'Forjar una carta' });
    expect(within(dialog).getByRole('button', { name: 'Mejorar' })).toBeDisabled();
    const grid = dialog.querySelector('.forgegrid')!;
    await user.click(within(grid as HTMLElement).getAllByRole('button')[0]);
    expect(dialog.querySelector('.forgecmp')).not.toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'Mejorar' }));
    expect(game.getState().expedition!.deck.filter((id) => id.endsWith('+'))).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Descansar/ })).toBeDisabled();
  });

  it('una carta mejorada llega mejorada al combate', () => {
    go(() => {
      game.newExpedition(2);
      game.startExpedition();
      const e = game.getState().expedition!;
      e.deck = e.deck.map((id) => `${id}+`);
      game.chooseNode(availableNodes(e)[0].id);
    });
    render(<App />);
    expect(screen.getAllByText('Mejorada').length).toBeGreaterThan(0);
  });
});


describe('metaprogresión en pantalla', () => {
  it('Mejoras: sin Esquirlas no se compra; con ellas sube el nivel y se actualiza el saldo', async () => {
    const user = userEvent.setup();
    go(() => game.openMenuScreen('upgrades'));
    render(<App />);
    expect(screen.getByRole('button', { name: /Comprar Vigor nivel 1/ })).toBeDisabled();
    expect(screen.getAllByText(/^Faltan \d+/).length).toBeGreaterThan(0);
    go(() => {
      game.getState().meta.shards = 100;
      game.notify(null);
    });
    await user.click(screen.getByRole('button', { name: /Comprar Vigor nivel 1/ }));
    expect(game.getState().meta.perks.vigor).toBe(1);
    expect(screen.getByLabelText(/60 Esquirlas/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Nivel 1 de 3' })).toBeInTheDocument();
  });

  it('Mejoras: borrar el progreso pide confirmación', async () => {
    const user = userEvent.setup();
    go(() => {
      game.openMenuScreen('upgrades');
      game.getState().meta.shards = 70;
      game.notify(null);
    });
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Borrar progreso' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Volver' }));
    expect(game.getState().meta.shards).toBe(70);
    await user.click(screen.getByRole('button', { name: 'Borrar progreso' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Borrar todo' }));
    expect(game.getState().meta.shards).toBe(0);
  });

  it('Archivo: el bestiario oculta lo no visto y enseña lo descubierto', async () => {
    const user = userEvent.setup();
    go(() => {
      game.openMenuScreen('archive');
      game.getState().meta.bestiary.wolf = { seen: 3, defeated: 2 };
    });
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Bestiario' }));
    expect(screen.getByText('Gran lobo sombrío')).toBeInTheDocument();
    expect(screen.getByText(/Visto 3 veces · derrotado 2/)).toBeInTheDocument();
    expect(screen.getAllByText('???').length).toBeGreaterThan(0);
    expect(screen.getByText(/Ataque \d+ a la posición 1/)).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Historial' }));
    expect(screen.getByText('Expediciones')).toBeInTheDocument();
  });

  it('Equipo del menú: muestra las 8 cartas del campeón y alterna a la versión mejorada', async () => {
    const user = userEvent.setup();
    go(() => game.openMenuScreen('roster'));
    render(<App />);
    expect(screen.getByRole('heading', { name: /Leona · Tanque/ })).toBeInTheDocument();
    expect(screen.getByText('Escudo del amanecer')).toBeInTheDocument();
    expect(screen.queryByText('Mejorada')).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /mejorada/ }));
    expect(screen.getAllByText('Mejorada')).toHaveLength(8);
    await user.click(screen.getByRole('button', { name: /^Yasuo/ }));
    expect(screen.getByRole('heading', { name: /Yasuo · Daño/ })).toBeInTheDocument();
  });

  it('el resultado muestra las Esquirlas ganadas', async () => {
    const user = userEvent.setup();
    toBattle();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Retirada/ }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Retirarme' }));
    expect(screen.getByText(/\+\d+ Esquirlas · total \d+/)).toBeInTheDocument();
  });
});

describe('Enter con una carta ya elegida', () => {
  it('juega la carta aunque el foco esté en ella (no la deselecciona)', async () => {
    const user = userEvent.setup();
    toBattle();
    render(<App />);
    const s = game.getState().combat!;
    const i = s.hand.findIndex((c) => ['self', 'allEnemies', 'allAllies'].includes(cardOf(s, c).target) && cardOf(s, c).cost <= s.energy);
    if (i < 0) return;
    const hand = within(screen.getByRole('group', { name: 'Mano' })).getAllByRole('button');
    await user.click(hand[i]); // elige la carta con el ratón: queda enfocada
    expect(game.getState().selectedUid).toBe(s.hand[i].uid);
    const before = game.getState().combat!.hand.length;
    await user.keyboard('{Enter}');
    expect(game.getState().combat!.hand.length).toBe(before - 1);
  });
});

describe('atajos de teclado con ventanas abiertas', () => {
  it('con la confirmación de retirada abierta, «e» no termina el turno ni los dígitos eligen carta', async () => {
    const user = userEvent.setup();
    toBattle();
    render(<App />);
    const turn = game.getState().combat!.turn;
    await user.click(screen.getByRole('button', { name: /Retirada/ }));
    await user.keyboard('e');
    await user.keyboard('1');
    expect(game.getState().combat!.turn).toBe(turn);
    expect(game.getState().selectedUid).toBeNull();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('Enter sobre «Terminar turno» no juega además la carta seleccionada', async () => {
    const user = userEvent.setup();
    toBattle();
    render(<App />);
    const s = game.getState().combat!;
    const i = s.hand.findIndex((c) => ['self', 'allEnemies', 'allAllies'].includes(cardOf(s, c).target) && cardOf(s, c).cost <= s.energy);
    if (i < 0) return;
    await user.keyboard(String(i + 1));
    const energy = s.energy;
    screen.getByRole('button', { name: 'Terminar turno' }).focus();
    await user.keyboard('{Enter}');
    // Enter es del botón enfocado: termina el turno y no ejecuta además el atajo «jugar la carta seleccionada»
    expect(game.getState().combat!.turn).toBe(2);
    expect(game.getState().combat!.energy).toBeGreaterThanOrEqual(energy);
  });
});

describe('posiciones tras una muerte', () => {
  function nightmareWithGap() {
    go(() => {
      game.newExpedition(3, 'nightmare');
      game.startExpedition();
      const e = game.getState().expedition!;
      e.dead.push('leona'); // la posición 1 queda vacía
      e.run.champions = e.run.champions.filter((c) => c.id !== 'leona');
      e.deck = e.deck.filter((id) => !id.startsWith('l'));
      game.notify(null);
    });
  }

  it('en Equipo se puede reordenar gratis, también hacia un hueco', async () => {
    const user = userEvent.setup();
    nightmareWithGap();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^Equipo/ }));
    await user.click(screen.getByRole('button', { name: /^Yasuo/ }));
    expect(screen.getByText('Posición 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hacia el frente' }));
    expect(game.getState().expedition!.run.champions.find((c) => c.id === 'yasuo')!.pos).toBe(1);
    expect(screen.getByText('Posición 1')).toBeInTheDocument();
  });

  it('en combate, el modo intercambio ofrece mover un aliado al hueco', async () => {
    const user = userEvent.setup();
    nightmareWithGap();
    go(() => game.chooseNode(availableNodes(game.getState().expedition!)[0].id));
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Intercambiar/ }));
    await user.click(screen.getByRole('button', { name: /^Yasuo, posición 2/ }));
    await user.click(screen.getByRole('button', { name: 'Posición 1 vacía: mover aquí' }));
    expect(game.getState().combat!.units.find((u) => u.id === 'yasuo')!.pos).toBe(1);
    expect(game.getState().combat!.energy).toBe(2);
  });
});

describe('pantalla del tesoro', () => {
  function enterChest() {
    go(() => {
      game.newExpedition(2);
      game.startExpedition();
      const e = game.getState().expedition!;
      const first = availableNodes(e)[0];
      e.map.nodes.find((n) => n.id === first.id)!.type = 'chest';
      game.chooseNode(first.id);
    });
  }

  it('muestra las 3 ofertas, pide confirmar y cierra el cofre', async () => {
    const user = userEvent.setup();
    enterChest();
    render(<App />);
    expect(screen.getAllByRole('button', { name: 'Llevármelo' })).toHaveLength(3);
    await user.click(screen.getAllByRole('button', { name: 'Llevármelo' })[0]);
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent(/perderás las otras dos/);
    await user.click(within(dialog).getByRole('button', { name: 'Volver' }));
    expect(game.getState().expedition!.chest!.taken).toBeNull();
    await user.click(screen.getAllByRole('button', { name: 'Llevármelo' })[0]);
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Llevármelo' }));
    expect(game.getState().expedition!.run.gold).toBe(90);
    expect(screen.getByText('El cofre se ha cerrado.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Llevármelo' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText('Mapa de expedición')).toBeInTheDocument();
  });

  it('se puede dejar el cofre sin elegir', async () => {
    const user = userEvent.setup();
    enterChest();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Dejar el cofre' }));
    expect(screen.getByText('Mapa de expedición')).toBeInTheDocument();
    expect(game.getState().expedition!.run.gold).toBe(0);
  });
});
