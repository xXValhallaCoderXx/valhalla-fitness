import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { prepareNativeImage } from '@/features/history/sharing/native-image'

const mocks = vi.hoisted(() => ({
  directoryCreate: vi.fn(), directoryDelete: vi.fn(), fileCreate: vi.fn(), fileWrite: vi.fn(),
  isAvailable: vi.fn(), share: vi.fn(),
}))
vi.mock('expo-crypto', () => ({ randomUUID: () => 'unique-id' }))
vi.mock('expo-sharing', () => ({ isAvailableAsync: mocks.isAvailable, shareAsync: mocks.share }))
vi.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  Directory: class {
    exists = true
    uri: string
    constructor(parent: string, name: string) { this.uri = `${parent}/${name}` }
    create = mocks.directoryCreate
    delete = mocks.directoryDelete
  },
  File: class {
    uri: string
    constructor(parent: { uri: string }, name: string) { this.uri = `${parent.uri}/${name}` }
    create = mocks.fileCreate
    write = mocks.fileWrite
  },
}))
const filename = 'sheetless-workout-2026-09-05.png'
const png = 'iVBORw0KGgoAAArecorded-output'
const svg = () => ({ toDataURL: vi.fn((callback: (data: string) => void) => callback(png)) })

beforeEach(() => { vi.resetAllMocks(); mocks.isAvailable.mockResolvedValue(true); mocks.share.mockResolvedValue(undefined) })
afterEach(() => { vi.useRealTimers() })

describe('native PNG adapter', () => {
  it('exports fixed dimensions and writes base64 PNG with the exact filename', async () => {
    const exporter = svg()
    const image = await prepareNativeImage(exporter, filename)
    expect(exporter.toDataURL).toHaveBeenCalledWith(expect.any(Function), { width: 1080, height: 1350 })
    expect(mocks.fileWrite).toHaveBeenCalledWith(png, { encoding: 'base64' })
    expect(image.uri).toBe(`file:///cache/workout-share-unique-id/${filename}`)
    await image.share()
    expect(mocks.share).toHaveBeenCalledWith(image.uri, { dialogTitle: 'Share workout', mimeType: 'image/png', UTI: 'public.png' })
    expect(mocks.directoryDelete).not.toHaveBeenCalled()
    image.dispose()
    expect(mocks.directoryDelete).toHaveBeenCalledOnce()
  })
  it('keeps a preview when sharing is unavailable or its capability check fails', async () => {
    mocks.isAvailable.mockResolvedValueOnce(false).mockRejectedValueOnce(new Error('unavailable'))
    for (let attempt = 0; attempt < 2; attempt++) {
      const image = await prepareNativeImage(svg(), filename)
      expect(image.canShare).toBe(false)
      expect(image.uri).toContain('.png')
      image.dispose()
    }
    expect(mocks.share).not.toHaveBeenCalled()
  })
  it('compensates for iOS renderer scale to retain the same exported pixel dimensions', async () => {
    for (const scale of [2, 3]) {
      const exporter = svg()
      const image = await prepareNativeImage(exporter, filename, scale)
      expect(exporter.toDataURL).toHaveBeenCalledWith(expect.any(Function), { width: 1080 / scale, height: 1350 / scale })
      image.dispose()
    }
  })
  it('cleans partial files on write failure without hiding the original failure', async () => {
    mocks.fileWrite.mockImplementation(() => { throw new Error('disk full') })
    mocks.directoryDelete.mockImplementation(() => { throw new Error('cleanup') })
    await expect(prepareNativeImage(svg(), filename)).rejects.toThrow('disk full')
    expect(mocks.directoryDelete).toHaveBeenCalledOnce()
  })
  it('rejects bad SVG output before writing and times out a missing native callback', async () => {
    await expect(prepareNativeImage({ toDataURL: (callback) => callback('') }, filename)).rejects.toThrow('PNG generation failed')
    expect(mocks.fileWrite).not.toHaveBeenCalled()
    vi.useFakeTimers()
    const pending = prepareNativeImage({ toDataURL() {} }, filename)
    const expectation = expect(pending).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(15000)
    await expectation
  })
  it('handles an empty asynchronous native callback as a generation failure', async () => {
    // iOS's SVG module calls callback([]) if its retry cannot produce a PNG.
    const pending = prepareNativeImage({
      toDataURL(callback) { queueMicrotask(() => callback(undefined as unknown as string)) },
    }, filename)
    await expect(pending).rejects.toThrow('PNG generation failed')
    expect(mocks.fileWrite).not.toHaveBeenCalled()
  })
})
