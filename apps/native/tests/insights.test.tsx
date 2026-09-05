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
vi.mock('expo-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/components/SheetModal', () => ({ SheetModal: () => null }))
vi.mock('@/components/ConfirmDialog', () => ({ ConfirmDialog: () => null }))
vi.mock('@/components/Screen', () => ({ Screen: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('@/components/SettingsHeaderAction', () => ({ SettingsHeaderAction: () => null }))
vi.mock('@/features/history/SessionSummarySheet', () => ({ SessionSummarySheet: () => null }))
vi.mock('@/features/history/MovementHistorySheet', () => ({ MovementHistorySheet: () => null }))
const api = vi.hoisted(() => ({ dashboard: vi.fn(), program: vi.fn(), user: { id: 'one' } as User }))
vi.mock('@/features/history/queries', () => ({ historyDashboardQueryOptions: (user: User) => ({ queryKey: ['dashboard', user.id], queryFn: api.dashboard }) }))
vi.mock('@/features/program/queries', () => ({ programOverviewQueryOptions: (user: User) => ({ queryKey: ['program', user.id], queryFn: api.program }) }))
vi.mock('@/lib/session-provider', () => ({ useSession: () => ({ user: api.user }) }))
vi.mock('@/lib/account', () => ({ buildUserContext: vi.fn() }))
const { InsightsScreen } = await import('../src/features/history/InsightsScreen')

const dashboard = buildHistoryDashboard({ sessions: [], substitutions: [] })
const data = { ...dashboard, insights: buildHistoryInsights({ sessions: [], overview: dashboard.overview,
  bodyweightEntries: [{ id: 'w', recordedOn: '2026-09-05', weightKg: 80 }], sex: null,
  accountUnits: 'lb', now: '2026-09-05T12:00:00Z', today: '2026-09-05' }) }

describe('Insights screen state', () => {
  it('supports direct entry, bodyweight-only accounts, six tabs, persistent ranges, and account changes', async () => {
    api.user = { id: 'one' } as User
    api.dashboard.mockResolvedValue(data)
    api.program.mockResolvedValue({ activeProgram: null })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const view = () => <QueryClientProvider client={client}><InsightsScreen /></QueryClientProvider>
    const { rerender } = render(view())
    await screen.findByText('Latest recorded · 2026-09-05')
    expect(api.program).toHaveBeenCalledOnce()
    expect(screen.getAllByText(/176.4 lb/).length).toBeGreaterThan(0)
    for (const name of ['Overview', 'Strength', 'Muscle Fatigue', 'Movements', 'Records', 'Sessions']) {
      expect(screen.getByRole('tab', { name })).toBeTruthy()
    }
    fireEvent.click(screen.getByRole('tab', { name: '3M' }))
    const selectedFill = screen.getByRole('tab', { name: '3M' }).style.backgroundColor
    fireEvent.click(screen.getByRole('tab', { name: 'Strength' }))
    expect(screen.getByRole('tab', { name: '3M' }).style.backgroundColor).toBe(selectedFill)
    fireEvent.click(screen.getByRole('tab', { name: 'Muscle Fatigue' }))
    expect(screen.getByText('Muscle fatigue · last 7 days')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Overview' }))
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
