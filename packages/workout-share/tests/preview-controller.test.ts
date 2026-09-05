import { describe, expect, it, vi } from 'vitest'
import { createPreviewController, type PreparedImage } from '../src/preview-controller'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const image = () => ({ uri: 'file.png', dispose: vi.fn() })

describe('preview lifetime', () => {
  it('retries generation failure and retains the chosen key', async () => {
    const controller = createPreviewController()
    await controller.generate('dark', () => Promise.reject(new Error('failed')))
    expect(controller.getSnapshot()).toMatchObject({ key: 'dark', phase: 'error', error: 'generation' })
    await controller.generate('dark', async () => image())
    expect(controller.getSnapshot()).toMatchObject({ key: 'dark', phase: 'ready', error: null })
  })
  it.each(['close', 'account change', 'session change', 'new theme'])('ignores and cleans stale generation after %s', async (reason) => {
    const controller = createPreviewController()
    const pending = deferred<PreparedImage>()
    const old = image()
    const task = controller.generate('old', () => pending.promise)
    controller.cancel()
    if (reason !== 'close') await controller.generate('new', async () => image())
    pending.resolve(old)
    await task
    expect(controller.getSnapshot().key).toBe(reason === 'close' ? '' : 'new')
    expect(old.dispose).toHaveBeenCalledOnce()
  })
  it('ignores stale failures during rapid theme changes', async () => {
    const controller = createPreviewController()
    const pending = deferred<PreparedImage>()
    const task = controller.generate('dark', () => pending.promise)
    await controller.generate('light', async () => image())
    pending.reject(new Error('old'))
    await task
    expect(controller.getSnapshot()).toMatchObject({ key: 'light', phase: 'ready', error: null })
  })
  it('calls export immediately, blocks duplicate taps and defers cleanup until its consumer finishes', async () => {
    const controller = createPreviewController()
    const prepared = image()
    const pending = deferred<void>()
    await controller.generate('dark', async () => prepared)
    const action = vi.fn(() => pending.promise)
    const exporting = controller.exportImage(action)
    expect(action).toHaveBeenCalledOnce()
    await controller.exportImage(action)
    controller.cancel()
    expect(prepared.dispose).not.toHaveBeenCalled()
    pending.resolve()
    await exporting
    expect(action).toHaveBeenCalledOnce()
    expect(prepared.dispose).toHaveBeenCalledOnce()
    expect(controller.getSnapshot().phase).toBe('idle')
  })
  it('keeps the preview on cancellation or failure, with retry after failure', async () => {
    const controller = createPreviewController()
    await controller.generate('light', async () => image())
    await controller.exportImage(() => { throw Object.assign(new Error('cancelled'), { name: 'AbortError' }) })
    expect(controller.getSnapshot()).toMatchObject({ phase: 'ready', error: null })
    await controller.exportImage(() => { throw new Error('failed') })
    expect(controller.getSnapshot()).toMatchObject({ phase: 'ready', key: 'light', error: 'export' })
    await controller.exportImage(() => {})
    expect(controller.getSnapshot().error).toBeNull()
  })
  it('ignores synchronous and asynchronous cleanup failures', async () => {
    const controller = createPreviewController()
    await controller.generate('a', async () => ({ uri: 'a', dispose: () => { throw new Error('cleanup') } }))
    await controller.generate('b', async () => ({ uri: 'b', dispose: async () => { throw new Error('cleanup') } }))
    await controller.exportImage(() => controller.cancel())
    expect(controller.getSnapshot().error).toBeNull()
  })
})
