import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import type { MovementSlot } from '@sheetless/domain/session/types/session'
import { expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({ schedule: vi.fn(), cancel: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/account', () => ({ useMe: () => ({ data: { autoStartTimer: true, defaultRestSeconds: 120 } }) }))
vi.mock('@/lib/rest-notifications', () => ({ scheduleRestEnd: api.schedule, cancelRestEnd: api.cancel }))
vi.mock('../src/features/session/rest-timer/RestTimerPill', () => ({ RestTimerPill: () => null }))
import { RestTimerProvider } from '../src/features/session/rest-timer/RestTimerProvider'
import { useRestTimerControls } from '../src/features/session/rest-timer/rest-timer-context'

it('invalidates pending native schedules when the real provider unmounts', async () => {
  let resolve!: (id: string) => void
  api.schedule.mockReturnValue(new Promise(yes => { resolve = yes }))
  const wrapper = ({ children }: PropsWithChildren) => <RestTimerProvider>{children}</RestTimerProvider>
  const { result, unmount } = renderHook(useRestTimerControls, { wrapper })
  act(() => result.current.startForSlot({ movementName: 'Bench', role: 'main' } as MovementSlot))
  const savedControls = result.current
  unmount()
  expect(api.schedule.mock.calls[0][2]()).toBe(false)
  await act(async () => resolve('late-after-unmount'))
  expect(api.cancel).toHaveBeenCalledWith('late-after-unmount')
  act(() => savedControls.startForSlot({ movementName: 'Bench', role: 'main' } as MovementSlot))
  expect(api.schedule).toHaveBeenCalledOnce()
})
