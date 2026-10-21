import type { ReactNode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProgramInstance, ProgressionDecision } from '@sheetless/domain/program/types'
import type { ProgramPlanSession } from '@sheetless/domain/program/program-plan'
import type { PlannedSession, TodayPayload, WorkoutSession } from '@sheetless/domain/session/types'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { themeProviderMock } from './support/theme'

const api = vi.hoisted(() => ({
  read: vi.fn(), start: vi.fn(), close: vi.fn(), push: vi.fn(), navigate: vi.fn(), resolve: vi.fn(),
  activeStarts: 0, startError: null as Error | null,
}))
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }) }))
vi.mock('expo-router', () => ({ router: { push: api.push, navigate: api.navigate } }))
vi.mock('@sheetless/data/session/reads', () => ({ getToday: api.read, getSession: vi.fn() }))
vi.mock('@/features/session/today/useStartPlannedWorkout', () => ({
  useStartPlannedWorkout: () => ({ mutate: api.start, activeStarts: api.activeStarts,
    isError: Boolean(api.startError), error: api.startError }),
}))
vi.mock('@/components', async () => {
  const { Button } = await import('../src/components/Button')
  const Block = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return { Button, Text: Block, Caption: Block, SectionLabel: Block,
    SheetModal: ({ children, title, onClose, footer, closeDisabled }: {
      children: ReactNode; title: string; onClose: () => void; footer?: ReactNode; closeDisabled?: boolean
    }) => <div role="dialog" aria-label={title}>
      {children}{footer}<button disabled={closeDisabled} onClick={onClose}>Close sheet</button>
    </div> }
})
// Keep the real review shell and its receipt snapshot. Only its mutation/card UI is replaced.
vi.mock('@/features/program/progression/useProgressionReview', () => ({
  useProgressionReview: ({ onResolved }: { onResolved: (id: string, action: 'accepted' | 'dismissed') => void }) => ({
    errorMessage: null, isApplyingAll: false, isSaving: false, applyAll: vi.fn(),
    resolve: ({ decisionId, action }: { decisionId: string; action: 'accepted' | 'dismissed' }) => {
      api.resolve(decisionId, action)
      onResolved(decisionId, action)
    },
  }),
}))
vi.mock('@/features/program/progression/ProgressionDecisionCard', () => ({
  ProgressionDecisionCard: ({ decision, state, onResolve }: {
    decision: ProgressionDecision; state?: string; onResolve: (action: 'dismissed') => void
  }) => <div>{decision.movementName} decision {state ?? 'pending'}
    {!state ? <button onClick={() => onResolve('dismissed')}>Keep {decision.movementName}</button> : null}
  </div>,
}))

import { PlanSessionEntrySheet } from '../src/features/program/overview/PlanSessionEntrySheet'

const user = { id: 'account-plan' } as User
const program: ProgramInstance = { id: 'plan-a', templateId: 'template-a', templateVersionId: 'version-a',
  title: 'Strength plan', status: 'active', startDate: '2026-09-01', units: 'kg', rounding: 2.5,
  currentWeekIndex: 2, stateVersion: 3, customizationStatus: 'default',
  customizationSummary: { movementOverrideCount: 0, accessoryAdditionCount: 0 }, stateValues: [] }
function session(name = 'Fresh bench', load = 65): PlannedSession {
  return { id: 'planned-a', title: 'Bench session', programTitle: program.title, templateId: program.templateId,
    weekIndex: 2, weekLabel: 'Week 1', hardness: null, scheduledDate: '2026-09-22', estimatedMinutes: 30,
    units: 'kg', rounding: 2.5, movements: [{ id: 'slot-bench', movementId: 'bench_press', movementName: name,
      role: 'main', orderIndex: 0, targetSummary: 'One working set', sets: [{ id: 'set-1', setIndex: 1,
        completed: false, targetLoad: load, targetReps: 5, targetRir: 2,
        sourcePrescription: { targetLoad: { kind: 'fixed', kg: load } } }] }] }
}
const row: ProgramPlanSession = { globalIndex: 2, sessionNumber: 3, status: 'next', title: 'Bench session',
  saved: null, preview: session('Stale bench', 40), movementCount: 1, plannedSetCount: 1, completedSetCount: 0 }
const decision: ProgressionDecision = { id: 'decision-a', movementId: 'bench_press', movementName: 'Bench Press',
  stateKey: 'bench', stateType: 'training_max', ruleId: 'rule-a', scope: 'session', status: 'pending',
  inputSummary: 'Targets reached', recommendation: 'Increase next time', previousValue: 65, recommendedValue: 67.5 }
function today(overrides: Partial<TodayPayload> = {}): TodayPayload {
  return { activeProgram: program, plannedSession: session(), activeSession: null,
    completedSession: null, pendingDecisions: [], ...overrides }
}
function deferred() {
  let resolve!: (value: TodayPayload) => void
  const promise = new Promise<TodayPayload>((done) => { resolve = done })
  return { promise, resolve }
}
const queryKey = accountQueryKeys.today(user.id)
let client: QueryClient
beforeEach(() => {
  vi.resetAllMocks()
  api.activeStarts = 0
  api.startError = null
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
})
afterEach(() => client.clear())
function mount(selectedRow = row) {
  return render(<QueryClientProvider client={client}>
    <PlanSessionEntrySheet row={selectedRow} program={program} mode="guided" user={user} onClose={api.close} />
  </QueryClientProvider>)
}
function expectNoStart() {
  expect(screen.queryByRole('button', { name: 'Start this workout' })).toBeNull()
  expect(api.start).not.toHaveBeenCalled()
}

describe('Plan session entry', () => {
  it('requires a fresh Today read even with fresh cache, then replaces the stale row prescription', async () => {
    client.setQueryData(queryKey, today({ plannedSession: row.preview }))
    const request = deferred()
    api.read.mockReturnValueOnce(request.promise)
    mount()
    expect(screen.getByText('Checking your next workout…')).toBeTruthy()
    expectNoStart()
    await waitFor(() => expect(api.read).toHaveBeenCalledOnce())
    await act(async () => request.resolve(today()))
    await screen.findByRole('button', { name: 'How Fresh bench is worked out' })
    expect(screen.queryByText('Stale bench')).toBeNull()
    expect(screen.getByText('1 set of 5 · at 65 kg · leave 2 reps')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Start this workout' }))
    expect(api.start).toHaveBeenCalledWith(undefined, { onSuccess: api.close })
    expect(api.close).not.toHaveBeenCalled()
    act(() => api.start.mock.calls[0]?.[1].onSuccess())
    expect(api.close).toHaveBeenCalledOnce()
  })

  it('prioritizes an active ad-hoc workout over programme changes and pending progression', async () => {
    const active: WorkoutSession = { ...session(), id: 'blank-a', kind: 'ad_hoc', isAdHoc: true,
      sessionId: 'active-ad-hoc', status: 'in_progress', stateVersion: 1, title: 'Quick workout' }
    api.read.mockResolvedValueOnce(today({ activeSession: active, activeProgram: null,
      plannedSession: null, pendingDecisions: [decision] }))
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Resume workout' }))
    expectNoStart()
    expect(screen.queryByRole('button', { name: 'Review progression' })).toBeNull()
    expect(api.push).toHaveBeenCalledExactlyOnceWith({ pathname: '/session/[sessionId]',
      params: { sessionId: 'active-ad-hoc' } })
    expect(api.close).toHaveBeenCalledOnce()
  })

  it('opens explicit progression review before allowing a new planned workout', async () => {
    api.read.mockResolvedValueOnce(today({ pendingDecisions: [decision] }))
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Review progression' }))
    expect(screen.getByRole('dialog', { name: 'Progression review' })).toBeTruthy()
    expect(screen.getByText('Bench Press decision pending')).toBeTruthy()
    expectNoStart()
    expect(api.resolve).not.toHaveBeenCalled()
  })

  it('shows a future session as a preview without querying or exposing Start', () => {
    mount({ ...row, status: 'upcoming', globalIndex: 3 })
    expect(screen.getByRole('button', { name: 'How Stale bench is worked out' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy()
    expect(api.read).not.toHaveBeenCalled()
    expectNoStart()
  })

  it('keeps failed fresh reads closed over cache and requires a successful retry', async () => {
    client.setQueryData(queryKey, today())
    api.read.mockRejectedValueOnce(new Error('Plan connection failed'))
    const retry = deferred()
    api.read.mockReturnValueOnce(retry.promise)
    mount()
    await screen.findByText('Plan connection failed')
    expectNoStart()
    fireEvent.click(screen.getByRole('button', { name: 'Retry session' }))
    await waitFor(() => expect(api.read).toHaveBeenCalledTimes(2))
    expectNoStart()
    await act(async () => retry.resolve(today()))
    await screen.findByRole('button', { name: 'Start this workout' })
  })

  it.each([
    { reason: 'different programme', payload: { activeProgram: { ...program, id: 'replacement-plan' } } },
    { reason: 'cursor advanced', payload: { plannedSession: { ...session(), weekIndex: 3 } } },
    { reason: 'no planned workout', payload: { plannedSession: null } },
  ])('sends a stale next row to Today when $reason', async ({ payload }) => {
    api.read.mockResolvedValueOnce(today(payload))
    mount()
    await screen.findByRole('dialog', { name: 'Your plan has moved on' })
    expectNoStart()
    fireEvent.click(screen.getByRole('button', { name: 'Open Today' }))
    expect(api.navigate).toHaveBeenCalledExactlyOnceWith('/(tabs)')
    expect(api.close).toHaveBeenCalledOnce()
  })

  it('keeps the review and its resolved receipt mounted while Today refetches', async () => {
    api.read.mockResolvedValueOnce(today({ pendingDecisions: [decision] }))
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Review progression' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep Bench Press' }))
    expect(api.resolve).toHaveBeenCalledWith(decision.id, 'dismissed')
    const review = screen.getByRole('dialog', { name: 'Progression review' })
    expect(screen.getByText('Bench Press decision kept')).toBeTruthy()
    const refresh = deferred()
    api.read.mockReturnValueOnce(refresh.promise)
    await act(async () => { void client.invalidateQueries({ queryKey }) })
    await waitFor(() => expect(api.read).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('dialog', { name: 'Progression review' })).toBe(review)
    expect(screen.queryByText('Checking your next workout…')).toBeNull()
    expectNoStart()
    await act(async () => refresh.resolve(today()))
    await waitFor(() => expect(client.isFetching({ queryKey })).toBe(0))
    expect(screen.getByRole('dialog', { name: 'Progression review' })).toBe(review)
    expect(screen.getByText('Bench Press decision kept')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByRole('button', { name: 'Start this workout' })).toBeTruthy()
    expect(api.start).not.toHaveBeenCalled()
  })
})
