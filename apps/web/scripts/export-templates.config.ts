import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Standalone vitest config for `pnpm export:templates`. The main suite (`vitest.config.ts`) excludes
 * `scripts/**`, so this export runner never runs as part of `pnpm test`; it only runs when invoked directly.
 */
export default defineConfig({
  resolve: {
    alias: [{ find: /^~\//, replacement: fileURLToPath(new URL('../src/', import.meta.url)) }],
  },
  test: {
    environment: 'node',
    include: ['scripts/export-templates.spec.ts'],
  },
})
