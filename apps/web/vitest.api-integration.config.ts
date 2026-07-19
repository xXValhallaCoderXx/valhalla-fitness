import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url))
const repositoryEnv = loadEnv('test', repositoryRoot, '')

export default defineConfig({
  envDir: '../..',
  test: {
    environment: 'node',
    env: {
      MOBILE_API_INTEGRATION_URL:
        process.env.MOBILE_API_INTEGRATION_URL ?? repositoryEnv.MOBILE_API_INTEGRATION_URL ?? '',
      SUPABASE_URL: process.env.SUPABASE_URL ?? repositoryEnv.SUPABASE_URL ?? '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? repositoryEnv.SUPABASE_ANON_KEY ?? '',
    },
    include: ['tests/integration/mobile-api.integration.test.ts'],
    testTimeout: 30_000,
  },
})
