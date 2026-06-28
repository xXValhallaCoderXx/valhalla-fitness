import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'
import { STORAGE_STATE } from './tests/e2e/support/auth'

const reuseExternalServer = process.env.PLAYWRIGHT_REUSE_EXTERNAL_SERVER === '1'
const systemChromiumPath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
  [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].find((path) => existsSync(path))

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    ...(systemChromiumPath ? { launchOptions: { executablePath: systemChromiumPath } } : {}),
    // Show the browser with `--headed` (built-in) or HEADED=1.
    ...(process.env.HEADED === '1' ? { headless: false } : {}),
    trace: 'on-first-retry',
  },
  projects: [
    // Logs in once and writes STORAGE_STATE; the browser projects depend on it.
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
  ],
  webServer: reuseExternalServer
    ? undefined
    : {
        command: 'corepack pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
      },
})
