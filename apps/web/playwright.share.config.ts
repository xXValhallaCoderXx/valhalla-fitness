import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
  ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome'].find(existsSync)

/** Real canvas/file/preview checks without Supabase; authenticated entry points use the main config. */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'workout-share-preview.spec.ts',
  use: {
    baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure',
    launchOptions: { executablePath, downloadsPath: fileURLToPath(new URL('./test-results/downloads', import.meta.url)) },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: process.env.PLAYWRIGHT_REUSE_EXTERNAL_SERVER === '1' ? undefined : {
    command: 'pnpm exec vite --config tests/e2e/fixtures/workout-share/vite.config.ts',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
  },
})
