import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { buildHistoryInsights } from '@sheetless/domain/history/build-insights'
import { buildHistoryDashboard } from '@sheetless/domain/history/history'
import { themeProviderMock } from './support/theme'
import { svgMock } from './support/svg'

vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('react-native-svg', () => svgMock())
vi.mock('lucide-react-native', () => ({ ChevronRight: () => null, Dumbbell: () => null, Activity: () => null, Trophy: () => null, History: () => null, TrendingUp: () => null }))
vi.mock('expo-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/components/SheetModal', () => ({ SheetModal: () => null }))
vi.mock('@/components/ConfirmDialog', () => ({ ConfirmDialog: () => null }))
vi.mock('@/components/Screen', () => ({ Screen: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('@/components/SettingsHeaderAction', () => ({ SettingsHeaderAction: () => null }))
vi.mock('@/features/history/sessions/SessionSummarySheet', () => ({ SessionSummarySheet: () => null }))
vi.mock('@/features/history/movements/MovementHistorySheet', () => ({ MovementHistorySheet: () => null }))
const api = vi.hoisted(() => ({ dashboard: vi.fn(), program: vi.fn(), user: { id: 'one' } as User }))
vi.mock('@/features/history/queries', () => ({ historyDashboardQueryOptions: (user: User) => ({ queryKey: ['dashboard', user.id], queryFn: api.dashboard }) }))
vi.mock('@/features/program/queries', () => ({ programOverviewQueryOptions: (user: User) => ({ queryKey: ['program', user.id], queryFn: api.program }) }))
vi.mock('@/lib/session-provider', () => ({ useSession: () => ({ user: api.user }) }))
vi.mock('@/lib/account', () => ({ buildUserContext: vi.fn() }))
vi.mock('@/lib/experience-mode', () => ({ useExperienceMode: () => ({ mode: 'guided', isFull: false, showFormulas: false }) }))
const { InsightsScreen } = await import('../src/features/history/InsightsScreen')
const { InsightsSessions } = await import('../src/features/history/sessions/InsightsSessions')
const { InsightsMovements } = await import('../src/features/history/movements/InsightsMovements')

const dashboard = buildHistoryDashboard({ sessions: [], substitutions: [] })
const data = { ...dashboard, insights: buildHistoryInsights({ sessions: [], overview: dashboard.overview,
  bodyweightEntries: [{ id: 'w', recordedOn: '2026-09-05', weightKg: 80 }], sex: null,
  accountUnits: 'lb', now: '2026-09-05T12:00:00Z', today: '2026-09-05' }) }

describe('Insights screen state', () => {
  it('reaches and searches workouts after the first twenty, then opens the right receipt', () => {
    const onOpen = vi.fn()
    const sessions = Array.from({ length: 25 }, (_, index) => ({
      id: `session-${index}`, title: `Workout ${index + 1}`, scheduledDate: '2026-09-01',
      movementCount: 3, completedSetCount: 8, plannedSetCount: 8, tonnage: 2000, durationMinutes: 40,
    }))
    render(<InsightsSessions sessions={sessions} filter="all" onFilterChange={vi.fn()} onOpen={onOpen} />)
    expect(screen.queryByText('Workout 25')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Show older workouts (5 more)' }))
    fireEvent.click(screen.getByText('Workout 25'))
    expect(onOpen).toHaveBeenCalledWith('session-24')
    fireEvent.change(screen.getByRole('textbox', { name: 'Search sessions' }), { target: { value: 'Workout 25' } })
    expect(screen.getByText('Showing 1 of 1 matching workouts. Browsing covers up to the latest 60; analytics use up to 240.')).toBeTruthy()
    expect(screen.queryByText('Workout 1')).toBeNull()
  })

  it('labels a historical movement best with its recorded units after the account trains in pounds', () => {
    render(<InsightsMovements user={api.user} units="lb" movements={[{
      movementId: 'squat', movementName: 'Back squat', category: 'squat', lastPerformedAt: '2026-09-01',
      totalCompletedSets: 3, totalVolume: 3000, substitutionCount: 0,
      bestSet: { id: 'best', movementId: 'squat', movementName: 'Back squat', role: 'main', type: 'top_set',
        load: 150, reps: 5, rir: 2, e1rm: 185, volume: 750, sessionId: 'past', sessionTitle: 'Squats', units: 'kg' },
    }]} />)
    expect(screen.getByText('Best 150 kg × 5')).toBeTruthy()
    expect(screen.queryByText('Best 150 lb × 5')).toBeNull()
  })

  it('supports direct entry, bodyweight-only accounts, library navigation, persistent ranges, and account changes', async () => {
    api.user = { id: 'one' } as User
    api.dashboard.mockResolvedValue(data)
    api.program.mockResolvedValue({ activeProgram: null })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const view = () => <QueryClientProvider client={client}><InsightsScreen /></QueryClientProvider>
    const { rerender } = render(view())
    await screen.findByText('Latest recorded · 2026-09-05')
    expect(api.program).toHaveBeenCalledOnce()
    expect(screen.getAllByText(/176.4 lb/).length).toBeGreaterThan(0)
    for (const name of ['Strength over time', 'Exercise progress', 'Muscle workload', 'Records', 'Workout history']) {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeTruthy()
    }
    fireEvent.click(screen.getByRole('tab', { name: '3M' }))
    const selectedFill = screen.getByRole('tab', { name: '3M' }).style.backgroundColor
    fireEvent.click(screen.getByRole('button', { name: /Strength over time/ }))
    expect(screen.getByRole('tab', { name: '3M' }).style.backgroundColor).toBe(selectedFill)
    fireEvent.click(screen.getByRole('button', { name: 'Back to overview' }))
    fireEvent.click(screen.getByRole('button', { name: /Muscle workload/ }))
    expect(screen.getByText('Recent muscle work · last 7 days')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back to overview' }))
    expect(screen.getByRole('tab', { name: '3M' }).style.backgroundColor).toBe(selectedFill)
    api.user = { id: 'two' } as User
    rerender(view())
    await waitFor(() => expect(screen.getByRole('tab', { name: '8W' }).style.backgroundColor).toBe(selectedFill))
  })

  it('provides explicit retries for dashboard and programme failures', async () => {
    api.dashboard.mockRejectedValueOnce(new Error('Training unavailable')).mockResolvedValue(data)
    api.program.mockRejectedValue(new Error('Programme unavailable'))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><InsightsScreen /></QueryClientProvider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Retry Insights' }))
    expect(await screen.findByText('Latest recorded · 2026-09-05')).toBeTruthy()
    expect(await screen.findByRole('button', { name: 'Retry programme context' })).toBeTruthy()
  })
})
