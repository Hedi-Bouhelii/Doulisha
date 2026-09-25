import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/** Unit tests of the web app's pure helpers; `@/` mirrors the tsconfig path. */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
