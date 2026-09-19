import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@sheetless/domain/account/types'
import type { ProgramTemplateSummary } from '@sheetless/domain/program/types'
import type { TodayPayload } from '@sheetless/domain/session/types'
import { convertWeight } from '@sheetless/domain/shared/math'
import { themeProviderMock } from './support/theme'
import { useProgramStartingLoads, type StartingHistory } from '../src/features/templates/start/useProgramStartingLoads'
import { useProgramStart } from '../src/features/templates/start/useProgramStart'
import { TemplateStartingHistory } from '../src/features/templates/setup/TemplateStartingHistory'

const api = vi.hoisted(() => ({ start: vi.fn(), history: vi.fn() }))
vi.mock('@sheetless/data/program/start', () => ({ startProgram: api.start }))
vi.mock('@sheetless/data/history/history', () => ({
  getHistoryDashboard: api.history, getMovementHistory: vi.fn(), getRecentHistory: vi.fn(), getTodayHistorySupport: vi.fn(),
}))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ supabase: {}, user }) }))
vi.mock('@/lib/theme-provider', () => themeProviderMock())
// The gate test observes loading/retry/draft creation, never native layout.
vi.mock('@/components', () => ({
  Screen: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Panel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Caption: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
  Button: ({ label, onPress }: { label: string; onPress: () => void }) => <button onClick={onPress}>{label}</button>,
}))

const user = { id: 'account-a' } as User
const template = {
  id: 'template-a', name: 'Test programme', requiredState: [
    { key: 'squat_tm', movementId: 'squat', type: 'training_max' },
    { key: 'bench_wl', movementId: 'bench_press', type: 'working_load' },
  ],
} as ProgramTemplateSummary
const profile: UserProfile = {
  id: user.id, email: null, units: 'kg', rounding: 2.5, equipmentProfile: ['barbell'],
  themePreference: 'system', timezone: 'Asia/Singapore',
  programStateDefaults: { squat_one_rep_max: 140, bench_press_one_rep_max: 100 },
  onboardingCompleted: true, liveOnboardingDismissed: true, postWorkoutFeedbackDismissed: false,
  sex: null, autoStartTimer: true, defaultRestSeconds: 120, experienceMode: 'guided', showFormulas: false,
  fullModeHintDismissedAt: null,
}
const history: StartingHistory = { units: 'lb', liftSeries: [{
  movementId: 'squat', movementName: 'Squat', repMaxBests: { oneRm: null, threeRm: null, fiveRm: null },
  points: [
    { sessionId: 's1', date: '2026-09-01', load: convertWeight(160, 'kg', 'lb'), reps: 5, rir: 2,
      e1rm: convertWeight(200, 'kg', 'lb'), outlier: false },
    { sessionId: 's2', date: '2026-09-02', load: 9999, reps: 1, rir: 0, e1rm: 9999, outlier: true },
  ],
}] }
const today = { activeProgram: null, activeSession: null } as TodayPayload
let client: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
beforeEach(() => {
  vi.resetAllMocks()
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })
})
afterEach(() => client.clear())

it('prefers recorded strength in its source units, skips outliers, then falls back to saved estimates or manual entry', () => {
  const withMissing = { ...template, requiredState: [...template.requiredState,
    { key: 'press_tm', movementId: 'overhead_press', type: 'training_max' as const }] }
  const { result } = renderHook(() => useProgramStartingLoads(withMissing, profile, history))
  expect(result.current.stateValues.map((state) => state.value)).toEqual([180, 75, null])
  expect(result.current.liftRows.map((row) => row.source)).toEqual(['history', 'estimate', 'none'])
  expect(result.current.liftRows[0].bestSet?.load).toBeCloseTo(160)
  expect(result.current.missingValues.map((state) => state.key)).toEqual(['press_tm'])
  expect(history.liftSeries[0].points[0].e1rm).toBeCloseTo(convertWeight(200, 'kg', 'lb'))
})

it('converts programme units and preserves manually edited loads when changing percentage or rounding', () => {
  const { result } = renderHook(() => useProgramStartingLoads(template, profile, history))
  act(() => result.current.setUnits('lb'))
  expect(result.current.units).toBe('lb')
  expect(result.current.rounding).toBe(5)
  expect(result.current.stateValues.map((state) => state.value)).toEqual([395, 165])
  act(() => result.current.setTrainingMaxPercent(95))
  expect(result.current.stateValues[0].value).toBe(420)
  act(() => result.current.setUnits('kg'))
  expect(result.current.stateValues[0].value).toBe(190)
  act(() => result.current.setDraftValue('squat_tm', '177'))
  act(() => result.current.setTrainingMaxPercent(80))
  act(() => result.current.setRounding(5))
  expect(result.current.stateValues[0].value).toBe(177)
  expect(result.current.liftRows[0].suggested).toBe(160)
  expect(result.current.liftRows[0].edited).toBe(true)
  act(() => result.current.resetDraftValue('squat_tm'))
  expect(result.current.stateValues[0].value).toBe(160)
  expect(profile.units).toBe('kg')
  expect(profile.rounding).toBe(2.5)
  expect(profile.programStateDefaults.squat_one_rep_max).toBe(140)
})

it('keeps the source snapshot and invalid edits through background refresh and option changes', () => {
  const { result, rerender } = renderHook(({ value }) => useProgramStartingLoads(template, value, history), {
    initialProps: { value: profile },
  })
  act(() => result.current.setDraftValue('bench_wl', 'not a weight'))
  rerender({ value: { ...profile, programStateDefaults: { bench_press_one_rep_max: 999 } } })
  act(() => result.current.setRounding(5))
  expect(result.current.draftValues.bench_wl).toBe('not a weight')
  expect(result.current.missingValues.map((state) => state.key)).toEqual(['bench_wl'])
  act(() => result.current.resetDraftValue('bench_wl'))
  expect(result.current.stateValues[1].value).toBe(75)
})

function startOptions(overrides: Partial<Parameters<typeof useProgramStart>[0]> = {}): Parameters<typeof useProgramStart>[0] {
  return {
    user, profile, today, template, startingHistory: history, movementOverrides: [], accessoryAdditions: [],
    equipmentMode: 'standard', freeWeightPolicy: null, freeWeightChoices: [], reviewNeeded: false, onStarted: vi.fn(),
    ...overrides,
  }
}

it('sends programme-only units and rounding and reuses a retry identity only for the same intent', async () => {
  api.start.mockRejectedValue(new Error('Connection failed'))
  const { result } = renderHook(() => useProgramStart(startOptions()), { wrapper })
  act(() => result.current.setUnits('lb'))
  act(() => result.current.requestStart())
  await waitFor(() => expect(result.current.startError).toBe('Connection failed'))
  const first = api.start.mock.calls[0][1]
  expect(first).toEqual(expect.objectContaining({ units: 'lb', rounding: 5 }))
  expect(first.stateValues.map((state: { value: number; unit: string }) => [state.value, state.unit])).toEqual([[395, 'lb'], [165, 'lb']])
  act(() => result.current.requestStart())
  await waitFor(() => expect(api.start).toHaveBeenCalledTimes(2))
  await waitFor(() => expect(result.current.isPending).toBe(false))
  expect(api.start.mock.calls[1][1].requestId).toBe(first.requestId)
  act(() => result.current.setDraftValue('squat_tm', '400'))
  act(() => result.current.requestStart())
  await waitFor(() => expect(api.start).toHaveBeenCalledTimes(3))
  expect(api.start.mock.calls[2][1].requestId).not.toBe(first.requestId)
})

it('requires replacement confirmation and still blocks missing values, equipment review, and stale setup', async () => {
  const active = { ...today, activeProgram: { id: 'old' }, activeSession: { sessionId: 'live' } } as TodayPayload
  api.start.mockRejectedValue(new Error('FREE_WEIGHT_CHOICE_STALE'))
  const { result, rerender } = renderHook(({ reviewNeeded }) => useProgramStart(startOptions({ today: active, reviewNeeded })), {
    wrapper, initialProps: { reviewNeeded: true },
  })
  act(() => result.current.requestStart())
  expect(api.start).not.toHaveBeenCalled()
  rerender({ reviewNeeded: false })
  act(() => result.current.setDraftValue('squat_tm', ''))
  act(() => result.current.requestStart())
  expect(api.start).not.toHaveBeenCalled()
  act(() => result.current.resetDraftValue('squat_tm'))
  act(() => result.current.requestStart())
  expect(result.current.showSwitchConfirm).toBe(true)
  expect(api.start).not.toHaveBeenCalled()
  act(() => result.current.confirmStart())
  await waitFor(() => expect(result.current.needsReload).toBe(true))
  expect(api.start.mock.calls[0][1].replaceActiveProgram).toBe(true)
  act(() => result.current.confirmStart())
  expect(api.start).toHaveBeenCalledOnce()
})

it('retries recorded-history loading before mounting an editable setup draft', async () => {
  api.history.mockRejectedValueOnce(new Error('History unavailable')).mockResolvedValueOnce({ insights: history })
  const ready = vi.fn(() => <span>Starting loads ready</span>)
  render(<QueryClientProvider client={client}><TemplateStartingHistory user={user} required title="Programme">{ready}</TemplateStartingHistory></QueryClientProvider>)
  await screen.findByText('History unavailable')
  expect(ready).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await screen.findByText('Starting loads ready')
  expect(ready).toHaveBeenCalledWith(history)
  expect(api.history).toHaveBeenCalledTimes(2)
})
