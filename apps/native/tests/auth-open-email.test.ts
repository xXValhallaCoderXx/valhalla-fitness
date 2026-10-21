import { beforeEach, describe, expect, it, vi } from 'vitest'

const startActivity = vi.hoisted(() => vi.fn())
vi.mock('expo-intent-launcher', () => ({ startActivityAsync: startActivity }))
import { openEmailApp as openAndroidEmail } from '../src/features/auth/open-email.android'
import { openEmailApp as openUnsupportedEmail } from '../src/features/auth/open-email'

beforeEach(() => { startActivity.mockReset() })
describe('email inbox handoff', () => {
  it('requests an Android inbox with MAIN and APP_EMAIL, without a recipient or compose intent', async () => {
    startActivity.mockResolvedValue({ resultCode: -1 })
    await expect(openAndroidEmail()).resolves.toBe(true)
    expect(startActivity).toHaveBeenCalledExactlyOnceWith('android.intent.action.MAIN', { category: 'android.intent.category.APP_EMAIL' })
  })
  it('lets the screen present manual guidance when no Android email app can open', async () => {
    startActivity.mockRejectedValue(new Error('No matching activity'))
    await expect(openAndroidEmail()).rejects.toThrow('No matching activity')
  })
  it('falls back to manual guidance on other platforms', async () => {
    await expect(openUnsupportedEmail()).resolves.toBe(false)
    expect(startActivity).not.toHaveBeenCalled()
  })
})
