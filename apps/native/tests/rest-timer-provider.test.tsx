import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import type { MovementSlot } from '@sheetless/domain/session/types/session'
import { afterEach, expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({ schedule: vi.fn(), cancel: vi.fn().mockResolvedValue(undefined), cue: vi.fn() }))
vi.mock('@/lib/account', () => ({ useMe: () => ({ data: { autoStartTimer: true, defaultRestSeconds: 120 } }) }))
vi.mock('@/lib/rest-notifications', () => ({ scheduleRestEnd: api.schedule, cancelRestEnd: api.cancel }))
vi.mock('@/lib/rest-cue', () => ({ playRestCompleteCue: api.cue }))
vi.mock('../src/features/session/rest-timer/RestTimerPill', () => ({ RestTimerPill: () => null }))
import { RestTimerProvider } from '../src/features/session/rest-timer/RestTimerProvider'
import { useRestTimerControls, useRestTimerState } from '../src/features/session/rest-timer/rest-timer-context'

afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

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

it('expires once through the actual provider without mounting a dock or Focus ring', async () => {
  vi.useFakeTimers()
  api.schedule.mockResolvedValue('active-notification')
  const wrapper = ({ children }: PropsWithChildren) => <RestTimerProvider>{children}</RestTimerProvider>
  const { result, unmount } = renderHook(() => ({ controls: useRestTimerControls(), state: useRestTimerState() }), { wrapper })
  await act(async () => result.current.controls.startForSlot({ movementName: 'Bench', role: 'main', restSeconds: 2 } as MovementSlot))
  act(() => vi.advanceTimersByTime(1000))
  expect(result.current.state.secondsLeft).toBe(1)
  act(() => vi.advanceTimersByTime(1000))
  expect(result.current.state.active).toBe(false)
  expect(api.cue).toHaveBeenCalledOnce()
  expect(api.cancel).toHaveBeenCalledWith('active-notification')
  act(() => vi.advanceTimersByTime(1000))
  expect(api.cue).toHaveBeenCalledOnce()
  unmount()
})
