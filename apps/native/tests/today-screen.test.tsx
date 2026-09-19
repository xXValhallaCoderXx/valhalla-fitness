import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { WorkoutSession } from '@sheetless/domain/session/types'
import type { TodayPayload } from '@sheetless/domain/session/types/read-models'
import type { ProgramInstance, ProgressionDecision } from '@sheetless/domain/program/types'
import type { UserProfile } from '@sheetless/domain/account/types'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { themeProviderMock } from './support/theme'

const api = vi.hoisted(() => ({ profile: vi.fn(), today: vi.fn(), start: vi.fn(), blank: vi.fn(), count: vi.fn(), dismiss: vi.fn(), templates: vi.fn(), navigate: vi.fn() }))
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('@/lib/session-provider', () => ({ useSession: () => ({ user: { id: 'account-a' } }) }))
vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({}) }))
vi.mock('@/lib/use-timezone-sync', () => ({ useTimezoneSync: () => {} }))
vi.mock('expo-router', () => ({ router: { push: api.navigate, navigate: api.navigate } }))
vi.mock('@sheetless/data/account/profile', () => ({ getMe: api.profile, dismissFullModeHint: api.dismiss }))
vi.mock('@sheetless/data/account/experience', () => ({ getExperienceSignals: api.count }))
vi.mock('@sheetless/data/session/reads', () => ({ getToday: api.today }))
vi.mock('@sheetless/data/session/lifecycle', () => ({ startSession: api.start, startAdHocSession: api.blank }))
vi.mock('@sheetless/data/program/templates', () => ({ listTemplates: api.templates }))
vi.mock('@/features/history/queries', () => ({ todayHistorySupportQueryOptions: () => ({ queryKey: ['history-support'], queryFn: async () => null }) }))
vi.mock('@/features/program/return/ReturnGuideCard', () => ({ ReturnGuideCard: () => null }))
vi.mock('@/features/program/progression/ProgressionReviewAlert', () => ({
  ProgressionReviewAlert: ({ decisions, onReview }: { decisions: unknown[]; onReview: () => void }) => decisions.length ? <button onClick={onReview}>Review load updates</button> : null,
}))
vi.mock('@/features/program/progression/ProgressionReviewSheet', () => ({ ProgressionReviewSheet: () => null }))
vi.mock('@/features/templates/find-my-plan/FindMyPlanSheet', () => ({ FindMyPlanSheet: () => <div>Plan finder ready</div> }))
vi.mock('@/components', async () => {
  const { Button } = await import('../src/components/Button')
  const { Text } = await import('../src/components/Text')
  const { Caption } = await import('../src/components/Caption')
  const { Panel } = await import('../src/components/Panel')
  const { Heading } = await import('../src/components/Heading')
  const { Badge } = await import('../src/components/Badge')
  const { SectionLabel } = await import('../src/components/SectionLabel')
  const Block = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return { Button, Text, Caption, Panel, Heading, Badge, SectionLabel, Screen: Block, SettingsHeaderAction: () => null,
    PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }
})

import { TodayScreen } from '../src/features/session/TodayScreen'

const profile = { id: 'account-a', units: 'kg', timezone: 'Asia/Singapore', experienceMode: 'guided', showFormulas: false, fullModeHintDismissedAt: null } as UserProfile
const planned: WorkoutSession = {
  id: 'planned-a', sessionId: 'session-a', stateVersion: 1, status: 'in_progress', title: 'Strength day',
  programTitle: 'My programme', templateId: 'template-a', weekIndex: 0, weekLabel: 'Week 1', hardness: 'Medium',
  scheduledDate: '2026-09-19', units: 'kg', rounding: 2.5, estimatedMinutes: 45,
  movements: ['Squat', 'Bench press', 'Row', 'Curl', 'Calf raise'].map((name, index) => ({
    id: `slot-${index}`, movementId: `movement-${index}`, movementName: name, role: index === 0 ? 'main' : 'accessory',
    orderIndex: index, targetSummary: '3 × 5 @ 80% TM',
    sets: [1, 2, 3].map((setIndex) => ({ id: `${index}-${setIndex}`, setIndex, targetLoad: 40, targetReps: 5, targetRir: 2, completed: false })),
  })),
}
const program = { id: 'programme-a', title: 'My programme', units: 'kg', currentWeekIndex: 0 } as ProgramInstance
const pending = [{ id: 'decision-a', status: 'pending' }] as ProgressionDecision[]
const payload = (patch: Partial<TodayPayload> = {}): TodayPayload => ({ activeProgram: program, activeSession: null, plannedSession: planned, completedSession: null, pendingDecisions: [], ...patch })
let client: QueryClient
beforeEach(() => {
  vi.resetAllMocks()
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })
  api.profile.mockResolvedValue(profile)
  api.today.mockResolvedValue(payload())
  api.count.mockResolvedValue({ completedSessions: 7 })
  api.templates.mockResolvedValue([])
  api.start.mockResolvedValue(planned)
  api.blank.mockResolvedValue({ ...planned, isAdHoc: true, movements: [] })
  api.dismiss.mockResolvedValue({ ...profile, fullModeHintDismissedAt: '2026-09-19T00:00:00Z' })
})
afterEach(() => client.clear())
const mount = () => render(<QueryClientProvider client={client}><TodayScreen /></QueryClientProvider>)

describe('native Today workout entry', () => {
  it('discloses every movement while keeping Guided vocabulary and the start action', async () => {
    mount()
    await screen.findByText('Squat')
    expect(screen.queryByText('Curl')).toBeNull()
    expect(screen.queryByText('3 × 5 @ 80% TM')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'See all 5 movements · 2 more' }))
    expect(screen.getByText('Curl')).toBeTruthy()
    expect(screen.getByText('Calf raise')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Show fewer movements' }).getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Show fewer movements' }))
    expect(screen.queryByText('Curl')).toBeNull()
    expect(screen.getByRole('button', { name: 'Start workout' })).toBeTruthy()
  })

  it('changes reading notation through profile state without changing the workout', async () => {
    mount()
    await screen.findByText('Squat')
    act(() => client.setQueryData(accountQueryKeys.profile('account-a'), { ...profile, experienceMode: 'full' }))
    await screen.findAllByText('3 × 5 @ 80% TM')
    expect(client.getQueryData<TodayPayload>(accountQueryKeys.today('account-a'))?.plannedSession).toEqual(planned)
  })

  it('keeps Resume available before pending review and never offers a second start', async () => {
    api.today.mockResolvedValue(payload({ activeSession: planned, pendingDecisions: pending }))
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Resume workout' }))
    expect(screen.getByRole('button', { name: 'Review load updates' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Start workout' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Start blank workout' })).toBeNull()
    expect(api.navigate).toHaveBeenCalledWith({ pathname: '/session/[sessionId]', params: { sessionId: 'session-a' } })
  })

  it('blocks a new planned start for pending review while allowing a blank workout', async () => {
    api.today.mockResolvedValue(payload({ pendingDecisions: pending }))
    mount()
    const start = await screen.findByRole('button', { name: 'Start workout' })
    expect(start.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(start)
    expect(api.start).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Start blank workout' }))
    await waitFor(() => expect(api.blank).toHaveBeenCalledTimes(1))
  })

  it('retains the planned start identity across failure, refresh and explicit retry', async () => {
    api.start.mockRejectedValueOnce(new Error('Connection interrupted')).mockResolvedValueOnce(planned)
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Start workout' }))
    await screen.findByText(/Connection interrupted/)
    await waitFor(() => expect(api.today).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByRole('button', { name: 'Start workout' }))
    await waitFor(() => expect(api.start).toHaveBeenCalledTimes(2))
    expect(api.start.mock.calls[1][1]).toEqual(api.start.mock.calls[0][1])
    await waitFor(() => expect(api.navigate).toHaveBeenCalled())
  })

  it('opens the completed receipt and labels the next workout separately', async () => {
    const completed = { ...planned, sessionId: 'completed-a', status: 'completed' as const, title: 'Yesterday’s strength' }
    api.today.mockResolvedValue(payload({ completedSession: completed, lastCompletedSession: completed }))
    mount()
    await screen.findByRole('button', { name: 'Start next workout' })
    fireEvent.click(screen.getByRole('button', { name: 'View workout recap' }))
    expect(api.navigate).toHaveBeenCalledWith({ pathname: '/session/[sessionId]/summary', params: { sessionId: 'completed-a' } })
  })

  it('offers programme finding and immediate ad-hoc entry with no active programme', async () => {
    api.today.mockResolvedValue(payload({ activeProgram: null, plannedSession: null }))
    mount()
    await screen.findByText('Choose a programme')
    expect(screen.getByRole('button', { name: 'Start blank workout' })).toBeTruthy()
    expect(api.templates).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Find My Plan' }))
    await screen.findByText('Plan finder ready')
  })

  it('does not describe a missing planned session as a scheduled rest day', async () => {
    api.today.mockResolvedValue(payload({ plannedSession: null }))
    mount()
    await screen.findByText('No planned workout is ready')
    expect(screen.getByRole('button', { name: 'Open your plan' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start blank workout' })).toBeTruthy()
  })
})

describe('optional Full invitation', () => {
  it('stays absent before eight completed workouts and never changes the mode automatically', async () => {
    mount()
    await screen.findByText('Squat')
    await waitFor(() => expect(api.count).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Want a little more detail?')).toBeNull()
    expect(client.getQueryData<UserProfile>(accountQueryKeys.profile('account-a'))?.experienceMode).toBe('guided')
  })

  it('keeps a failed dismissal retryable and persists the choice before opening Settings', async () => {
    api.count.mockResolvedValue({ completedSessions: 8 })
    api.dismiss.mockRejectedValueOnce(new Error('Could not save choice')).mockResolvedValueOnce({ ...profile, fullModeHintDismissedAt: '2026-09-19' })
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Open Settings' }))
    await screen.findByText(/Could not save choice/)
    expect(api.navigate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }))
    await waitFor(() => expect(api.navigate).toHaveBeenCalledWith({ pathname: '/settings', params: { section: 'experience' } }))
    expect(screen.queryByText('Want a little more detail?')).toBeNull()
    expect(client.getQueryData<UserProfile>(accountQueryKeys.profile('account-a'))?.experienceMode).toBe('guided')
  })

  it('does not restore a departed account or navigate after a late dismissal response', async () => {
    let resolve!: (value: UserProfile) => void
    api.count.mockResolvedValue({ completedSessions: 8 })
    api.dismiss.mockReturnValue(new Promise<UserProfile>((done) => { resolve = done }))
    const view = mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Open Settings' }))
    await waitFor(() => expect(api.dismiss).toHaveBeenCalledTimes(1))
    view.unmount()
    client.removeQueries({ queryKey: accountQueryKeys.profile('account-a'), exact: true })
    await act(async () => resolve({ ...profile, fullModeHintDismissedAt: '2026-09-19' }))
    expect(client.getQueryData(accountQueryKeys.profile('account-a'))).toBeUndefined()
    expect(api.navigate).not.toHaveBeenCalled()
  })
})
