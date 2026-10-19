// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { it, expect } from 'vitest';
import { App } from '../../src/app/App';

it('monta la app', () => {
  render(<App />);
  expect(screen.getByText('Shattered Runeterra')).toBeInTheDocument();
});
