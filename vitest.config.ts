import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@webpob/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
      '@webpob/i18n': path.resolve(__dirname, 'packages/i18n/src/index.ts'),
      '@webpob/data': path.resolve(__dirname, 'packages/data/src/index.ts'),
      '@webpob/codec': path.resolve(__dirname, 'packages/codec/src/index.ts'),
      '@webpob/calc': path.resolve(__dirname, 'packages/calc/src/index.ts'),
    },
  },
  test: {
    include: ['packages/**/src/**/*.test.ts', 'apps/**/src/**/*.test.ts'],
    environment: 'node',
  },
});
