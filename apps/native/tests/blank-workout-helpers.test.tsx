import type { PropsWithChildren, ReactNode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TodayPayload, WorkoutSession } from '@sheetless/domain/session/types'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { themeProviderMock } from './support/theme'

const api = vi.hoisted(() => ({ frequent: vi.fn(), today: vi.fn(), add: vi.fn(), options: vi.fn() }))
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }) }))
vi.mock('lucide-react-native', () => ({ Plus: () => null }))
vi.mock('@sheetless/data/session/reads', () => ({ getToday: api.today, getSession: vi.fn() }))
vi.mock('@sheetless/data/session/frequent-exercises', () => ({ getFrequentExercises: api.frequent }))
vi.mock('@sheetless/data/session/ad-hoc-exercises', () => ({ addAdHocExercise: api.add, removeAdHocExercise: vi.fn() }))
vi.mock('@sheetless/data/movement/catalog', () => ({ listMovementOptions: api.options, listAccessoryMovementOptions: vi.fn() }))
vi.mock('@/features/session/editing/AddExerciseSheet', () => ({ AddExerciseSheet: ({ open }: { open: boolean }) =>
  open ? <div role="dialog" aria-label="Add exercise">Exercise picker</div> : null }))
vi.mock('@/components', () => {
  const Block = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return { Text: Block, Caption: Block, Heading: Block, Panel: Block,
    Button: ({ label, onPress, loading, disabled }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean }) =>
      <button disabled={loading || disabled} onClick={onPress}>{label}</button>,
    SheetModal: ({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) =>
      <div role="dialog" aria-label={title}>{children}{footer}</div> }
})
import { EmptyWorkoutOverview } from '../src/features/session/overview/EmptyWorkoutOverview'
import { FrequentExercises } from '../src/features/session/overview/FrequentExercises'

const user = { id: 'blank-user' } as User
const session = { id: 'ad-hoc', sessionId: 'blank-1', stateVersion: 4, status: 'in_progress',
  isAdHoc: true, title: 'Blank workout', units: 'kg', movements: [] } as unknown as WorkoutSession
const planned = { ...session, id: 'planned', title: 'Planned squat day', programTitle: 'Programme', weekLabel: 'Week 2', movements: [{
  id: 'planned-movement', movementId: 'squat', movementName: 'Squat', role: 'main' as const, orderIndex: 0,
  targetSummary: '3 × 5', sets: [{ id: 'set-1', setIndex: 1, completed: false, targetReps: 5, targetLoad: 80 }],
}] }
const today: TodayPayload = { activeProgram: null, plannedSession: planned, activeSession: session,
  completedSession: null, pendingDecisions: [] }
const suggestion = { movementId: 'squat', movementName: 'Squat', completedWorkoutCount: 3 }
function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}
beforeEach(() => {
  vi.resetAllMocks()
  api.frequent.mockResolvedValue([suggestion])
  api.today.mockResolvedValue(today)
  api.options.mockResolvedValue([])
})

describe('blank workout helpers', () => {
  it('keeps the ordinary picker usable when suggestions fail and retries suggestions independently', async () => {
    const { wrapper } = harness()
    api.frequent.mockRejectedValueOnce(new Error('Suggestion read failed')).mockResolvedValueOnce([suggestion])
    render(<EmptyWorkoutOverview user={user} session={session} disabled={false} onAdded={vi.fn()} />, { wrapper })
    const retry = await screen.findByRole('button', { name: 'Retry frequent exercises' })
    fireEvent.click(screen.getByRole('button', { name: 'Add your first exercise' }))
    expect(screen.getByRole('dialog', { name: 'Add exercise' })).toBeTruthy()
    fireEvent.click(retry)
    expect(await screen.findByRole('button', { name: '+ Squat' })).toBeTruthy()
    expect(api.today).toHaveBeenCalledOnce()
    expect(screen.getByText('Past 90 days')).toBeTruthy()
  })

  it('uses the existing guarded add operation and the Overview selection callback', async () => {
    const { client, wrapper } = harness()
    const onAdded = vi.fn()
    api.add.mockResolvedValue({ ...session, stateVersion: 5, movements: [{ ...planned.movements[0], id: 'added-slot' }] })
    render(<EmptyWorkoutOverview user={user} session={session} disabled={false} onAdded={onAdded} />, { wrapper })
    fireEvent.click(await screen.findByRole('button', { name: '+ Squat' }))
    await waitFor(() => expect(onAdded).toHaveBeenCalledExactlyOnceWith('added-slot'))
    expect(api.add.mock.calls[0][1]).toMatchObject({ sessionId: session.sessionId, movementId: 'squat', expectedStateVersion: 4 })
    expect(api.add.mock.calls[0][1].clientMutationId).toBeTruthy()
    expect(client.getQueryData<WorkoutSession>(accountQueryKeys.session(user.id, session.sessionId))?.stateVersion).toBe(5)
  })

  it('refreshes before previewing, keeps the blank workout by default and hands discard to confirmation explicitly', async () => {
    const { wrapper } = harness()
    const onDiscardBlank = vi.fn()
    const pending = deferred<TodayPayload>()
    api.today.mockResolvedValueOnce(today).mockReturnValueOnce(pending.promise).mockResolvedValue(today)
    render(<EmptyWorkoutOverview user={user} session={session} disabled={false} onAdded={vi.fn()} onDiscardBlank={onDiscardBlank} />, { wrapper })
    fireEvent.click(await screen.findByRole('button', { name: 'View planned workout' }))
    expect(await screen.findByText('Checking your planned workout…')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Discard blank and return to Today' })).toBeNull()
    await act(async () => pending.resolve(today))
    expect(await screen.findByRole('dialog', { name: 'Planned squat day' })).toBeTruthy()
    expect(onDiscardBlank).not.toHaveBeenCalled()
    expect(api.add).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Keep blank workout' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onDiscardBlank).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'View planned workout' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Discard blank and return to Today' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onDiscardBlank).toHaveBeenCalledOnce()
  })

  it('does not expose another account’s cached suggestions and keys equipment eligibility separately', async () => {
    const { client, wrapper } = harness()
    client.setQueryData(accountQueryKeys.frequentExercises('other-user', false), [{ ...suggestion, movementName: 'Other private exercise' }])
    api.frequent.mockResolvedValue([])
    render(<FrequentExercises user={user} freeWeightOnly disabled={false} error={null} onAdd={vi.fn()} />, { wrapper })
    await waitFor(() => expect(api.frequent).toHaveBeenCalledWith({ user }, { freeWeightOnly: true }))
    expect(screen.queryByText(/Other private exercise/)).toBeNull()
    expect(accountQueryKeys.frequentExercises(user.id, true)).not.toEqual(accountQueryKeys.frequentExercises(user.id, false))
  })
})
