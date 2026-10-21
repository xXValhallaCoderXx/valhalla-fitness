import type { PropsWithChildren } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '@sheetless/domain/account/types'
import type { ProgramSetupOptions } from '@sheetless/domain/program/types'
import type { ProgramStartReceipt, ProgramStartReview } from '@sheetless/domain/program/reviewed-start'
import { createNativeSetupDraft, type NativeProgramSetupDraft } from '@sheetless/domain/program/native-setup-draft'
import { buildProgramSetupSuggestions } from '@sheetless/domain/program/setup-suggestions'
import { programSetupDraftKey, programSetupReceiptKey, useProgramSetupDraft } from '../src/features/templates/setup-draft'
import { useReviewedProgramStart } from '../src/features/templates/start/useReviewedProgramStart'

const api = vi.hoisted(() => ({ review: vi.fn(), start: vi.fn(), focused: true }))
vi.mock('@sheetless/data/program/reviewed-start', () => ({ reviewProgramStart: api.review, startReviewedProgram: api.start }))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }) }))
vi.mock('expo-router', () => ({ useIsFocused: () => api.focused }))

const user = { id: 'setup-account' } as User
const profile = { timezone: 'Asia/Singapore' } as UserProfile
const setup: ProgramSetupOptions = { templateId: 'plan-a', templateName: 'Plan A', origin: 'system_default',
  sessions: [], freeWeightPolicy: null, accessoryCatalog: [], previewWeeks: [] }
const snapshot = buildProgramSetupSuggestions({ templateId: setup.templateId, units: 'kg', rounding: 2.5,
  requiredState: [{ key: 'bench_working', movementId: 'bench_press', type: 'working_load' }],
  defaults: { bench_press_one_rep_max: 100 }, sessions: [] })
const makeDraft = (): NativeProgramSetupDraft => ({ ...createNativeSetupDraft(user.id, 'draft-a', snapshot), step: 'review' })
const review: ProgramStartReview = { activeProgram: null, activeSessionId: null, pendingDecisionIds: [], canStart: true,
  firstWorkout: { id: 'first-day', title: 'Day A', programTitle: 'Plan A', templateId: 'plan-a', weekIndex: 0,
    weekLabel: 'Week 1', hardness: 'Medium', scheduledDate: '2026-09-27', estimatedMinutes: 45, units: 'kg', rounding: 2.5, movements: [] },
  setupOptions: setup, intent: { version: 1, templateId: 'plan-a', templateVersionId: 'version-a', definitionChecksum: 'a'.repeat(32),
    title: 'Plan A', startDate: '2026-09-27', units: 'kg', rounding: 2.5, currentBlockId: null,
    stateValues: [{ key: 'bench_working', movementId: 'bench_press', type: 'working_load', value: 75, unit: 'kg' }],
    movementOverrides: [], accessoryAdditions: [], equipmentMode: 'standard', freeWeightChoices: [],
    freeWeightPolicyVersionId: null, freeWeightPolicyChecksum: null, expectedActiveProgram: null } }
const receipt: ProgramStartReceipt = { requestId: 'request-a', programId: 'created-plan', templateId: 'plan-a',
  templateVersionId: 'version-a', startedAt: '2026-09-27T10:00:00Z' }

const clients: QueryClient[] = []
function harness(initial = makeDraft()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  clients.push(client)
  client.setQueryData(programSetupDraftKey(user.id, initial.draftId), initial)
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const mount = (account = user) => renderHook(() => {
    const current = useProgramSetupDraft(account.id, initial.draftId)
    return useReviewedProgramStart({ user: account, profile, setup,
      draft: current.draft ?? { ...initial, accountId: account.id, step: 'schedule' }, update: current.update, reviewNeeded: false })
  }, { wrapper })
  return { client, mount }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}
const appStateListeners = new Set<(state: AppStateStatus) => void>()
function appState(state: AppStateStatus) { act(() => appStateListeners.forEach(listener => listener(state))) }
beforeEach(() => {
  vi.resetAllMocks()
  appStateListeners.clear()
  vi.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    appStateListeners.add(listener)
    return { remove: () => { appStateListeners.delete(listener) } }
  })
  api.focused = true
  api.review.mockResolvedValue(review)
  api.start.mockResolvedValue(receipt)
})
afterEach(() => { clients.splice(0).forEach(client => client.clear()); vi.restoreAllMocks() })

describe('reviewed native programme start', () => {
  it('refreshes the focused Review after returning to the app and removes the listener on unmount', async () => {
    const { mount } = harness()
    const { result, unmount } = mount()
    await waitFor(() => expect(result.current.ready).toBe(true))
    appState('active')
    expect(api.review).toHaveBeenCalledOnce()
    api.review.mockResolvedValue({ ...review, canStart: false, activeSessionId: 'new-workout' })
    appState('inactive')
    expect(api.review).toHaveBeenCalledOnce()
    appState('active')
    await waitFor(() => expect(result.current.review?.activeSessionId).toBe('new-workout'))
    expect(api.review).toHaveBeenCalledTimes(2)
    expect(result.current.ready).toBe(false)
    expect(api.start).not.toHaveBeenCalled()
    unmount()
    expect(appStateListeners.size).toBe(0)
  })

  it.each(['blurred', 'numbers'] as const)('does not read Review on foreground when the setup is %s', async (reason) => {
    api.focused = reason !== 'blurred'
    const { mount } = harness({ ...makeDraft(), step: reason === 'numbers' ? 'numbers' : 'review' })
    mount()
    appState('background')
    appState('active')
    expect(api.review).not.toHaveBeenCalled()
    expect(api.start).not.toHaveBeenCalled()
  })

  it('keeps an uncertain submitted intent frozen across foreground and retries its exact request', async () => {
    api.start.mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce(receipt)
    const { mount } = harness()
    const { result } = mount()
    await waitFor(() => expect(result.current.ready).toBe(true))
    act(() => result.current.requestStart())
    await waitFor(() => expect(result.current.error).toBe('Response lost'))
    const submitted = api.start.mock.calls[0][1]
    appState('background')
    appState('active')
    expect(api.review).toHaveBeenCalledOnce()
    expect(result.current.frozen).toBe(true)
    expect(result.current.review?.intent).toEqual(submitted.intent)
    act(() => result.current.requestStart())
    await waitFor(() => expect(api.start).toHaveBeenCalledTimes(2))
    expect(api.start.mock.calls[1][1]).toEqual(submitted)
  })

  it('only reads at Review and never starts automatically or while resolution is required', async () => {
    const { client, mount } = harness({ ...makeDraft(), step: 'numbers' })
    const { result } = mount()
    expect(api.review).not.toHaveBeenCalled()
    expect(api.start).not.toHaveBeenCalled()
    api.review.mockResolvedValue({ ...review, canStart: false, activeSessionId: 'active-workout' })
    act(() => client.setQueryData(programSetupDraftKey(user.id, 'draft-a'), makeDraft()))
    await waitFor(() => expect(result.current.review?.activeSessionId).toBe('active-workout'))
    act(() => result.current.requestStart())
    expect(result.current.ready).toBe(false)
    expect(api.start).not.toHaveBeenCalled()
  })

  it('requires replacement confirmation and sends the exact reviewed intent', async () => {
    const replacing = { ...review, activeProgram: { id: 'previous-plan', title: 'Previous plan', stateVersion: 4 },
      intent: { ...review.intent, expectedActiveProgram: { id: 'previous-plan', stateVersion: 4 } } }
    api.review.mockResolvedValue(replacing)
    const { mount } = harness()
    const { result } = mount()
    await waitFor(() => expect(result.current.ready).toBe(true))
    act(() => result.current.requestStart())
    expect(result.current.replaceOpen).toBe(true)
    expect(api.start).not.toHaveBeenCalled()
    act(() => result.current.cancelReplace())
    expect(api.start).not.toHaveBeenCalled()
    act(() => result.current.requestStart())
    act(() => result.current.confirmReplace())
    await waitFor(() => expect(api.start).toHaveBeenCalledOnce())
    expect(api.start.mock.calls[0][1].intent).toEqual(replacing.intent)
  })

  it('retains a frozen request through leaving and retrying without re-reading or changing the intent', async () => {
    api.start.mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce(receipt)
    const { client, mount } = harness()
    const first = mount()
    await waitFor(() => expect(first.result.current.ready).toBe(true))
    act(() => first.result.current.requestStart())
    await waitFor(() => expect(first.result.current.error).toBe('Response lost'))
    const sent = api.start.mock.calls[0][1]
    expect(first.result.current.frozen).toBe(true)
    first.unmount()
    api.review.mockResolvedValue({ ...review, intent: { ...review.intent, rounding: 5 } })
    const retry = mount()
    expect(retry.result.current.review?.intent).toEqual(sent.intent)
    expect(api.review).toHaveBeenCalledOnce()
    act(() => retry.result.current.requestStart())
    await waitFor(() => expect(client.getQueryData(programSetupReceiptKey(user.id, 'draft-a'))).toEqual(receipt))
    expect(api.start.mock.calls[1][1]).toEqual(sent)
    expect(client.getQueryData(programSetupDraftKey(user.id, 'draft-a'))).toBeUndefined()
  })

  it('requires a fresh review after a definite conflict and allocates a new request only then', async () => {
    api.start.mockRejectedValueOnce(new Error('PROGRAM_START_REVIEW_STALE')).mockResolvedValueOnce(receipt)
    const { mount } = harness()
    const { result } = mount()
    await waitFor(() => expect(result.current.ready).toBe(true))
    act(() => result.current.requestStart())
    await waitFor(() => expect(result.current.needsFreshReview).toBe(true))
    expect(result.current.error).toBe('Your current plan changed. Refresh this review before confirming your new plan.')
    act(() => result.current.requestStart())
    expect(api.start).toHaveBeenCalledOnce()
    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.ready).toBe(true))
    act(() => result.current.requestStart())
    await waitFor(() => expect(api.start).toHaveBeenCalledTimes(2))
    expect(api.start.mock.calls[1][1].requestId).not.toBe(api.start.mock.calls[0][1].requestId)
    expect(api.review).toHaveBeenCalledTimes(2)
  })

  it('requires a new replacement confirmation if refocusing changes the reviewed intent', async () => {
    const replacing = { ...review, activeProgram: { id: 'previous-plan', title: 'Previous plan', stateVersion: 4 },
      intent: { ...review.intent, expectedActiveProgram: { id: 'previous-plan', stateVersion: 4 } } }
    api.review.mockResolvedValue(replacing)
    const { mount } = harness()
    const { result, rerender } = mount()
    await waitFor(() => expect(result.current.ready).toBe(true))
    act(() => result.current.requestStart())
    expect(result.current.replaceOpen).toBe(true)
    api.focused = false
    rerender()
    api.review.mockResolvedValue({ ...replacing, activeProgram: { ...replacing.activeProgram, stateVersion: 5 },
      intent: { ...replacing.intent, expectedActiveProgram: { id: 'previous-plan', stateVersion: 5 } } })
    api.focused = true
    rerender()
    await waitFor(() => expect(result.current.review?.intent.expectedActiveProgram?.stateVersion).toBe(5))
    expect(result.current.replaceOpen).toBe(false)
    act(() => result.current.confirmReplace())
    expect(api.start).not.toHaveBeenCalled()
    act(() => result.current.requestStart())
    expect(result.current.replaceOpen).toBe(true)
    act(() => result.current.confirmReplace())
    await waitFor(() => expect(api.start).toHaveBeenCalledOnce())
    expect(api.start.mock.calls[0][1].intent.expectedActiveProgram.stateVersion).toBe(5)
  })

  it('lets a definite validation rejection recover through a fresh review', async () => {
    api.start.mockRejectedValue(new Error('PROGRAM_START_VALIDATION_FAILED'))
    const { mount } = harness()
    const { result } = mount()
    await waitFor(() => expect(result.current.ready).toBe(true))
    act(() => result.current.requestStart())
    await waitFor(() => expect(result.current.needsFreshReview).toBe(true))
    expect(result.current.error).toBe('Some setup values are no longer valid for this plan. Reload setup and review your starting numbers.')
    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.frozen).toBe(false)
  })

  it('suppresses a late account response after unmount and keeps its request recoverable for that account', async () => {
    const pending = deferred<ProgramStartReceipt>()
    api.start.mockReturnValue(pending.promise)
    const { client, mount } = harness()
    const first = mount()
    await waitFor(() => expect(first.result.current.ready).toBe(true))
    act(() => first.result.current.requestStart())
    await waitFor(() => expect(api.start).toHaveBeenCalledOnce())
    first.unmount()
    mount({ id: 'other-account' } as User)
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    await act(async () => pending.resolve(receipt))
    await waitFor(() => expect(client.isMutating()).toBe(0))
    expect(client.getQueryData(programSetupReceiptKey(user.id, 'draft-a'))).toBeUndefined()
    expect(client.getQueryData<NativeProgramSetupDraft>(programSetupDraftKey(user.id, 'draft-a'))?.submission).toEqual(api.start.mock.calls[0][1])
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('ignores a late review when starting numbers changed while the read was pending', async () => {
    const pending = deferred<ProgramStartReview>()
    api.review.mockReturnValueOnce(pending.promise).mockResolvedValueOnce({ ...review, intent: { ...review.intent, rounding: 5 } })
    const { client, mount } = harness()
    const { result } = mount()
    await waitFor(() => expect(api.review).toHaveBeenCalledOnce())
    act(() => client.setQueryData(programSetupDraftKey(user.id, 'draft-a'), { ...makeDraft(), revision: 1, rounding: 5 }))
    await waitFor(() => expect(result.current.review?.intent.rounding).toBe(5))
    await act(async () => pending.resolve(review))
    expect(client.getQueryData<NativeProgramSetupDraft>(programSetupDraftKey(user.id, 'draft-a'))?.review?.intent.rounding).toBe(5)
  })

  it('sends at most one start when the action is invoked twice before React updates', async () => {
    const pending = deferred<ProgramStartReceipt>()
    api.start.mockReturnValue(pending.promise)
    const { client, mount } = harness()
    const { result } = mount()
    await waitFor(() => expect(result.current.ready).toBe(true))
    act(() => { result.current.requestStart(); result.current.requestStart() })
    await waitFor(() => expect(api.start).toHaveBeenCalledOnce())
    await act(async () => pending.resolve(receipt))
    await waitFor(() => expect(client.isMutating()).toBe(0))
    expect(api.start).toHaveBeenCalledOnce()
  })

  it('cannot clear the submitted intent with an immediate refresh before React updates', async () => {
    const pending = deferred<ProgramStartReceipt>()
    api.start.mockReturnValue(pending.promise)
    const { client, mount } = harness()
    const { result } = mount()
    await waitFor(() => expect(result.current.ready).toBe(true))
    act(() => { result.current.requestStart(); result.current.refresh() })
    await waitFor(() => expect(api.start).toHaveBeenCalledOnce())
    expect(client.getQueryData<NativeProgramSetupDraft>(programSetupDraftKey(user.id, 'draft-a'))?.submission).toEqual(api.start.mock.calls[0][1])
    expect(api.review).toHaveBeenCalledOnce()
    await act(async () => pending.resolve(receipt))
  })
})
