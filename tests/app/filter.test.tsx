// @vitest-environment jsdom
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { NO_FILTER, matchChampion } from '../../src/components/ChampionFilter';
import { CHAMPION_IDS, LANE_OF, LANES } from '../../src/data/champions';
import { game } from '../../src/state/gameStore';

beforeEach(() => {
  act(() => {
    game.getState().meta.maxAscension = 0;
    game.toMenu();
  });
});

describe('filtro de campeones', () => {
  it('cada campeón está en exactamente una línea', () => {
    const all = Object.values(LANES).flat();
    expect(all).toHaveLength(CHAMPION_IDS.length);
    expect(new Set(all).size).toBe(CHAMPION_IDS.length);
    for (const id of CHAMPION_IDS) expect(LANE_OF[id], id).toBeDefined();
  });

  it('busca sin tildes ni mayúsculas, por nombre, rol, rasgo o línea', () => {
    expect(matchChampion('zed', { ...NO_FILTER, q: 'ZED' })).toBe(true);
    expect(matchChampion('lux', { ...NO_FILTER, q: 'daño magico' })).toBe(true);
    expect(matchChampion('leona', { ...NO_FILTER, q: 'aturdimientos' })).toBe(true);
    expect(matchChampion('jinx', { ...NO_FILTER, q: 'tirador' })).toBe(true);
    expect(matchChampion('jinx', { ...NO_FILTER, q: 'zed' })).toBe(false);
    expect(matchChampion('jinx', { q: '', lane: 'Jungla' })).toBe(false);
    expect(matchChampion('jinx', { q: '', lane: 'Tirador' })).toBe(true);
  });

  it('Desbloqueos: escribir en el buscador deja solo los campeones que encajan', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^Desbloqueos/ }));
    const before = screen.getAllByRole('button', { name: /Desbloquear/ }).length;
    await user.type(screen.getByLabelText('Buscar campeón'), 'thresh');
    const list = screen.getAllByRole('button', { name: /Desbloquear · 120 Esquirlas \(/ });
    expect(list).toHaveLength(1);
    expect(list[0]).toHaveTextContent('Thresh');
    expect(screen.getByRole('status', { name: '' })).toBeDefined;
    await user.clear(screen.getByLabelText('Buscar campeón'));
    await user.click(within(screen.getByRole('group', { name: 'Línea' })).getByRole('button', { name: 'Jungla' }));
    expect(screen.getAllByRole('button', { name: /Desbloquear · 120 Esquirlas \(/ }).length).toBeLessThanOrEqual(LANES.Jungla.length);
    expect(before).toBeGreaterThan(100);
  });
});
