import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { themeProviderMock } from './support/theme'

// Exercise query gates and retry wiring, not native layout, sheets, charts or navigation.
const api = vi.hoisted(() => ({
  profile: vi.fn(), today: vi.fn(), templates: vi.fn(), setup: vi.fn(),
  program: vi.fn(), activeProgram: vi.fn(), session: vi.fn(), summary: vi.fn(), openBrowser: vi.fn(), navigate: vi.fn(),
}))
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('@/lib/session-provider', () => ({ useSession: () => ({ user: { id: 'account-a', email: 'member@example.test' } }) }))
vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({}) }))
vi.mock('@/lib/use-timezone-sync', () => ({ useTimezoneSync: () => {} }))
vi.mock('expo-router', () => ({
  router: { push: api.navigate, replace: api.navigate, navigate: api.navigate },
  useIsFocused: () => true,
}))
vi.mock('expo-keep-awake', () => ({ useKeepAwake: () => {} }))
vi.mock('expo-web-browser', () => ({ openBrowserAsync: api.openBrowser }))
vi.mock('lucide-react-native', () => ({ Mail: () => null }))
vi.mock('@sheetless/data/account/profile', () => ({ getMe: api.profile }))
vi.mock('@sheetless/data/session/reads', () => ({ getToday: api.today, getSession: api.session }))
vi.mock('@sheetless/data/session/summary', () => ({ getSessionSummary: api.summary }))
vi.mock('@sheetless/data/session/lifecycle', () => ({ startSession: vi.fn() }))
vi.mock('@sheetless/data/program/templates', () => ({ listTemplates: api.templates, getProgramSetupOptions: api.setup }))
vi.mock('@sheetless/data/history/history', () => ({ getProgramOverview: api.program }))
vi.mock('@sheetless/data/program/active-program', () => ({ getActiveProgram: api.activeProgram }))
vi.mock('@/features/history/queries', () => ({
  todayHistorySupportQueryOptions: () => ({ queryKey: ['history-support'], queryFn: async () => null }),
}))
vi.mock('@/components', async () => {
  const { Button } = await import('../src/components/Button')
  const Block = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  return {
    Button, Screen: Block, Panel: Block, Text: Block, Caption: Block, Heading: Block, SectionLabel: Block,
    Badge: Block, BrandMark: () => null, SettingsHeaderAction: () => null,
    PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
    EmptyState: ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
      <div><h2>{title}</h2>{children}{action}</div>
    ),
    TextInput: ({ value, onChangeText, testID }: { value: string; onChangeText: (value: string) => void; testID: string }) => (
      <input aria-label={testID} value={value} onChange={(event) => onChangeText(event.target.value)} />
    ),
  }
})
vi.mock('@/features/program/return/ReturnGuideCard', () => ({ ReturnGuideCard: () => null }))
vi.mock('@/features/program/progression/ProgressionReviewAlert', () => ({ ProgressionReviewAlert: () => null }))
vi.mock('@/features/program/progression/ProgressionReviewSheet', () => ({ ProgressionReviewSheet: () => null }))
vi.mock('@/features/program/equipment/ProgramEquipmentModeCard', () => ({ ProgramEquipmentModeCard: () => null }))
vi.mock('@/features/program/overview/ProgramDetails', () => ({ ProgramDetails: () => null }))
vi.mock('@/features/program/overview/ProgramTimeline', () => ({ ProgramTimeline: () => null }))
vi.mock('@/features/program/overview/ProgramPhaseMap', () => ({ ProgramPhaseMap: () => null }))
vi.mock('@/features/program/overview/ProgramHeader', () => ({ ProgramHeader: () => null }))
vi.mock('@/features/session/today/StartBlankWorkoutButton', () => ({ StartBlankWorkoutButton: () => null }))
vi.mock('@/features/session/today/TodayPlannedSessionCard', () => ({ TodayPlannedSessionCard: () => null }))
vi.mock('@/features/session/today/TodayActiveSessionCard', () => ({ TodayActiveSessionCard: () => null }))
vi.mock('@/features/templates/setup/TemplateStartSetup', () => ({ TemplateStartSetup: () => <div>Programme setup ready</div> }))
vi.mock('@/features/templates/catalogue/ActiveProgramBand', () => ({ ActiveProgramBand: () => null }))
vi.mock('@/features/templates/catalogue/TemplateCatalogueFilters', () => ({ TemplateCatalogueFilters: () => null }))
vi.mock('@/features/templates/catalogue/TemplateCard', () => ({ TemplateCard: () => null }))
vi.mock('@/features/templates/catalogue/TemplateFinderPrompt', () => ({ TemplateFinderPrompt: () => null }))
vi.mock('@/features/templates/favorites/FavoriteWorkoutsSection', () => ({ FavoriteWorkoutsSection: () => null }))
vi.mock('@/features/templates/find-my-plan/FindMyPlanSheet', () => ({ FindMyPlanSheet: () => null }))
vi.mock('@/features/session/live/FocusWorkoutView', () => ({ FocusWorkoutView: () => <div>Workout ready</div> }))
vi.mock('@/features/session/rest-timer/RestTimerProvider', () => ({ RestTimerProvider: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('@sheetless/domain/history/workout-summary', () => ({
  buildWorkoutSummary: () => ({ completion: { completed: 1, planned: 1 }, stats: { durationMinutes: 10 } }),
}))
vi.mock('@sheetless/domain/session/session-receipt', () => ({ buildSessionReceipt: () => ({}) }))
vi.mock('@sheetless/domain/feedback/post-workout', () => ({ postWorkoutFeedbackEligible: () => false }))
vi.mock('@/features/feedback/PostWorkoutFeedback', () => ({ PostWorkoutFeedback: () => null }))
vi.mock('@/features/session/live/ReturnSessionNotice', () => ({ ReturnSessionNotice: () => null }))
vi.mock('@/features/session/summary/WhatChangedCard', () => ({ WhatChangedCard: () => null }))
vi.mock('@/features/session/summary/SummaryDecisions', () => ({ SummaryDecisions: () => null }))
vi.mock('@/features/session/summary/WorkoutSummaryRecap', () => ({ WorkoutSummaryRecap: () => <div>Recap ready</div> }))
vi.mock('@/features/session/summary/AdHocSessionActions', () => ({ AdHocSessionActions: () => null }))
vi.mock('@/features/history/sharing/ShareWorkoutButton', () => ({ ShareWorkoutButton: () => null }))

vi.stubGlobal('__DEV__', true)
const { TodayScreen } = await import('../src/features/session/TodayScreen')
const { TemplateDetailScreen } = await import('../src/features/templates/TemplateDetailScreen')
const { ProgramScreen } = await import('../src/features/program/ProgramScreen')
const { TemplatesScreen } = await import('../src/features/templates/TemplatesScreen')
const { LiveSessionScreen } = await import('../src/features/session/LiveSessionScreen')
const { SessionSummaryScreen } = await import('../src/features/session/SessionSummaryScreen')
const { AuthScreen } = await import('../src/features/auth/AuthScreen')

const profile = { id: 'account-a', email: 'member@example.test', timezone: 'Asia/Singapore', units: 'kg' }
let client: QueryClient
beforeEach(() => {
  vi.resetAllMocks()
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  api.profile.mockResolvedValue(profile)
  api.today.mockResolvedValue({ activeProgram: null, activeSession: null, plannedSession: null, pendingDecisions: [] })
  api.templates.mockResolvedValue([])
  api.setup.mockResolvedValue({})
  api.program.mockResolvedValue({ activeProgram: null })
  api.activeProgram.mockResolvedValue(null)
  api.session.mockResolvedValue({ sessionId: 'session-a', status: 'in_progress', title: 'Workout', movements: [], units: 'kg' })
  api.summary.mockResolvedValue({
    session: { sessionId: 'session-a', status: 'completed', title: 'Workout', movements: [], units: 'kg' },
    decisions: [], decisionReceiptAvailable: true,
  })
  api.openBrowser.mockResolvedValue({ type: 'dismiss' })
})
afterEach(() => client.clear())
afterAll(() => vi.unstubAllGlobals())
const mount = (node: React.ReactNode) => render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)

describe('native load recovery wiring', () => {
  it.each([
    { name: 'Today', renderScreen: () => <TodayScreen />, recovered: 'No active program' },
    { name: 'programme setup', renderScreen: () => <TemplateDetailScreen templateId="template-a" />, recovered: 'Programme setup ready' },
  ])('retries a cold profile failure on $name before starting the dependent Today request', async ({ renderScreen, recovered }) => {
    let resolveProfile!: (value: typeof profile) => void
    api.profile.mockRejectedValueOnce(new Error('Profile unavailable'))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveProfile = resolve }))
    api.templates.mockResolvedValue([{ id: 'template-a', name: 'Test programme' }])
    mount(renderScreen())
    await screen.findByText('Profile unavailable')
    expect(api.today).not.toHaveBeenCalled()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Retry' })))
    await waitFor(() => expect(api.profile).toHaveBeenCalledTimes(2))
    expect(api.today).not.toHaveBeenCalled()
    await act(async () => resolveProfile(profile))
    await screen.findByText(recovered)
    expect(api.today).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ user: expect.objectContaining({ id: 'account-a' }) }), 'Asia/Singapore')
    if (recovered === 'Programme setup ready') {
      expect(api.templates).toHaveBeenCalledTimes(1)
      expect(api.setup).toHaveBeenCalledTimes(1)
    }
  })

  it.each([
    { name: 'Plan', renderScreen: () => <ProgramScreen />, read: api.program, recovered: 'No active program' },
    { name: 'Programs', renderScreen: () => <TemplatesScreen />, read: api.templates, recovered: 'No matching programs' },
    { name: 'Workout', renderScreen: () => <LiveSessionScreen sessionId="session-a" />, read: api.session, recovered: 'Workout ready' },
    { name: 'Recap', renderScreen: () => <SessionSummaryScreen sessionId="session-a" />, read: api.summary, recovered: 'Recap ready' },
  ])('recovers $name in place after a failed read', async ({ renderScreen, read, recovered }) => {
    read.mockRejectedValueOnce(new Error('Connection failed'))
    mount(renderScreen())
    await screen.findByText('Connection failed')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Retry' })))
    await screen.findByText(recovered)
    expect(read).toHaveBeenCalledTimes(2)
    expect(api.navigate).not.toHaveBeenCalled()
  })

  it('opens signed-out legal pages and recovers a browser failure without clearing the email draft', async () => {
    api.openBrowser.mockRejectedValueOnce(new Error('Browser unavailable'))
    mount(<AuthScreen />)
    fireEvent.change(screen.getByLabelText('auth-email'), { target: { value: 'member@example.test' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Open Terms in browser' })))
    await screen.findByText('Unable to open that page. Please try again.')
    expect((screen.getByLabelText('auth-email') as HTMLInputElement).value).toBe('member@example.test')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Open Terms in browser' })))
    expect(screen.queryByText('Unable to open that page. Please try again.')).toBeNull()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Open Privacy Policy in browser' })))
    expect(api.openBrowser.mock.calls.map(([url]) => url)).toEqual([
      'https://www.sheetless.fitness/terms', 'https://www.sheetless.fitness/terms', 'https://www.sheetless.fitness/privacy',
    ])
  })
})
