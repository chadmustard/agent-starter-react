import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // This Vite version transforms TS/TSX via oxc (not esbuild), and oxc otherwise inherits
  // tsconfig.json's `jsx: "preserve"` (needed for Next.js), which leaves JSX un-transformed
  // in tests. Force the automatic runtime here instead.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/.next/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
});
