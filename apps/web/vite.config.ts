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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'lucide-icons';
          }
          if (id.includes('node_modules/pako') || id.includes('node_modules/zustand')) {
            return 'utils-vendor';
          }
          if (id.includes('/packages/calc/')) {
            return 'webpob-calc';
          }
          if (id.includes('/packages/data/') || id.includes('/packages/i18n/')) {
            return 'webpob-data';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
});
