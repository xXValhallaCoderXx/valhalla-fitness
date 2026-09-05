import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { signInClient } from './support/profile'
import { DEMO_USER } from './support/auth'

async function historicalId() {
  const { client, userId } = await signInClient(DEMO_USER)
  const { data } = await client.from('workout_sessions').select('id').eq('user_id', userId)
    .eq('status', 'completed').order('completed_at', { ascending: false }).limit(1).single().throwOnError()
  return data!.id as string
}

async function openPreview(page: Page) {
  await expect(async () => {
    await page.getByRole('button', { name: 'Share workout', exact: true }).click()
    await expect(page.getByTestId('workout-share-preview')).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 15000 })
  await expect(page.getByRole('button', { name: 'Download image', exact: true })).toBeEnabled()
}

test('historical full summary downloads real PNGs in both themes at narrow widths', async ({ page }, testInfo) => {
  await page.goto(`/sessions/${await historicalId()}/summary`)
  const appTheme = await page.locator('html').getAttribute('data-mantine-color-scheme')
  await openPreview(page)
  const image = page.getByTestId('workout-share-image')
  const sources: string[] = []
  for (const scheme of ['Light', 'Dark']) {
    await page.getByText(scheme, { exact: true }).click()
    await expect(page.getByRole('button', { name: 'Download image', exact: true })).toBeEnabled()
    await expect(image).toBeVisible()
    sources.push((await image.getAttribute('src'))!)
    const dimensions = await image.evaluate((node: HTMLImageElement) => ({ width: node.naturalWidth, height: node.naturalHeight }))
    expect(dimensions).toEqual({ width: 1080, height: 1350 })
    const box = await image.boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
    const downloadEvent = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download image', exact: true }).click()
    const download = await downloadEvent
    expect(download.suggestedFilename()).toMatch(/^sheetless-workout-\d{4}-\d{2}-\d{2}\.png$/)
    const path = testInfo.outputPath(`${scheme}.png`)
    await download.saveAs(path)
    const bytes = await readFile(path)
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([1080, 1350])
    expect(await image.evaluate(async (node: HTMLImageElement) => (await fetch(node.src)).headers.get('content-type'))).toBe('image/png')
    await expect(page.getByRole('button', { name: 'Download image', exact: true })).toBeEnabled()
  }
  expect(sources[0]).not.toBe(sources[1])
  expect(await page.locator('html').getAttribute('data-mantine-color-scheme')).toBe(appTheme)
  await page.getByRole('button', { name: 'Back to summary' }).click()
  await expect(page.getByTestId('workout-share-preview')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Share workout', exact: true })).toBeVisible()
})

test('file sharing uses the prepared PNG and cancellation leaves the preview open', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: ({ files }: ShareData) => files?.[0]?.type === 'image/png' })
    Object.defineProperty(navigator, 'share', { configurable: true, value: async ({ files }: ShareData) => {
      const file = files![0]
      document.body.dataset.sharedFile = `${file.name}:${file.type}:${file.size}`
      throw new DOMException('Cancelled', 'AbortError')
    } })
  })
  await page.goto(`/sessions/${await historicalId()}/summary`)
  await openPreview(page)
  await page.getByRole('button', { name: 'Share image', exact: true }).click()
  await expect(page.locator('body')).toHaveAttribute('data-shared-file', /sheetless-workout-.*\.png:image\/png:\d+/)
  await expect(page.getByRole('button', { name: 'Share image', exact: true })).toBeEnabled()
  await expect(page.getByTestId('workout-share-preview')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('history dialog switches to preview and back without stacking dialogs', async ({ page }) => {
  await page.goto('/history?tab=sessions')
  await expect(async () => {
    await page.getByRole('button', { name: /movements.*sets/i }).first().click()
    await expect(page.getByRole('button', { name: 'Share workout', exact: true })).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 15000 })
  await openPreview(page)
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await page.getByRole('button', { name: 'Back to summary' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Share workout', exact: true })).toBeVisible()
})
