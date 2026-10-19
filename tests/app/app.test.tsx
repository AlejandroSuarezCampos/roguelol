// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { it, expect } from 'vitest';
import { App } from '../../src/app/App';

it('muestra el menú principal', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Shattered\s*Runeterra/);
  expect(screen.getByRole('button', { name: /Expedición/ })).toBeEnabled();
});
