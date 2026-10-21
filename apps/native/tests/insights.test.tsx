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
vi.mock('lucide-react-native', () => ({ ChevronLeft: () => null, ChevronRight: () => null }))
vi.mock('@/components/SettingsHeaderAction', () => ({ SettingsHeaderAction: () => null }))
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }))
const navigation = vi.hoisted(() => ({ push: vi.fn(), dismissTo: vi.fn() }))
vi.mock('expo-router', () => ({ useRouter: () => navigation }))
vi.mock('@/components/SheetModal', () => ({ SheetModal: () => null }))
vi.mock('@/components/ConfirmDialog', () => ({ ConfirmDialog: () => null }))
vi.mock('@/features/history/sessions/SessionSummarySheet', () => ({ SessionSummarySheet: () => null }))
vi.mock('@/features/history/movements/MovementHistorySheet', () => ({ MovementHistorySheet: () => null }))
const api = vi.hoisted(() => ({ dashboard: vi.fn(), program: vi.fn(), user: { id: 'one' } as User | null }))
vi.mock('@/features/history/queries', () => ({ historyDashboardQueryOptions: (user: User) => ({ queryKey: ['dashboard', user.id], queryFn: api.dashboard }) }))
vi.mock('@/features/program/queries', () => ({ programOverviewQueryOptions: (user: User) => ({ queryKey: ['program', user.id], queryFn: api.program }) }))
vi.mock('@/lib/session-provider', () => ({ useSession: () => ({ user: api.user }) }))
vi.mock('@/lib/account', () => ({ useMe: () => ({ data: { experienceMode: 'guided' } }) }))
const { InsightsScreen } = await import('../src/features/history/InsightsScreen')
const { StrengthScreen } = await import('../src/features/history/StrengthScreen')
const { InsightsStateProvider } = await import('../src/features/history/navigation/InsightsState')

const dashboard = buildHistoryDashboard({ sessions: [], substitutions: [] })
const data = { ...dashboard, insights: buildHistoryInsights({ sessions: [], overview: dashboard.overview,
  bodyweightEntries: [{ id: 'w', recordedOn: '2026-09-05', weightKg: 80 }], sex: null,
  accountUnits: 'lb', now: '2026-09-05T12:00:00Z', today: '2026-09-05' }) }

describe('Insights screen recovery and navigation', () => {
  it('supports direct entry, bodyweight-only accounts, nested destinations, persistent ranges and account reset', async () => {
    api.user = { id: 'one' } as User
    api.dashboard.mockResolvedValue(data)
    api.program.mockResolvedValue({ activeProgram: null })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const view = (strength = false) => <QueryClientProvider client={client}><InsightsStateProvider accountId={api.user?.id ?? 'anonymous'}>
      {strength ? <StrengthScreen /> : <InsightsScreen />}
    </InsightsStateProvider></QueryClientProvider>
    const { rerender } = render(view())
    await screen.findByText('Latest recorded · 2026-09-05')
    expect(screen.getAllByText(/176.4 lb/).length).toBeGreaterThan(0)
    for (const name of ['See your strength', 'Your lifts', 'All your best sets', 'Muscles', 'Past workouts']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
    fireEvent.click(screen.getByRole('button', { name: 'Past workouts' }))
    expect(navigation.push).toHaveBeenCalledWith('/history/workouts')
    fireEvent.click(screen.getByRole('tab', { name: '3M' }))
    expect(screen.getByText('Selected range: 3M')).toBeTruthy()
    rerender(view(true))
    expect(await screen.findByText('Selected range: 3M')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back to Insights' }))
    expect(navigation.dismissTo).toHaveBeenCalledWith('/history')
    rerender(view())
    expect(await screen.findByText('Selected range: 3M')).toBeTruthy()
    api.user = { id: 'two' } as User
    rerender(view())
    await screen.findByText('Selected range: 8W')
    api.user = null
    rerender(view())
    expect(screen.queryByText('Selected range: 8W')).toBeNull()
  })

  it('provides explicit retries for dashboard and programme failures', async () => {
    api.user = { id: 'one' } as User
    api.dashboard.mockRejectedValueOnce(new Error('Training unavailable')).mockResolvedValue(data)
    api.program.mockRejectedValue(new Error('Programme unavailable'))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><InsightsStateProvider accountId={api.user.id}><InsightsScreen /></InsightsStateProvider></QueryClientProvider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Retry Insights' }))
    expect(await screen.findByText('Latest recorded · 2026-09-05')).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Retry programme context' })).toBeTruthy())
  })
})
