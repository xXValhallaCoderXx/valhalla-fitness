import type { ReactNode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { templateCatalog } from '@sheetless/domain/program/templates'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { NATIVE_FIND_MY_PLAN_QUESTIONS as FIND_MY_PLAN_QUESTIONS } from '../src/features/templates/find-my-plan/native-find-my-plan'

const mock = vi.hoisted(() => ({
  user: { id: 'account-a' }, focused: true, canGoBack: true,
  templates: vi.fn(), preview: vi.fn(), push: vi.fn(), dismissTo: vi.fn(), replace: vi.fn(), back: vi.fn(), prevent: vi.fn(),
}))
vi.mock('expo-router', () => ({
  router: { push: mock.push, dismissTo: mock.dismissTo, replace: mock.replace, back: mock.back, canGoBack: () => mock.canGoBack },
  useIsFocused: () => mock.focused,
}))
vi.mock('expo-router/react-navigation', () => ({ usePreventRemove: mock.prevent }))
vi.mock('@/lib/session-provider', () => ({ useSession: () => ({ user: mock.user }) }))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: unknown) => ({ user, supabase: {} }) }))
vi.mock('@sheetless/data/program/templates', () => ({ listTemplates: mock.templates, getProgramSetupOptions: mock.preview }))
vi.mock('@/components', () => {
  const Block = ({ children }: { children: ReactNode }) => <div>{children}</div>
  return {
    Caption: Block, Panel: Block, Text: Block,
    EmptyState: ({ title, children }: { title: string; children: ReactNode }) => <div>{title}{children}</div>,
    Button: ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => <button disabled={disabled} onClick={onPress}>{label}</button>,
  }
})
vi.mock('@/features/templates/catalogue/TemplatesLayout', () => ({
  TemplatesLayout: ({ children, footer, onBack }: { children: ReactNode; footer: ReactNode; onBack: () => void }) => <>
    <button onClick={onBack}>Header Back</button>{children}{footer}
  </>,
}))
vi.mock('@/features/templates/find-my-plan/FindMyPlanQuestions', () => ({
  FindMyPlanQuestions: ({ step, answers, onChoose }: {
    step: number; answers: object; onChoose: (value: string | number) => void
  }) => <>
    <h2>{FIND_MY_PLAN_QUESTIONS[step].title}</h2>
    <output data-testid="answers">{JSON.stringify(answers)}</output>
    {FIND_MY_PLAN_QUESTIONS[step].options.map(option => <button key={option.label} onClick={() => onChoose(option.value)}>{option.label}</button>)}
  </>,
}))
vi.mock('@/features/templates/find-my-plan/FindMyPlanResult', () => ({
  FindMyPlanResult: ({ answers, recommendation, alternatives, onSelectPlan, onReset, onTogglePreview, previewOpen, previewError, onRetryPreview, onOpenDetail, onEditAnswer, onBrowse }: {
    answers: object; recommendation: { template: { id: string } }; alternatives: Array<{ index: number }>;
    onSelectPlan: (index: number) => void; onReset: () => void; onTogglePreview: () => void;
    previewOpen: boolean; previewError: string; onRetryPreview: () => void; onOpenDetail: () => void; onEditAnswer: (step: number) => void; onBrowse: () => void
  }) => <>
    <output data-testid="answers">{JSON.stringify(answers)}</output>
    <output data-testid="recommendation">{recommendation?.template.id}</output>
    <button onClick={onReset}>Start over</button>
    <button onClick={onOpenDetail}>Plan details</button>
    {!recommendation ? <><button onClick={() => onEditAnswer(1)}>Change training days</button><button onClick={onBrowse}>Browse all plans</button></> : null}
    <button onClick={() => onSelectPlan(alternatives[0].index)}>Choose alternative</button>
    <button onClick={onTogglePreview}>Toggle preview</button>
    {previewOpen ? <span>Preview is open</span> : null}
    {previewError ? <><span>{previewError}</span><button onClick={onRetryPreview}>Retry preview</button></> : null}
  </>,
}))
const { FindMyPlanScreen } = await import('../src/features/templates/FindMyPlanScreen')
let client: QueryClient
beforeEach(() => {
  vi.clearAllMocks()
  mock.user = { id: 'account-a' }
  mock.focused = true
  mock.canGoBack = true
  mock.templates.mockResolvedValue(templateCatalog)
  mock.preview.mockResolvedValue({ previewWeeks: [] })
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
})
afterEach(() => client.clear())
const mount = () => render(<QueryClientProvider client={client}><FindMyPlanScreen /></QueryClientProvider>)
const chooseAnswers = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Some experience' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByRole('button', { name: '4 days' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByRole('button', { name: 'Get stronger' }))
  fireEvent.click(screen.getByRole('button', { name: 'See my match' }))
  await screen.findByRole('button', { name: 'Set up this plan' })
}

describe('full-screen programme finder', () => {
  it('requires an explicit Continue and supports skipping the unanswered questions', async () => {
    mount()
    const choose = await screen.findByRole('button', { name: 'Some experience' })
    expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(choose)
    expect(screen.getByRole('heading', { name: FIND_MY_PLAN_QUESTIONS[0].title })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip these questions' }))
    expect(mock.dismissTo).toHaveBeenCalledWith('/templates')
    expect(mock.prevent).toHaveBeenLastCalledWith(false, expect.any(Function))
  })

  it('starts setup directly with the exact recommended schedule and Finder provenance', async () => {
    mount()
    await chooseAnswers()
    fireEvent.click(screen.getByRole('button', { name: 'Choose alternative' }))
    const selected = screen.getByTestId('recommendation').textContent
    fireEvent.click(screen.getByRole('button', { name: 'Set up this plan' }))
    expect(mock.push).toHaveBeenCalledWith({ pathname: '/template/[templateId]/setup',
      params: { templateId: selected, source: 'finder', finderDays: '4' } })
  })

  it('keeps two days as two and does not recommend a longer schedule', async () => {
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Some experience' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: '2 days' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Get stronger' }))
    fireEvent.click(screen.getByRole('button', { name: 'See my match' }))
    expect(screen.getByTestId('recommendation').textContent).toBe('')
    expect(screen.queryByRole('button', { name: 'Set up this plan' })).toBeNull()
    expect(JSON.parse(screen.getByTestId('answers').textContent!).days).toBe(2)
    fireEvent.click(screen.getByRole('button', { name: 'Change training days' }))
    fireEvent.click(screen.getByRole('button', { name: '3 days' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'See my match' }))
    const template = templateCatalog.find(item => item.id === screen.getByTestId('recommendation').textContent)
    expect(template?.daysPerWeek).toBeLessThanOrEqual(3)
  })

  it('pushes the selected concrete detail and retains answers, selection and preview while blurred', async () => {
    const view = mount()
    await chooseAnswers()
    fireEvent.click(screen.getByRole('button', { name: 'Choose alternative' }))
    const selected = screen.getByTestId('recommendation').textContent
    fireEvent.click(screen.getByRole('button', { name: 'Toggle preview' }))
    fireEvent.click(screen.getByRole('button', { name: 'Plan details' }))
    expect(mock.push).toHaveBeenCalledWith({ pathname: '/template/[templateId]', params: { templateId: selected, source: 'finder', finderDays: '4' } })
    mock.focused = false
    view.rerender(<QueryClientProvider client={client}><FindMyPlanScreen /></QueryClientProvider>)
    expect(mock.prevent).toHaveBeenLastCalledWith(false, expect.any(Function))
    mock.focused = true
    view.rerender(<QueryClientProvider client={client}><FindMyPlanScreen /></QueryClientProvider>)
    expect(screen.getByTestId('recommendation').textContent).toBe(selected)
    expect(screen.getByText('Preview is open')).toBeTruthy()
    expect(JSON.parse(screen.getByTestId('answers').textContent!)).toEqual({ experience: 'Intermediate', days: 4, goal: 'strength' })
  })

  it('goes back through questions without removing answers, then leaves the route', async () => {
    mount()
    await chooseAnswers()
    for (const question of [...FIND_MY_PLAN_QUESTIONS].reverse()) {
      fireEvent.click(screen.getByRole('button', { name: 'Header Back' }))
      expect(screen.getByRole('heading', { name: question.title })).toBeTruthy()
    }
    expect(JSON.parse(screen.getByTestId('answers').textContent!)).toEqual({ experience: 'Intermediate', days: 4, goal: 'strength' })
    fireEvent.click(screen.getByRole('button', { name: 'Header Back' }))
    expect(mock.back).toHaveBeenCalledOnce()
  })

  it('retries a failed preview without losing the result or answers', async () => {
    mock.preview.mockRejectedValueOnce(new Error('Preview offline'))
    mount()
    await chooseAnswers()
    fireEvent.click(await screen.findByRole('button', { name: 'Retry preview' }))
    await waitFor(() => expect(screen.queryByText('Preview offline')).toBeNull())
    expect(mock.preview).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('recommendation').textContent).toBe('healthy-531-fsl')
    expect(JSON.parse(screen.getByTestId('answers').textContent!).days).toBe(4)
  })

  it('retains answers when a catalogue refresh fails and recovers', async () => {
    mount()
    await chooseAnswers()
    mock.templates.mockRejectedValueOnce(new Error('Catalogue offline'))
    await act(async () => { await client.invalidateQueries({ queryKey: accountQueryKeys.templates('account-a') }) })
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
    await screen.findByRole('button', { name: 'Set up this plan' })
    expect(JSON.parse(screen.getByTestId('answers').textContent!)).toEqual({ experience: 'Intermediate', days: 4, goal: 'strength' })
  })

  it('clears the transient draft on explicit restart and account changes', async () => {
    const view = mount()
    await chooseAnswers()
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }))
    expect(screen.getByTestId('answers').textContent).toBe('{}')
    await chooseAnswers()
    mock.user = { id: 'account-b' }
    view.rerender(<QueryClientProvider client={client}><FindMyPlanScreen /></QueryClientProvider>)
    await screen.findByRole('button', { name: 'Some experience' })
    expect(screen.getByTestId('answers').textContent).toBe('{}')
    expect(screen.queryByRole('button', { name: 'Set up this plan' })).toBeNull()
  })

  it('takes a cold deep link back to Plan when there is no previous route', async () => {
    mock.canGoBack = false
    mount()
    await screen.findByRole('button', { name: 'Some experience' })
    fireEvent.click(screen.getByRole('button', { name: 'Header Back' }))
    expect(mock.replace).toHaveBeenCalledWith('/(tabs)/program')
  })
})
