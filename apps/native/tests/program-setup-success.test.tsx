import type { ReactNode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProgramStartReceipt } from '@sheetless/domain/program/reviewed-start'
import { programSetupReceiptKey } from '../src/features/templates/setup-draft'
import { themeProviderMock } from './support/theme'

const api = vi.hoisted(() => ({ today: vi.fn(), start: vi.fn(), dismissTo: vi.fn(), push: vi.fn(), begin: null as (() => void) | null }))
vi.mock('@sheetless/data/session/reads', () => ({ getToday: api.today }))
vi.mock('@sheetless/data/session/lifecycle', () => ({ startSession: api.start }))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }) }))
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('expo-router', () => ({ router: { dismissTo: api.dismissTo, push: api.push } }))
// These assertions cover choice, request and account wiring. Native layout has a separate device gate.
vi.mock('@/components', () => {
  const Block = ({ children }: { children: ReactNode }) => <div>{children}</div>
  return { Screen: Block, Text: Block, Caption: Block, Heading: Block, Panel: Block,
    Button: ({ label, disabled, loading, onPress }: { label: string; disabled?: boolean; loading?: boolean; onPress: () => void }) => {
      if (label === 'Start first workout') api.begin = onPress
      return <button disabled={disabled || loading} onClick={onPress}>{label}</button>
    } }
})
import { ProgramSetupSuccess } from '../src/features/templates/start/ProgramSetupSuccess'

const user = { id: 'setup-account' } as User
const receipt: ProgramStartReceipt = { requestId: 'request-a', programId: 'created-plan', templateId: 'plan-a',
  templateVersionId: 'version-a', startedAt: '2026-09-27T10:00:00Z' }
const today = { activeProgram: { id: receipt.programId }, activeSession: null, pendingDecisions: [] }
let client: QueryClient
function mount() {
  client.setQueryData(programSetupReceiptKey(user.id, 'draft-a'), receipt)
  return render(<QueryClientProvider client={client}>
    <ProgramSetupSuccess key={user.id} user={user} draftId="draft-a" receipt={receipt} />
  </QueryClientProvider>)
}
beforeEach(() => {
  vi.resetAllMocks()
  api.today.mockResolvedValue(today)
  api.start.mockResolvedValue({ sessionId: 'first-workout' })
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
})
afterEach(() => client.clear())

describe('explicit choice after successful plan setup', () => {
  it('does not start or read Today automatically, and Go to Today only navigates', () => {
    mount()
    expect(screen.getByText('Your plan is ready')).toBeTruthy()
    expect(api.today).not.toHaveBeenCalled()
    expect(api.start).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Go to Today' }))
    expect(api.dismissTo).toHaveBeenCalledExactlyOnceWith('/(tabs)')
    expect(client.getQueryData(programSetupReceiptKey(user.id, 'draft-a'))).toBeUndefined()
    expect(api.start).not.toHaveBeenCalled()
  })

  it('pins Start first workout to the confirmed programme and clears the receipt only after success', async () => {
    let resolve!: (value: { sessionId: string }) => void
    api.start.mockReturnValue(new Promise(done => { resolve = done }))
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Start first workout' }))
    await waitFor(() => expect(api.start).toHaveBeenCalledOnce())
    expect(api.start.mock.calls[0][0].user.id).toBe(user.id)
    expect(api.start.mock.calls[0][1]).toMatchObject({ expectedProgramId: receipt.programId, clientMutationId: expect.any(String) })
    expect(client.getQueryData(programSetupReceiptKey(user.id, 'draft-a'))).toEqual(receipt)
    expect(api.push).not.toHaveBeenCalled()
    await act(async () => resolve({ sessionId: 'first-workout' }))
    await waitFor(() => expect(api.push).toHaveBeenCalledExactlyOnceWith({ pathname: '/session/[sessionId]', params: { sessionId: 'first-workout' } }))
    expect(client.getQueryData(programSetupReceiptKey(user.id, 'draft-a'))).toBeUndefined()
    expect(api.dismissTo).not.toHaveBeenCalled()
  })

  it('permits only one preflight and start when first-workout actions arrive before React updates', async () => {
    let resolveToday!: (value: typeof today) => void
    let resolveStart!: (value: { sessionId: string }) => void
    api.today.mockReturnValue(new Promise(done => { resolveToday = done }))
    api.start.mockReturnValue(new Promise(done => { resolveStart = done }))
    mount()
    const originalAction = api.begin!
    act(() => { originalAction(); originalAction() })
    expect(api.today).toHaveBeenCalledOnce()
    await act(async () => resolveToday(today))
    await waitFor(() => expect(api.start).toHaveBeenCalledOnce())
    // An event captured before the disabled state must also be ignored during start.
    act(() => originalAction())
    expect(api.today).toHaveBeenCalledOnce()
    await act(async () => resolveStart({ sessionId: 'first-workout' }))
    await waitFor(() => expect(client.isMutating()).toBe(0))
    expect(api.start).toHaveBeenCalledOnce()
    expect(api.push).toHaveBeenCalledOnce()
  })

  it.each([
    [{ ...today, activeProgram: { id: 'different-plan' } }, 'Your active plan changed.'],
    [{ ...today, activeSession: { id: 'active-workout' } }, 'A workout is already in progress.'],
    [{ ...today, pendingDecisions: [{ id: 'decision' }] }, 'Progression is waiting for review.'],
  ])('keeps the success receipt and avoids starting when fresh account state blocks entry (%j)', async (state, message) => {
    api.today.mockResolvedValue(state)
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Start first workout' }))
    expect(await screen.findByText(new RegExp(message))).toBeTruthy()
    expect(api.start).not.toHaveBeenCalled()
    expect(client.getQueryData(programSetupReceiptKey(user.id, 'draft-a'))).toEqual(receipt)
    expect(api.push).not.toHaveBeenCalled()
  })

  it('keeps retry identity and the expected programme when a start response is lost', async () => {
    api.start.mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce({ sessionId: 'first-workout' })
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Start first workout' }))
    await screen.findByText('Response lost')
    expect(client.getQueryData(programSetupReceiptKey(user.id, 'draft-a'))).toEqual(receipt)
    fireEvent.click(screen.getByRole('button', { name: 'Start first workout' }))
    await waitFor(() => expect(api.start).toHaveBeenCalledTimes(2))
    expect(api.start.mock.calls[1][1]).toEqual(api.start.mock.calls[0][1])
    await waitFor(() => expect(api.push).toHaveBeenCalledOnce())
  })

  it('ignores a delayed preflight when the account-owned success screen has unmounted', async () => {
    let resolve!: (value: typeof today) => void
    api.today.mockReturnValue(new Promise(done => { resolve = done }))
    const view = mount()
    fireEvent.click(screen.getByRole('button', { name: 'Start first workout' }))
    await waitFor(() => expect(api.today).toHaveBeenCalledOnce())
    view.unmount()
    await act(async () => resolve(today))
    expect(api.start).not.toHaveBeenCalled()
    expect(api.push).not.toHaveBeenCalled()
    expect(client.getQueryData(programSetupReceiptKey(user.id, 'draft-a'))).toEqual(receipt)
  })

  it('ignores a delayed workout response after the success screen unmounts', async () => {
    let resolve!: (value: { sessionId: string }) => void
    api.start.mockReturnValue(new Promise(done => { resolve = done }))
    const view = mount()
    fireEvent.click(screen.getByRole('button', { name: 'Start first workout' }))
    await waitFor(() => expect(api.start).toHaveBeenCalledOnce())
    view.unmount()
    await act(async () => resolve({ sessionId: 'first-workout' }))
    await waitFor(() => expect(client.isMutating()).toBe(0))
    expect(api.push).not.toHaveBeenCalled()
    expect(client.getQueryData(programSetupReceiptKey(user.id, 'draft-a'))).toEqual(receipt)
  })
})
