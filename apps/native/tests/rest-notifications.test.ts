import { beforeEach, expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({ permission: vi.fn(), request: vi.fn(), schedule: vi.fn() }))
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }))
vi.mock('expo-notifications', () => ({
  setNotificationHandler: vi.fn(), setNotificationChannelAsync: vi.fn(), AndroidImportance: { HIGH: 4 },
  getPermissionsAsync: api.permission, requestPermissionsAsync: api.request, scheduleNotificationAsync: api.schedule,
  SchedulableTriggerInputTypes: { DATE: 'date' },
}))
beforeEach(() => { vi.resetModules(); vi.resetAllMocks() })
it('does not schedule after cancellation while Android permission is pending', async () => {
  let resolve!: (value: { granted: boolean }) => void
  api.permission.mockResolvedValue({ granted: false })
  api.request.mockReturnValue(new Promise(yes => { resolve = yes }))
  const { scheduleRestEnd } = await import('../src/lib/rest-notifications')
  let current = true
  const promise = scheduleRestEnd(Date.now() + 120000, 'Bench', () => current)
  await vi.waitFor(() => expect(api.request).toHaveBeenCalled())
  current = false; resolve({ granted: true })
  expect(await promise).toBeNull()
  expect(api.schedule).not.toHaveBeenCalled()
})
it.each([false, true])('handles granted=%s without scheduling an expired timer', async granted => {
  api.permission.mockResolvedValue({ granted })
  api.request.mockResolvedValue({ granted: false })
  const { scheduleRestEnd } = await import('../src/lib/rest-notifications')
  expect(await scheduleRestEnd(Date.now() - 1, null)).toBeNull()
  expect(api.schedule).not.toHaveBeenCalled()
})
