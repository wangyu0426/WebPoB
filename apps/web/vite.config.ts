import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@webpob/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@webpob/i18n': path.resolve(__dirname, '../../packages/i18n/src/index.ts'),
      '@webpob/data': path.resolve(__dirname, '../../packages/data/src/index.ts'),
      '@webpob/codec': path.resolve(__dirname, '../../packages/codec/src/index.ts'),
      '@webpob/calc': path.resolve(__dirname, '../../packages/calc/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
});
