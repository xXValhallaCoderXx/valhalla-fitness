import type { PropsWithChildren } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createNativeSetupDraft, type NativeProgramSetupDraft } from '@sheetless/domain/program/native-setup-draft'
import { buildProgramSetupSuggestions } from '@sheetless/domain/program/setup-suggestions'
import { programSetupDraftKey } from '../src/features/templates/setup-draft'
import { consumeSetupReturn, registerSetupReturn } from '../src/features/templates/setup-return'
import { useDiscardWorkout } from '../src/features/session/lifecycle/useDiscardWorkout'

const api = vi.hoisted(() => ({ discard: vi.fn(), dismiss: vi.fn(), exit: vi.fn(), today: vi.fn(), session: vi.fn() }))
vi.mock('expo-router', () => ({ router: { dismissTo: api.dismiss } }))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }) }))
vi.mock('@/features/session/rest-timer/rest-timer-context', () => ({ useRestTimerControls: () => ({ exit: api.exit }) }))
vi.mock('@sheetless/data/session/lifecycle', () => ({ discardSession: api.discard }))
vi.mock('@sheetless/data/session/reads', () => ({ getSession: api.session, getToday: api.today }))

const user = { id: 'account-a' } as User
const key = programSetupDraftKey(user.id, 'draft-a')
function seed(client: QueryClient) {
  const snapshot = buildProgramSetupSuggestions({ templateId: 'chosen-schedule', units: 'kg', rounding: 2.5,
    requiredState: [], defaults: {}, sessions: [] })
  const draft = { ...createNativeSetupDraft(user.id, 'draft-a', snapshot), rawValues: { lift: '52.' }, manualKeys: ['lift'] }
  client.setQueryData(key, draft)
  return draft
}
function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}
beforeEach(() => vi.resetAllMocks())

describe('setup workout continuation', () => {
  it('returns once to the exact account draft, preserves raw values and requires review', () => {
    const { client } = harness()
    seed(client)
    expect(registerSetupReturn(client, user.id, 'draft-a', 'workout')).toBeTruthy()
    expect(consumeSetupReturn(client, 'another-account', 'workout')).toBeNull()
    expect(consumeSetupReturn(client, user.id, 'another-workout')).toBeNull()
    expect(consumeSetupReturn(client, user.id, 'workout')).toEqual({
      pathname: '/template/[templateId]/setup', params: { templateId: 'chosen-schedule', draftId: 'draft-a' },
    })
    expect(client.getQueryData(key)).toMatchObject({ step: 'review', rawValues: { lift: '52.' }, manualKeys: ['lift'], review: null })
    expect(consumeSetupReturn(client, user.id, 'workout')).toBeNull()
  })

  it('rejects abandoned drafts, changed templates and an account cache reset', () => {
    const { client } = harness()
    const draft = seed(client)
    registerSetupReturn(client, user.id, 'draft-a', 'workout')
    client.setQueryData(key, { ...draft, templateId: 'another-template' })
    expect(consumeSetupReturn(client, user.id, 'workout')).toBeNull()
    registerSetupReturn(client, user.id, 'draft-a', 'workout')
    client.removeQueries({ queryKey: key })
    expect(consumeSetupReturn(client, user.id, 'workout')).toBeNull()
    expect(registerSetupReturn(client, user.id, 'draft-a', 'workout')).toBeNull()
    seed(client)
    registerSetupReturn(client, user.id, 'draft-a', 'workout')
    client.clear()
    expect(consumeSetupReturn(client, user.id, 'workout')).toBeNull()
  })

  it('preserves a frozen retry rather than rebuilding its intent during a return', () => {
    const { client } = harness()
    const draft = seed(client)
    const submission = { requestId: 'exact-retry', intent: { templateId: 'chosen-schedule' } } as NativeProgramSetupDraft['submission']
    client.setQueryData(key, { ...draft, submission })
    registerSetupReturn(client, user.id, 'draft-a', 'workout')
    consumeSetupReturn(client, user.id, 'workout')
    expect(client.getQueryData<NativeProgramSetupDraft>(key)?.submission).toEqual(submission)
  })

  it('returns to setup after a successful discard and leaves ordinary discards going to Today', async () => {
    const { client, wrapper } = harness()
    seed(client)
    registerSetupReturn(client, user.id, 'draft-a', 'workout')
    api.discard.mockResolvedValue(undefined)
    const { result } = renderHook(() => useDiscardWorkout(user, 'workout'), { wrapper })
    await act(async () => result.current.mutateAsync())
    expect(api.dismiss).toHaveBeenLastCalledWith({ pathname: '/template/[templateId]/setup',
      params: { templateId: 'chosen-schedule', draftId: 'draft-a' } })
    await act(async () => result.current.mutateAsync())
    expect(api.dismiss).toHaveBeenLastCalledWith('/(tabs)')
  })

  it('does not navigate or touch the new account timer when an old discard finishes', async () => {
    const { client, wrapper } = harness()
    seed(client)
    registerSetupReturn(client, user.id, 'draft-a', 'workout')
    let resolve!: () => void
    api.discard.mockReturnValue(new Promise<void>(done => { resolve = done }))
    const { result, rerender } = renderHook(({ account }) => useDiscardWorkout(account, 'workout'), {
      wrapper, initialProps: { account: user },
    })
    act(() => result.current.mutate())
    await waitFor(() => expect(api.discard).toHaveBeenCalledOnce())
    rerender({ account: { id: 'account-b' } as User })
    await act(async () => resolve())
    expect(api.dismiss).not.toHaveBeenCalled()
    expect(api.exit).not.toHaveBeenCalled()
    expect(client.getQueryData(key)).toBeTruthy()
  })
})
