// @vitest-environment jsdom
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { cardOf } from '../../src/engine/cards';
import { availableNodes } from '../../src/engine/expedition';
import { game } from '../../src/state/gameStore';

const go = (fn: () => void) => act(fn);

beforeEach(() => {
  go(() => game.toMenu());
  vi.spyOn(window, 'confirm').mockReturnValue(true);
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

  it('las opciones aún no implementadas están deshabilitadas', () => {
    render(<App />);
    for (const name of [/Equipo/, /Mejoras/, /Archivo/]) expect(screen.getByRole('button', { name })).toBeDisabled();
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

describe('resultado', () => {
  it('retirarse lleva a la pantalla de retirada', async () => {
    const user = userEvent.setup();
    toBattle();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Retirada/ }));
    expect(screen.getByRole('heading', { name: 'Retirada' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Menú principal' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Shattered/);
  });
});
