import { defineConfig, devices } from '@playwright/test'

const reuseExternalServer = process.env.PLAYWRIGHT_REUSE_EXTERNAL_SERVER === '1'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
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
