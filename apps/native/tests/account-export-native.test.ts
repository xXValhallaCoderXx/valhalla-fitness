import { beforeEach, describe, expect, it, vi } from 'vitest'

const native = vi.hoisted(() => ({ available: vi.fn(), share: vi.fn(), create: vi.fn(), write: vi.fn(), remove: vi.fn(), construct: vi.fn() }))
vi.mock('expo-sharing', () => ({ isAvailableAsync: native.available, shareAsync: native.share }))
vi.mock('expo-file-system', () => ({
  Paths: { cache: '/cache' },
  File: class {
    uri = 'file:///cache/export.json'
    exists = true
    constructor(...args: unknown[]) { native.construct(...args) }
    create = native.create
    write = native.write
    delete = native.remove
  },
}))
import { shareAccountExport } from '../src/features/settings/account/account-export.native'

beforeEach(() => {
  vi.resetAllMocks()
  native.available.mockResolvedValue(true)
  native.share.mockResolvedValue(undefined)
})

describe('native account export sharing', () => {
  it('does not write a file or open sharing when the actor leaves during availability lookup', async () => {
    let resolve!: (value: boolean) => void
    let current = true
    native.available.mockReturnValue(new Promise<boolean>(done => { resolve = done }))
    const pending = shareAccountExport({ exportedAt: '2026-09-28T12:00:00Z' }, () => current)
    current = false
    resolve(true)
    await pending
    expect(native.construct).not.toHaveBeenCalled()
    expect(native.share).not.toHaveBeenCalled()
  })

  it('serializes actual JSON, shares it as JSON, and removes the temporary export after cancellation or failure', async () => {
    native.share.mockRejectedValue(new Error('Share cancelled'))
    const value = { exportedAt: '2026-09-28T12:00:00Z', bodyweight: [{ weightKg: 80 }] }
    await expect(shareAccountExport(value)).rejects.toThrow('Share cancelled')
    expect(native.write).toHaveBeenCalledWith(`${JSON.stringify(value, null, 2)}\n`)
    expect(native.share).toHaveBeenCalledWith('file:///cache/export.json', expect.objectContaining({ mimeType: 'application/json' }))
    expect(native.remove).toHaveBeenCalledTimes(1)
  })
})
