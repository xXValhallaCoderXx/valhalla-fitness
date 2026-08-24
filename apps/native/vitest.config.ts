import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: fileURLToPath(new URL('./src/', import.meta.url)) },
      // Hooks and pure modules need no renderer, but a component test does, and
      // Hermes has none under Node. react-native-web is already a dependency
      // (it powers `pnpm native:web`), so it doubles as the test renderer.
      // Caveat: this exercises react-native-web, not Hermes — it proves state
      // transitions, never layout, measureInWindow, Modal, or SVG output.
      { find: /^react-native$/, replacement: 'react-native-web' },
    ],
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
})
