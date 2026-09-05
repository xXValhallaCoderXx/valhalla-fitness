import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('real PNG preview, download, palettes and narrow layout', async ({ page }, testInfo) => {
  await page.goto('/')
  const preview = page.getByTestId('workout-share-preview')
  const image = page.getByTestId('workout-share-image')
  const download = page.getByRole('button', { name: 'Download image', exact: true })
  for (const scheme of ['Light', 'Dark']) {
    await preview.getByText(scheme, { exact: true }).click()
    await expect(download).toBeEnabled()
    await expect(image).toBeVisible()
    const pixel = await image.evaluate(async (node: HTMLImageElement) => {
      await node.decode()
      const canvas = document.createElement('canvas')
      canvas.width = 1080; canvas.height = 1350
      const context = canvas.getContext('2d')!
      context.drawImage(node, 0, 0)
      return { size: [node.naturalWidth, node.naturalHeight], rgba: [...context.getImageData(0, 0, 1, 1).data] }
    })
    expect(pixel.size).toEqual([1080, 1350])
    expect(pixel.rgba).toEqual(scheme === 'Light' ? [242, 246, 247, 255] : [8, 17, 20, 255])
    await expect(image).toHaveAttribute('alt', /personal record.*Plus 3 more exercises/)
    const box = await image.boundingBox()
    expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
    const event = page.waitForEvent('download')
    await download.click()
    const saved = await event
    expect(saved.suggestedFilename()).toBe('sheetless-workout-2026-09-05.png')
    const path = testInfo.outputPath(`${scheme}.png`)
    await saved.saveAs(path)
    const bytes = await readFile(path)
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([1080, 1350])
    await expect(download).toBeEnabled()
  }
  await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'dark')
  await page.screenshot({ path: testInfo.outputPath('preview.png') })
  await page.getByRole('button', { name: 'Back to summary' }).click()
  await expect(preview).toHaveCount(0)
})

test('generation failure and retry, unavailable sharing, rapid themes and account replacement', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false })
    const original = HTMLCanvasElement.prototype.toBlob
    let calls = 0
    HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
      if (++calls === 1) { callback(null); return }
      original.call(this, (blob) => setTimeout(() => callback(blob), calls === 2 ? 600 : 10), ...args)
    }
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Retry image' }).click()
  await page.getByText('Light', { exact: true }).click()
  await page.getByText('Dark', { exact: true }).click()
  await page.getByRole('button', { name: 'Change account' }).click()
  await expect(page.getByRole('button', { name: 'Download image', exact: true })).toBeEnabled()
  await expect(page.getByTestId('workout-share-image')).toHaveAttribute('alt', /Another account workout/)
  await expect(page.getByRole('button', { name: 'Share image', exact: true })).toHaveCount(0)
  await expect(page.getByText(/Image sharing is unavailable/)).toBeVisible()
})

test('file payload, duplicate taps, cancellation and export retry', async ({ page }) => {
  await page.addInitScript(() => {
    let calls = 0
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: ({ files }: ShareData) => files?.[0]?.type === 'image/png' })
    Object.defineProperty(navigator, 'share', { configurable: true, value: async ({ files }: ShareData) => {
      const file = files![0]
      document.body.dataset.payload = `${file.name}:${file.type}:${file.size}`
      document.body.dataset.calls = String(++calls)
      document.body.dataset.activated = String(navigator.userActivation.isActive)
      await new Promise((resolve) => setTimeout(resolve, 400))
      if (calls === 1) throw new DOMException('Cancelled', 'AbortError')
      if (calls === 2) throw new Error('Sharing failed')
    } })
  })
  await page.goto('/')
  const share = page.getByRole('button', { name: 'Share image', exact: true })
  await expect(share).toBeEnabled()
  await share.evaluate((button: HTMLButtonElement) => { button.click(); button.click() })
  await expect(share).toBeEnabled()
  await expect(page.locator('body')).toHaveAttribute('data-calls', '1')
  await expect(page.locator('body')).toHaveAttribute('data-payload', /sheetless-workout-2026-09-05.png:image\/png:\d+/)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await share.click()
  await expect(page.getByRole('alert')).toContainText('Could not export')
  await expect(page.locator('body')).toHaveAttribute('data-activated', 'true')
  await page.getByRole('button', { name: 'Retry share', exact: true }).click()
  await expect(share).toBeEnabled()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('a failed preview chunk retains an error and a way back to the summary', async ({ page }) => {
  await page.route('**/sharing/WorkoutSharePreview.tsx', (route) => route.abort('failed'))
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Could not load the image preview')
  await expect(page.getByRole('button', { name: 'Retry preview' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await page.getByRole('button', { name: 'Back to summary' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Share workout', exact: true })).toBeVisible()
})

test('closing during generation releases the eventual image and its SVG source', async ({ page }) => {
  await page.addInitScript(() => {
    const created = URL.createObjectURL.bind(URL)
    const revoked = URL.revokeObjectURL.bind(URL)
    const live = new Set<string>()
    URL.createObjectURL = (blob) => {
      const uri = created(blob)
      live.add(uri)
      document.body.dataset.liveImages = String(live.size)
      return uri
    }
    URL.revokeObjectURL = (uri) => {
      live.delete(uri)
      document.body.dataset.liveImages = String(live.size)
      revoked(uri)
    }
    const toBlob = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
      document.body.dataset.rasterizing = 'true'
      toBlob.call(this, (blob) => setTimeout(() => callback(blob), 500), ...args)
    }
  })
  await page.goto('/')
  await expect(page.locator('body')).toHaveAttribute('data-rasterizing', 'true')
  await page.getByRole('button', { name: 'Back to summary' }).click()
  await expect(page.getByTestId('workout-share-preview')).toHaveCount(0)
  await expect(page.locator('body')).toHaveAttribute('data-live-images', '0')
  await page.getByRole('button', { name: 'Share workout', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Download image', exact: true })).toBeEnabled()
})
