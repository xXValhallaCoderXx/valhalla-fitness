import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Also the canary for the test setup itself: this is the one seed test that
 * imports `react-native` (proving the react-native-web alias resolves) and an
 * expo module (proving expo mocks work), so a broken config fails here first.
 */
const haptics = vi.hoisted(() => ({ notificationAsync: vi.fn(() => Promise.resolve()) }))

vi.mock('expo-haptics', () => ({
  notificationAsync: haptics.notificationAsync,
  NotificationFeedbackType: { Success: 'success' },
}))

const loadCue = async (platform: string, vibrate: unknown) => {
  vi.doMock('react-native', () => ({
    Platform: { OS: platform },
    Vibration: { vibrate },
  }))
  const { playRestCompleteCue } = await import('../src/lib/rest-cue')
  return playRestCompleteCue
}

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('react-native')
  haptics.notificationAsync.mockClear()
})

describe('playRestCompleteCue', () => {
  it('fires haptics and the vibration pattern on a device', async () => {
    const vibrate = vi.fn()
    const playRestCompleteCue = await loadCue('android', vibrate)

    playRestCompleteCue()

    expect(haptics.notificationAsync).toHaveBeenCalledWith('success')
    expect(vibrate).toHaveBeenCalledWith([0, 120, 60, 120])
  })

  it('survives a rejected haptics call rather than crashing the rest timer', async () => {
    haptics.notificationAsync.mockImplementationOnce(() => Promise.reject(new Error('no motor')))
    const playRestCompleteCue = await loadCue('ios', vi.fn())

    expect(() => playRestCompleteCue()).not.toThrow()
    await Promise.resolve()
  })

  it('uses navigator.vibrate on web and never touches haptics', async () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { vibrate })
    const deviceVibrate = vi.fn()
    const playRestCompleteCue = await loadCue('web', deviceVibrate)

    playRestCompleteCue()

    expect(vibrate).toHaveBeenCalledWith([120, 60, 120])
    expect(haptics.notificationAsync).not.toHaveBeenCalled()
    expect(deviceVibrate).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('is a no-op on a web target with no vibration support', async () => {
    vi.stubGlobal('navigator', {})
    const playRestCompleteCue = await loadCue('web', vi.fn())

    expect(() => playRestCompleteCue()).not.toThrow()
    vi.unstubAllGlobals()
  })
})
