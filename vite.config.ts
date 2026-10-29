import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Los datos de 167 campeones y 1336 cartas pasan de 500 kB; el reparto en trozos queda para la fase 6 del plan.
  build: { chunkSizeWarningLimit: 1200 },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
  },
});
