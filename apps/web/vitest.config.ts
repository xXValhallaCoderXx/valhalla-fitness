import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  envDir: '../..',
  resolve: {
    alias: [{ find: /^~\//, replacement: fileURLToPath(new URL('./src/', import.meta.url)) }],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.output/**',
      'tests/e2e/**',
      'scripts/**',
    ],
  },
})
