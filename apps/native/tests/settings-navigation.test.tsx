import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { UserProfile } from '@sheetless/domain/account/types'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { themeProviderMock } from './support/theme'
import { svgMock } from './support/svg'

const api = vi.hoisted(() => ({ read: vi.fn(), update: vi.fn(), restore: vi.fn(), setPreview: vi.fn(), user: { id: 'account-a' } }))
const nav = vi.hoisted(() => ({
  dispatch: vi.fn(), enabled: false,
  handler: (_event: { data: { action: { type: string } } }) => {},
}))
vi.mock('@sheetless/data/account/profile', () => ({ getMe: api.read, updateSettings: api.update, restoreFullModeHint: api.restore }))
vi.mock('@sheetless/data/account/bodyweight', () => ({
  getBodyweightEntries: async () => [], logBodyweight: vi.fn(), deleteBodyweightEntry: vi.fn(),
}))
vi.mock('@/lib/session-provider', () => ({ useSession: () => ({ user: api.user }) }))
vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({}) }))
vi.mock('@/lib/theme-provider', () => ({
  useSheetlessTheme: () => ({ ...themeProviderMock().useSheetlessTheme(), setPreviewPreference: api.setPreview }),
}))
vi.mock('react-native-svg', () => svgMock())
vi.mock('lucide-react-native', () => Object.fromEntries(
  ['ArrowRight', 'BookOpen', 'ChevronRight', 'Database', 'Dumbbell', 'Palette', 'Scale', 'SlidersHorizontal', 'Timer', 'UserRound', 'Settings', 'X']
    .map((name) => [name, () => null]),
))
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }))
vi.mock('expo-router', () => ({
  useNavigation: () => ({ dispatch: nav.dispatch }), useLocalSearchParams: () => ({}), router: { navigate: vi.fn() },
}))
vi.mock('expo-router/react-navigation', () => ({
  usePreventRemove: (enabled: boolean, handler: typeof nav.handler) => { nav.enabled = enabled; nav.handler = handler },
}))
vi.mock('expo-web-browser', () => ({ openBrowserAsync: vi.fn() }))
vi.mock('@/features/settings/account/account-export', () => ({ shareAccountExport: vi.fn() }))
vi.mock('@/features/feedback/BetaFeedback', () => ({ BetaFeedback: () => null }))
// Exercise navigation/draft behavior, not native modal layout.
vi.mock('@/components', async (importOriginal) => ({
  ...await importOriginal<Record<string, unknown>>(), ConfirmDialog: () => null, SheetModal: () => null,
}))
vi.mock('@/features/settings/SettingsDialogs', () => ({
  SettingsDialogs: ({ leaveOpen, onConfirmLeave }: { leaveOpen: boolean; onConfirmLeave: () => void }) =>
    leaveOpen ? <button onClick={onConfirmLeave}>Confirm discard and leave</button> : null,
}))

const { SettingsScreen } = await import('../src/features/settings/SettingsScreen')
let client: QueryClient
let saved: UserProfile
beforeEach(() => {
  vi.clearAllMocks()
  api.user = { id: 'account-a' }
  saved = {
    id: 'account-a', email: 'member@example.test', units: 'kg', rounding: 2.5,
    equipmentProfile: ['barbell'], themePreference: 'system', timezone: 'Asia/Singapore',
    programStateDefaults: { squat_one_rep_max: 140 }, onboardingCompleted: true,
    liveOnboardingDismissed: true, postWorkoutFeedbackDismissed: false, sex: null,
    autoStartTimer: true, defaultRestSeconds: 120, experienceMode: 'guided', showFormulas: false,
    fullModeHintDismissedAt: null,
  }
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })
  client.setQueryData(accountQueryKeys.profile(saved.id), saved)
  api.read.mockResolvedValue(saved)
})
afterEach(() => client.clear())
const mount = () => render(<QueryClientProvider client={client}><SettingsScreen /></QueryClientProvider>)
const categoryIds: Record<string, string> = {
  'Appearance & units': 'appearance', 'Experience': 'experience', 'Body & strength': 'body', 'Workout preferences': 'workout',
}
const open = (name: string) => fireEvent.click(screen.getByTestId(
  name === 'All settings' ? 'settings-all-categories' : `settings-category-${categoryIds[name]}`,
))

it('keeps a dirty appearance draft across the menu and an immediate Experience save, then guards leaving', async () => {
  mount()
  expect(screen.queryByTestId('settings-save')).toBeNull()
  open('Appearance & units')
  fireEvent.click(screen.getByTestId('settings-choice-dark'))
  expect(screen.getByText('Unsaved changes')).toBeTruthy()
  open('All settings')
  open('Experience')
  api.update.mockResolvedValueOnce({ ...saved, experienceMode: 'full' })
  const full = within(screen.getByLabelText('Reading mode')).getByRole('radio', { name: 'Full' })
  fireEvent.click(full)
  await waitFor(() => expect(full.getAttribute('aria-checked')).toBe('true'))
  expect(api.update.mock.calls[0][1].themePreference).toBe('system')
  open('All settings')
  open('Appearance & units')
  expect(screen.getByText('Using the dark appearance.')).toBeTruthy()
  // Native back from a category goes to the menu without throwing the draft away.
  act(() => nav.handler({ data: { action: { type: 'GO_BACK' } } }))
  expect(screen.getByTestId('settings-category-experience').getAttribute('aria-label')).toBe('Experience. Full')
  expect(screen.getByText('Unsaved changes')).toBeTruthy()
  expect(nav.enabled).toBe(true)
  act(() => nav.handler({ data: { action: { type: 'GO_BACK' } } }))
  fireEvent.click(screen.getByText('Confirm discard and leave'))
  await waitFor(() => expect(nav.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' }))
})

it('preserves an unsubmitted bodyweight entry while visiting another category', () => {
  mount()
  open('Body & strength')
  const input = screen.getByTestId('settings-bodyweight-input')
  fireEvent.change(input, { target: { value: '71.5' } })
  open('All settings')
  open('Workout preferences')
  open('All settings')
  open('Body & strength')
  expect((screen.getByTestId('settings-bodyweight-input') as HTMLInputElement).value).toBe('71.5')
})

it('does not restore a departed account or clear the next account theme preview when its deferred save finishes', async () => {
  let finish!: (profile: UserProfile) => void
  api.update.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
  const mounted = mount()
  open('Appearance & units')
  fireEvent.click(screen.getByTestId('settings-choice-dark'))
  fireEvent.click(screen.getByTestId('settings-save'))
  await waitFor(() => expect(api.update).toHaveBeenCalledOnce())

  const second = { ...saved, id: 'account-b', themePreference: 'light' as const }
  api.read.mockResolvedValue(second)
  act(() => {
    client.removeQueries({ queryKey: accountQueryKeys.profile(saved.id) })
    client.setQueryData(accountQueryKeys.profile(second.id), second)
    api.user = { id: second.id }
    mounted.rerender(<QueryClientProvider client={client}><SettingsScreen /></QueryClientProvider>)
  })
  open('Appearance & units')
  fireEvent.click(screen.getByTestId('settings-choice-dark'))
  api.setPreview.mockClear()
  const invalidate = vi.spyOn(client, 'invalidateQueries')

  await act(async () => finish({ ...saved, themePreference: 'dark' }))
  await waitFor(() => expect(client.isMutating()).toBe(0))
  expect(client.getQueryData(accountQueryKeys.profile(saved.id))).toBeUndefined()
  expect(client.getQueryData(accountQueryKeys.profile(second.id))).toEqual(second)
  expect(api.setPreview).not.toHaveBeenCalled()
  expect(invalidate).not.toHaveBeenCalled()
  expect(screen.getByText('Unsaved changes')).toBeTruthy()
})
