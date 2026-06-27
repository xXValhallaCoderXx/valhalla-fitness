#!/usr/bin/env node
/* global console, process */
/**
 * Screenshot any route as the logged-in demo user — a quick way for an agent (or
 * you) to eyeball a change in the real app during development.
 *
 *   pnpm shot                      # /today  -> agent-shot.png
 *   pnpm shot /program             # /program -> agent-shot.png
 *   pnpm shot /history insights.png
 *   pnpm shot /program --headed    # watch the browser (or set HEADED=1)
 *
 * Reuses the saved session at tests/e2e/.auth/user.json; if it's missing or
 * expired it logs in (demo.linear@sheetless.local) and refreshes it. Requires
 * the dev server (http://localhost:3000) and a seeded demo user (`pnpm demo:seed`).
 */
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { URL } from 'node:url'

// Watch the browser with `--headed` (or HEADED=1). Flags can appear anywhere.
const headed = process.env.HEADED === '1' || process.argv.includes('--headed')
const positional = process.argv.slice(2).filter((arg) => !arg.startsWith('-'))
const route = positional[0] ?? '/today'
const out = positional[1] ?? 'agent-shot.png'
const baseURL = process.env.APP_URL ?? 'http://localhost:3000'
const storage = 'tests/e2e/.auth/user.json'
const email = process.env.E2E_DEMO_EMAIL ?? 'demo.linear@sheetless.local'
const password = process.env.E2E_DEMO_PASSWORD ?? 'DemoPass123!'

const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
  : { channel: 'chrome' }

const browser = await chromium.launch({ ...launchOptions, headless: !headed, slowMo: headed ? 200 : 0 })
const context = await browser.newContext({
  baseURL,
  viewport: { width: 1280, height: 900 },
  ...(existsSync(storage) ? { storageState: storage } : {}),
})
const page = await context.newPage()

await page.goto(route, { waitUntil: 'load' }).catch(() => {})
await page.waitForTimeout(1000)

// Bounced to the auth screen? Log in and persist the session for next time.
if (new URL(page.url()).pathname.startsWith('/auth')) {
  console.log(`No valid session — logging in as ${email}...`)
  const emailInput = page.getByPlaceholder('name@example.com')
  const passwordInput = page.getByPlaceholder('Password')
  const submit = page.getByRole('button', { name: /^log in$/i })
  // Re-fill until React hydrates and enables the submit button.
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await emailInput.fill(email).catch(() => {})
    await passwordInput.fill(password).catch(() => {})
    if (await submit.isEnabled().catch(() => false)) break
    await page.waitForTimeout(300)
  }
  await submit.click()
  await page.waitForURL(/\/today/, { timeout: 20000 })
  mkdirSync(path.dirname(storage), { recursive: true })
  await context.storageState({ path: storage })
  if (!new URL(page.url()).pathname.startsWith(route)) {
    await page.goto(route, { waitUntil: 'load' }).catch(() => {})
    await page.waitForTimeout(1000)
  }
}

await page.screenshot({ path: out, fullPage: true })
if (headed) {
  console.log('Headed mode — keeping the window open for a few seconds...')
  await page.waitForTimeout(3000)
}
await browser.close()
console.log(`Saved ${out}  (route ${route})`)
