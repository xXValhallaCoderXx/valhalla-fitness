import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

const reuseExternalServer = process.env.PLAYWRIGHT_REUSE_EXTERNAL_SERVER === '1'
const systemChromiumPath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
  ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome'].find((path) =>
    existsSync(path),
  )

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    ...(systemChromiumPath ? { launchOptions: { executablePath: systemChromiumPath } } : {}),
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
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
