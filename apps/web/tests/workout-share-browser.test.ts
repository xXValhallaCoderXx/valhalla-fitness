import { afterEach, describe, expect, it, vi } from 'vitest'
import { canShareImage, prepareBrowserImage, shareBrowserImage } from '~/domains/history/components/sharing/browser-image'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('browser image adapter', () => {
  it('checks the actual file payload and handles unsupported or rejecting capability checks', () => {
    const file = new File(['png'], 'workout.png', { type: 'image/png' })
    vi.stubGlobal('navigator', {})
    expect(canShareImage(file)).toBe(false)
    const canShare = vi.fn(() => true)
    const share = vi.fn(async () => {})
    vi.stubGlobal('navigator', { canShare, share })
    expect(canShareImage(file)).toBe(true)
    expect(canShare).toHaveBeenCalledWith({ files: [file] })
    void shareBrowserImage({ file, uri: 'blob:png', canShare: true, dispose() {} })
    expect(share).toHaveBeenCalledWith({ files: [file] })
    canShare.mockImplementation(() => { throw new Error('blocked') })
    expect(canShareImage(file)).toBe(false)
  })
  it('releases the SVG source when decoding fails', async () => {
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:svg', revokeObjectURL })
    vi.stubGlobal('Image', class {
      onerror?: () => void
      set src(value: string) { if (value) queueMicrotask(() => this.onerror?.()) }
    })
    await expect(prepareBrowserImage('<svg/>', 'workout.png')).rejects.toThrow('generation failed')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:svg')
  })
})
