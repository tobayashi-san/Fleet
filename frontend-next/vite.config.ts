import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// The release workflow sets this version before the image is built.
const { version } = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as { version: string };

// Default UI served from the backend root.
export default defineConfig({
  base: '/',
  plugins: [react()],
  define: {
    __FLEET_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': process.env.VITE_API_TARGET || 'http://localhost:3001',
      '/plugins': process.env.VITE_API_TARGET || 'http://localhost:3001',
      '/ws': {
        target: (process.env.VITE_API_TARGET || 'http://localhost:3001').replace(/^http/, 'ws'),
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          terminal: ['@xterm/xterm', '@xterm/addon-fit'],
          editor: ['@uiw/react-codemirror', '@codemirror/lang-yaml'],
          router: ['@tanstack/react-router'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
  test: {
    // Playwright specs live outside src and are run exclusively through
    // `npm run test:e2e`.  Without this exclusion Vitest tries to execute
    // them as unit tests as well.
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
});
