import type { PropsWithChildren, ReactNode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import type { ProgramEndState } from '@sheetless/domain/program/ending'

const api = vi.hoisted(() => ({ read: vi.fn(), end: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
vi.mock('@sheetless/data/program/ending', () => ({ getProgramEndState: api.read, endProgram: api.end }))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }) }))
vi.mock('expo-router', () => ({ router: { navigate: api.navigate, push: api.push } }))
// These assertions cover data/confirmation wiring only; native Modal/layout needs device acceptance.
vi.mock('@/components', () => {
  const Block = ({ children }: { children: ReactNode }) => <div>{children}</div>
  return { Text: Block, Caption: Block,
    SheetModal: Block,
    Button: ({ label, disabled, loading, onPress }: { label: string; disabled?: boolean; loading?: boolean; onPress: () => void }) =>
      <button disabled={disabled || loading} onClick={onPress}>{label}</button> }
})
import { EndPlanSheet } from '../src/features/program/settings/EndPlanSheet'

const user = { id: 'end-user' } as User
const state: ProgramEndState = { id: '00000000-0000-4000-8000-000000000001', title: 'Current plan',
  status: 'active', stateVersion: 4, activeSessionId: null, hasPendingDecisions: false }
function setup(cached?: ProgramEndState) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  if (cached) client.setQueryData([...accountQueryKeys.program(user.id), 'end', state.id], cached)
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const close = vi.fn(), review = vi.fn()
  const view = render(<EndPlanSheet user={user} programId={state.id} onClose={close} onReview={review} />, { wrapper })
  return { client, close, review, view }
}
beforeEach(() => { vi.resetAllMocks(); api.read.mockResolvedValue(state); api.end.mockResolvedValue({ programId: state.id }) })

describe('End plan confirmation', () => {
  it('requires a fresh read before enabling confirmation even with a usable cached version', async () => {
    let resolve!: (value: ProgramEndState) => void
    api.read.mockReturnValueOnce(new Promise<ProgramEndState>(done => { resolve = done }))
    setup({ ...state, stateVersion: 1 })
    expect(screen.queryByRole('button', { name: 'End plan' })).toBeNull()
    await act(async () => resolve(state))
    fireEvent.click(await screen.findByRole('button', { name: 'End plan' }))
    await waitFor(() => expect(api.end).toHaveBeenCalledOnce())
    expect(api.end.mock.calls[0][1]).toMatchObject({ programId: state.id, expectedVersion: 4 })
  })

  it('keeps the exact request across an ambiguous failure and refreshes only after confirmation', async () => {
    api.end.mockRejectedValueOnce(new Error('network response lost')).mockResolvedValueOnce({ programId: state.id })
    const { client, close } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    fireEvent.click(await screen.findByRole('button', { name: 'End plan' }))
    const retry = await screen.findByRole('button', { name: 'Retry End plan' })
    expect(close).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Keep plan' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
    expect(invalidate).not.toHaveBeenCalled()
    fireEvent.click(retry)
    await waitFor(() => expect(close).toHaveBeenCalledOnce())
    expect(api.end.mock.calls[0][1]).toEqual(api.end.mock.calls[1][1])
    expect(invalidate).toHaveBeenCalledWith({ queryKey: accountQueryKeys.user(user.id) })
    expect(api.navigate).toHaveBeenCalledWith('/(tabs)')
  })


  it('ignores a late end response after the sheet is unmounted', async () => {
    let resolve!: (value: { programId: string }) => void
    api.end.mockReturnValueOnce(new Promise(done => { resolve = done }))
    const { client, close, view } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    fireEvent.click(await screen.findByRole('button', { name: 'End plan' }))
    await waitFor(() => expect(api.end).toHaveBeenCalledOnce())
    view.unmount()
    await act(async () => resolve({ programId: state.id }))
    await waitFor(() => expect(client.isMutating()).toBe(0))
    expect(close).not.toHaveBeenCalled()
    expect(api.navigate).not.toHaveBeenCalled()
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('isolates a failed or pending intent when switching accounts and back to the same account', async () => {
    let resolve!: (value: { programId: string }) => void
    api.end.mockReturnValueOnce(new Promise(done => { resolve = done }))
    const { client, close, review, view } = setup()
    fireEvent.click(await screen.findByRole('button', { name: 'End plan' }))
    await waitFor(() => expect(api.end).toHaveBeenCalledOnce())
    view.rerender(<EndPlanSheet user={{ id: 'other-user' } as User} programId={state.id} onClose={close} onReview={review} />)
    view.rerender(<EndPlanSheet user={user} programId={state.id} onClose={close} onReview={review} />)
    await act(async () => resolve({ programId: state.id }))
    await waitFor(() => expect(client.isMutating()).toBe(0))
    expect(close).not.toHaveBeenCalled()
    expect(api.navigate).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'End plan' }))
    await waitFor(() => expect(api.end).toHaveBeenCalledTimes(2))
    expect(api.end.mock.calls[1][1].requestId).not.toBe(api.end.mock.calls[0][1].requestId)
  })

  it('refreshes after dismissing an ambiguous result without claiming the plan was kept', async () => {
    api.end.mockRejectedValueOnce(new Error('Response lost'))
    const { client, close } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    fireEvent.click(await screen.findByRole('button', { name: 'End plan' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Close' }))
    expect(close).toHaveBeenCalledOnce()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: accountQueryKeys.user(user.id) })
    expect(api.navigate).not.toHaveBeenCalled()
  })

  it('offers Resume for a workout belonging to the plan without sending an end request', async () => {
    api.read.mockResolvedValue({ ...state, activeSessionId: 'workout-1' })
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Resume workout' }))
    expect(api.push).toHaveBeenCalledWith({ pathname: '/session/[sessionId]', params: { sessionId: 'workout-1' } })
    expect(api.end).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'End plan' })).toBeNull()
  })

  it('opens review after refreshing programme data and never silently resolves pending decisions', async () => {
    api.read.mockResolvedValue({ ...state, hasPendingDecisions: true })
    const { review } = setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Review progression' }))
    await waitFor(() => expect(review).toHaveBeenCalledOnce())
    expect(api.end).not.toHaveBeenCalled()
  })

  it('requires a new confirmation and version after a definite conflict', async () => {
    api.end.mockRejectedValueOnce(new Error('PROGRAM_VERSION_CONFLICT'))
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'End plan' }))
    const check = await screen.findByRole('button', { name: 'Check latest plan' })
    api.read.mockResolvedValue({ ...state, stateVersion: 5 })
    fireEvent.click(check)
    const end = await screen.findByRole('button', { name: 'End plan' })
    await waitFor(() => expect(end.hasAttribute('disabled')).toBe(false))
    fireEvent.click(end)
    await waitFor(() => expect(api.end).toHaveBeenCalledTimes(2))
    expect(api.end.mock.calls[1][1].expectedVersion).toBe(5)
    expect(api.end.mock.calls[1][1].requestId).not.toBe(api.end.mock.calls[0][1].requestId)
  })
})
