// Unit tests for the state layer (ticket 14). Kept apart from vite.config.ts so the production build is unchanged:
// `vite build` never reaches *.test.ts (nothing imports them), and `tsc -b` type-checks them with the app.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
});
