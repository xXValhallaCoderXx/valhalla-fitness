import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { WorkoutSession } from '@sheetless/domain/session/types'
import type { ProgressionDecision } from '@sheetless/domain/program/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { themeProviderMock } from './support/theme'
import { svgMock } from './support/svg'

vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('lucide-react-native', () => ({ Check: () => null, Minus: () => null, TrendingUp: () => null, X: () => null }))
vi.mock('react-native-svg', () => svgMock())
vi.mock('expo-router', () => ({ usePathname: () => '/test' }))
vi.mock('@/components/SheetModal', () => ({ SheetModal: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div> }))
vi.mock('@/components/Screen', () => ({ Screen: () => null }))
vi.mock('@/components/SettingsHeaderAction', () => ({ SettingsHeaderAction: () => null }))
const api = vi.hoisted(() => ({ send: vi.fn(), profile: vi.fn(), optOut: vi.fn(), get: vi.fn(), set: vi.fn() }))
vi.mock('@sheetless/data/feedback/feedback', () => ({ submitFeedback: api.send }))
vi.mock('@sheetless/data/account/profile', () => ({ getMe: api.profile, dismissPostWorkoutFeedback: api.optOut }))
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: api.get, setItem: api.set } }))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }) }))
vi.mock('@/features/program/useProgressionReview', () => ({ useProgressionReview: ({ onResolved }: {
  onResolved: (id: string, action: 'accepted' | 'dismissed') => void
}) => ({
  isSaving: false, isApplyingAll: false, errorMessage: null,
  resolve: ({ decisionId, action }: { decisionId: string; action: 'accepted' | 'dismissed' }) => onResolved(decisionId, action),
  applyAll: (ids: string[]) => ids.forEach((id) => onResolved(id, 'accepted')),
}) }))
const { SummaryDecisions } = await import('../src/features/session/summary/SummaryDecisions')
const { BetaFeedback } = await import('../src/features/feedback/BetaFeedback')
const { PostWorkoutFeedback } = await import('../src/features/feedback/PostWorkoutFeedback')
const { DecisionFeedback } = await import('../src/features/feedback/DecisionFeedback')

let user: User
let session: WorkoutSession
beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset())
  user = { id: crypto.randomUUID() } as User
  session = { sessionId: crypto.randomUUID(), templateId: 'test', programTitle: 'Plan', weekIndex: 0 } as WorkoutSession
  api.profile.mockResolvedValue({ id: user.id, postWorkoutFeedbackDismissed: false })
  api.get.mockResolvedValue(null)
  api.set.mockResolvedValue(undefined)
  api.send.mockResolvedValue({ ok: true })
})
const wrap = (node: React.ReactNode) => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider>
const prompt = () => <PostWorkoutFeedback key={user.id} user={user} session={session} decisions={[]} />

describe('feedback forms', () => {
  it('keeps the global category and draft on failure, then acknowledges only successful submission', async () => {
    api.send.mockRejectedValueOnce(new Error('Network failed')).mockResolvedValueOnce({ ok: true })
    render(<BetaFeedback user={user} />)
    fireEvent.click(screen.getByRole('button', { name: 'Beta feedback' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Bug' }))
    fireEvent.change(screen.getByLabelText('Feedback message'), { target: { value: 'Keep this draft' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }))
    await screen.findByText('Network failed')
    expect((screen.getByLabelText('Feedback message') as HTMLInputElement).value).toBe('Keep this draft')
    expect(screen.queryByText(/Thanks/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }))
    await screen.findByText('Thanks — this helps improve the beta.')
    expect(api.send).toHaveBeenCalledTimes(2)
  })

  it('waits for preferences and requires a reason for No, while Yes sends immediately', async () => {
    let resolve!: (value: unknown) => void
    api.profile.mockReturnValue(new Promise((yes) => { resolve = yes }))
    render(wrap(prompt()))
    expect(screen.queryByText('Beta check-in')).toBeNull()
    await act(async () => { resolve({ id: user.id, postWorkoutFeedbackDismissed: false }) })
    fireEvent.click(await screen.findByRole('tab', { name: 'No' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }))
    expect(api.send).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('tab', { name: 'Yes' }))
    await screen.findByText('Thanks — noted. This helps improve the beta.')
    expect(api.send).toHaveBeenCalledTimes(1)
    expect(api.send.mock.calls[0][1]).toMatchObject({ source: 'post_workout', answer: 'yes', category: null })
  })

  it('preserves No/Not sure drafts through failure', async () => {
    api.send.mockRejectedValueOnce(new Error('Try again')).mockResolvedValueOnce({ ok: true })
    render(wrap(prompt()))
    fireEvent.click(await screen.findByRole('tab', { name: 'Not sure' }))
    fireEvent.click(screen.getByRole('tab', { name: 'The explanation was unclear' }))
    fireEvent.change(screen.getByLabelText('Feedback message'), { target: { value: 'Why this load?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }))
    await screen.findByText('Try again')
    expect((screen.getByLabelText('Feedback message') as HTMLInputElement).value).toBe('Why this load?')
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }))
    await screen.findByText('Thanks — noted. This helps improve the beta.')
    expect(api.send.mock.calls[1][1]).toMatchObject({ answer: 'not_sure', category: 'explanation_unclear', message: 'Why this load?' })
  })

  it('keeps success handled if local storage fails, including on remount', async () => {
    api.set.mockRejectedValue(new Error('Storage full'))
    const first = render(wrap(prompt()))
    fireEvent.click(await screen.findByRole('tab', { name: 'Yes' }))
    await screen.findByText('Thanks — noted. This helps improve the beta.')
    first.unmount()
    render(wrap(prompt()))
    await waitFor(() => expect(api.profile).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('Beta check-in')).toBeNull()
    expect(api.send).toHaveBeenCalledTimes(1)
  })

  it('persists dismissal without sending and keeps opt-out failures actionable', async () => {
    api.optOut.mockRejectedValue(new Error('Could not save preference'))
    const first = render(wrap(prompt()))
    fireEvent.click(await screen.findByRole('button', { name: "Don't ask again" }))
    await screen.findByText('Could not save preference')
    expect(screen.getByText('Beta check-in')).toBeTruthy()
    expect(api.set).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    await waitFor(() => expect(api.set).toHaveBeenCalledOnce())
    expect(api.set.mock.calls[0][0]).toContain(user.id)
    first.unmount()
    render(wrap(prompt()))
    await waitFor(() => expect(api.profile).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('Beta check-in')).toBeNull()
    expect(api.send).not.toHaveBeenCalled()
  })

  it('ignores an old account preference callback', async () => {
    let resolve!: (value: unknown) => void
    api.profile.mockReturnValueOnce(new Promise((yes) => { resolve = yes }))
    const view = render(wrap(prompt()))
    user = { id: crypto.randomUUID() } as User
    api.profile.mockResolvedValue({ id: user.id, postWorkoutFeedbackDismissed: true })
    view.rerender(wrap(prompt()))
    await act(async () => { resolve({ id: 'old-user', postWorkoutFeedbackDismissed: false }) })
    expect(screen.queryByText('Beta check-in')).toBeNull()
  })

  it('uses the effective resolved decision after a form has already opened', async () => {
    const decision = { id: crypto.randomUUID(), movementId: 'squat', movementName: 'Squat', ruleId: 'linear', scope: 'session',
      status: 'pending', inputSummary: 'Done', recommendation: 'Add load', previousValue: 80, recommendedValue: 82.5 } as ProgressionDecision
    const view = render(<DecisionFeedback user={user} decision={decision} />)
    fireEvent.click(screen.getByRole('button', { name: /Report an issue/ }))
    fireEvent.click(screen.getByRole('tab', { name: 'Weight should stay the same' }))
    view.rerender(<DecisionFeedback user={user} decision={{ ...decision, status: 'accepted' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }))
    await screen.findByText('Feedback sent')
    expect(api.send.mock.calls[0][1]).toMatchObject({ decisionId: decision.id, metadata: { decisionStatus: 'accepted', previousValue: 80, recommendedValue: 82.5 } })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})


it.each([['Apply', 'accepted'], ['Keep', 'dismissed'], ['Apply all 1', 'accepted']] as const)(
  'keeps feedback accessible after %s and submits its resolved status', async (action, status) => {
    const decision = { id: crypto.randomUUID(), movementId: 'squat', movementName: 'Squat', ruleId: 'linear', scope: 'session',
      status: 'pending', inputSummary: 'Done', recommendation: 'Add load', previousValue: 80, recommendedValue: 82.5 } as ProgressionDecision
    function Review() {
      const [value, setValue] = useState(decision)
      return <SummaryDecisions user={user} decisions={[value]} units="kg"
        onResolved={(_id, next) => setValue((current) => ({ ...current, status: next }))} />
    }
    render(<Review />)
    fireEvent.click(screen.getByRole('button', { name: action }))
    fireEvent.click(screen.getByRole('button', { name: /Report an issue/ }))
    fireEvent.click(screen.getByRole('tab', { name: 'Weight should stay the same' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }))
    await screen.findByText('Feedback sent')
    expect(api.send.mock.calls[0][1]).toMatchObject({ metadata: { decisionStatus: status } })
  },
)

it('hides the optional prompt for stored dismissal and successfully saved server opt-out', async () => {
  api.get.mockResolvedValueOnce('handled')
  const first = render(wrap(prompt()))
  await waitFor(() => expect(api.get).toHaveBeenCalledOnce())
  expect(screen.queryByText('Beta check-in')).toBeNull()
  first.unmount()
  session = { ...session, sessionId: crypto.randomUUID() }
  api.optOut.mockResolvedValue({ id: user.id, postWorkoutFeedbackDismissed: true })
  render(wrap(prompt()))
  fireEvent.click(await screen.findByRole('button', { name: "Don't ask again" }))
  await waitFor(() => expect(screen.queryByText('Beta check-in')).toBeNull())
  expect(api.send).not.toHaveBeenCalled()
  expect(api.optOut).toHaveBeenCalledOnce()
})
