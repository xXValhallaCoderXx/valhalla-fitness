import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { defaultReturnSettings } from '@sheetless/domain/program/return-settings'
import { themeProviderMock } from './support/theme'
import { returnGuideState } from './support/return-guide'

const api = vi.hoisted(() => ({ get: vi.fn(), change: vi.fn(), close: vi.fn(), userId: 'account' }))
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('lucide-react-native', () => ({ ChevronRight: () => null }))
vi.mock('@/lib/session-provider', () => ({ useSession: () => ({ user: { id: api.userId } }) }))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }), useMe: () => ({ data: { timezone: 'Asia/Singapore' } }) }))
vi.mock('expo-router', () => ({ router: { navigate: vi.fn() } }))
vi.mock('@sheetless/data/program/return-guide', async importOriginal => ({ ...await importOriginal<object>(), getReturnGuide: api.get, changeProgramReturn: api.change }))
vi.mock('@/components', async () => {
  const { Button } = await import('../src/components/Button')
  const { TextInput } = await import('../src/components/TextInput')
  const Block = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return { Button, TextInput, Text: Block, Caption: Block, Panel: Block, Badge: Block, SectionLabel: Block,
    SheetModal: ({ title, children, footer }: { title: string; children?: ReactNode; footer?: ReactNode }) => <div><h1>{title}</h1>{children}{footer}</div> }
})
import { ReturnGuideSheet } from '../src/features/program/return/ReturnGuideSheet'

let client: QueryClient
beforeEach(() => { client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); vi.resetAllMocks(); api.userId = 'account' })
afterEach(() => client.clear())
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (value: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function open() {
  return render(<QueryClientProvider client={client}><ReturnGuideSheet open program={returnGuideState().program} onClose={api.close} /></QueryClientProvider>)
}
async function fineTune() {
  fireEvent.click(await screen.findByRole('button', { name: 'See your first two stages' }))
  fireEvent.click(screen.getByRole('button', { name: 'Fine-tune loads, sets and stages' }))
}

it('gates cached programme data on a fresh read and offers Retry after a failed read', async () => {
  const read = deferred<ReturnType<typeof returnGuideState>>()
  client.setQueryData([...accountQueryKeys.program('account'), 'return'], returnGuideState())
  api.get.mockReturnValueOnce(read.promise).mockResolvedValue(returnGuideState())
  open()
  expect(screen.queryByRole('button', { name: 'See your first two stages' })).toBeNull()
  await act(async () => read.reject(new Error('Read failed')))
  await screen.findByText('Read failed')
  expect(screen.queryByRole('button', { name: 'See your first two stages' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await screen.findByRole('button', { name: 'See your first two stages' })
  expect(api.change).not.toHaveBeenCalled()
})

it('keeps raw edits through Back, failed submission and background reads; exact retry reuses its request', async () => {
  api.get.mockResolvedValue(returnGuideState())
  api.change.mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce({})
  open()
  await fineTune()
  const load = screen.getByRole('textbox', { name: 'Squat · was 100' })
  fireEvent.change(load, { target: { value: '72.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  await fineTune()
  expect((screen.getByRole('textbox', { name: 'Squat · was 100' }) as HTMLInputElement).value).toBe('72.')
  fireEvent.click(screen.getByRole('button', { name: 'Use these' }))
  fireEvent.click(screen.getByRole('button', { name: 'Start my return' }))
  await screen.findByText('Response lost')
  const first = api.change.mock.calls[0][1]
  expect(first.changes[0].after).toBe(72)
  api.get.mockRejectedValueOnce(new Error('Background read failed'))
  await act(async () => client.invalidateQueries({ queryKey: [...accountQueryKeys.program('account'), 'return'] }))
  expect(screen.queryByText('Background read failed')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Fine-tune loads, sets and stages' }))
  expect((screen.getByRole('textbox', { name: 'Squat · was 100' }) as HTMLInputElement).value).toBe('72.')
  fireEvent.click(screen.getByRole('button', { name: 'Use these' }))
  fireEvent.click(screen.getByRole('button', { name: 'Start my return' }))
  await waitFor(() => expect(api.close).toHaveBeenCalledOnce())
  expect(api.change.mock.calls[1][1].requestId).toBe(first.requestId)
})

it('changing a failed intent gets a new request and canceling an initial preview writes nothing', async () => {
  api.get.mockResolvedValue(returnGuideState())
  api.change.mockRejectedValue(new Error('Not saved'))
  const mounted = open()
  fireEvent.click(await screen.findByRole('button', { name: 'Not now' }))
  expect(api.change).not.toHaveBeenCalled()
  mounted.unmount()
  open()
  await fineTune()
  fireEvent.click(screen.getByRole('button', { name: 'Use these' }))
  fireEvent.click(screen.getByRole('button', { name: 'Start my return' }))
  await screen.findByText('Not saved')
  const first = api.change.mock.calls[0][1]
  fireEvent.click(screen.getByRole('button', { name: 'Fine-tune loads, sets and stages' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Squat · was 100' }), { target: { value: '75' } })
  fireEvent.click(screen.getByRole('button', { name: 'Use these' }))
  fireEvent.click(screen.getByRole('button', { name: 'Start my return' }))
  await waitFor(() => expect(api.change).toHaveBeenCalledTimes(2))
  expect(api.change.mock.calls[1][1].requestId).not.toBe(first.requestId)
  expect(api.change.mock.calls[1][1].changes[0].after).toBe(75)
})

it.each(['active workout', 'pending review'] as const)('blocks an active guide change with %s', async condition => {
  const state = returnGuideState()
  state.program.returnPeriod = { id: 'period', policyVersion: 1, status: 'active', startedAt: '2026-09-01', completedWorkouts: 0, settings: defaultReturnSettings(1, 2.5) }
  if (condition === 'active workout') state.hasActiveSession = true
  else state.pendingDecisionIds = ['fafa2933-12fc-44ed-8280-cff425ee7e32']
  api.get.mockResolvedValue(state)
  open()
  const save = await screen.findByRole('button', { name: 'Save guide changes' })
  expect(save.getAttribute('aria-disabled')).toBe('true')
  expect(screen.getByRole('button', { name: 'End return guide' }).getAttribute('aria-disabled')).toBe('true')
  fireEvent.click(save)
  expect(api.change).not.toHaveBeenCalled()
})

it('ends the guide at saved current settings and never submits unsaved weight edits', async () => {
  const state = returnGuideState()
  state.program.stateValues[0].value = 82.5
  state.program.returnPeriod = { id: 'period', policyVersion: 1, status: 'review', startedAt: '2026-09-01', completedWorkouts: 2, settings: defaultReturnSettings(1, 2.5) }
  api.get.mockResolvedValue(state)
  api.change.mockResolvedValue({})
  open()
  fireEvent.click(await screen.findByRole('button', { name: 'Fine-tune loads, sets and stages' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Squat · was 82.5' }), { target: { value: '75' } })
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  fireEvent.click(screen.getByRole('button', { name: 'Normal sets at current weights' }))
  await waitFor(() => expect(api.close).toHaveBeenCalledOnce())
  expect(api.change.mock.calls[0][1]).toMatchObject({ action: 'end', changes: [], settings: state.program.returnPeriod.settings })
})

it('names pending recommendations before explicitly superseding them with a new return', async () => {
  const state = returnGuideState()
  state.pendingDecisionIds = ['fafa2933-12fc-44ed-8280-cff425ee7e32']
  api.get.mockResolvedValue(state)
  api.change.mockResolvedValue({})
  open()
  fireEvent.click(await screen.findByRole('button', { name: 'See your first two stages' }))
  expect(screen.getByText(/1 pending progression recommendations will be superseded/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Start my return' }))
  await waitFor(() => expect(api.close).toHaveBeenCalledOnce())
  expect(api.change.mock.calls[0][1]).toMatchObject({ action: 'apply', pendingDecisionIds: state.pendingDecisionIds })
})

it('only discards an edited preview after an explicit authoritative reload', async () => {
  api.get.mockResolvedValue(returnGuideState())
  api.change.mockRejectedValue(new Error('Programme changed'))
  open()
  await fineTune()
  fireEvent.change(screen.getByRole('textbox', { name: 'Squat · was 100' }), { target: { value: '72.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Use these' }))
  fireEvent.click(screen.getByRole('button', { name: 'Start my return' }))
  await screen.findByText('Programme changed')
  const fresh = returnGuideState()
  fresh.program.stateVersion = 4
  fresh.program.stateValues[0].value = 110
  api.get.mockResolvedValue(fresh)
  fireEvent.click(screen.getByRole('button', { name: 'Reload programme and reset preview' }))
  await fineTune()
  expect((screen.getByRole('textbox', { name: 'Squat · was 110' }) as HTMLInputElement).value).toBe('87.5')
  expect(screen.queryByText('Programme changed')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Use these' }))
  fireEvent.click(screen.getByRole('button', { name: 'Start my return' }))
  await waitFor(() => expect(api.change).toHaveBeenCalledTimes(2))
  expect(api.change.mock.calls[1][1].expectedVersion).toBe(4)
})

it('does not close the new account’s guide or refresh its cache after an old account’s save resolves', async () => {
  const saved = deferred<object>()
  api.get.mockResolvedValue(returnGuideState())
  api.change.mockReturnValue(saved.promise)
  const rendered = open()
  fireEvent.click(await screen.findByRole('button', { name: 'See your first two stages' }))
  fireEvent.click(screen.getByRole('button', { name: 'Start my return' }))
  await waitFor(() => expect(api.change).toHaveBeenCalledOnce())
  expect(api.change.mock.calls[0][0].user.id).toBe('account')
  api.userId = 'other-account'
  rendered.rerender(<QueryClientProvider client={client}><ReturnGuideSheet open program={returnGuideState().program} onClose={api.close} /></QueryClientProvider>)
  await screen.findByRole('button', { name: 'See your first two stages' })
  const readCount = api.get.mock.calls.length
  await act(async () => saved.resolve({}))
  expect(api.close).not.toHaveBeenCalled()
  expect(api.get).toHaveBeenCalledTimes(readCount)
  expect(screen.getByRole('button', { name: 'See your first two stages' })).toBeTruthy()
})

it('keeps exact fixed loads and workout prescriptions collapsed while retaining raw edits across collapse', async () => {
  const state = returnGuideState()
  for (const week of state.program.templateDefinition!.weeks) week.prescriptions.work.sets.push({ targetLoad: { kind: 'fixed', kg: 70 }, targetReps: 5 })
  api.get.mockResolvedValue(state)
  open()
  await fineTune()
  expect(screen.getByRole('textbox', { name: 'Stage 1 · workouts' })).toBeTruthy()
  expect(screen.queryByRole('textbox', { name: /Day · base · Squat · set 6/ })).toBeNull()
  expect(screen.queryByText('Upcoming workouts')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Other prescribed loads (2)' }))
  fireEvent.change(screen.getByRole('textbox', { name: /Day · base · Squat · set 6/ }), { target: { value: '55.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Hide other prescribed loads (2)' }))
  expect(screen.queryByRole('textbox', { name: /Day · base · Squat · set 6/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Other prescribed loads (2)' }))
  expect((screen.getByRole('textbox', { name: /Day · base · Squat · set 6/ }) as HTMLInputElement).value).toBe('55.')
  fireEvent.change(screen.getByRole('textbox', { name: /Day · base · Squat · set 6/ }), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  fireEvent.click(screen.getByRole('button', { name: 'Fine-tune loads, sets and stages' }))
  expect((screen.getByRole('textbox', { name: /Day · base · Squat · set 6/ }) as HTMLInputElement).value).toBe('')
  expect(screen.getByRole('button', { name: 'Use these' }).getAttribute('aria-disabled')).toBe('true')
})
