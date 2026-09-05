import { act, renderHook, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('@sheetless/data/feedback/feedback', () => ({ submitFeedback: api.send }))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }) }))
const { useFeedbackSubmission } = await import('../src/features/feedback/useFeedbackSubmission')
beforeEach(() => api.send.mockReset())
const user = { id: 'one' } as User
const input = { source: 'menu' as const, category: 'bug' as const, message: 'Draft' }

function deferred() {
  let resolve!: (value: unknown) => void
  let reject!: (value: unknown) => void
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { resolve, reject, promise }
}

describe('feedback sends', () => {
  it('blocks duplicate taps immediately and never sends again after success', async () => {
    const request = deferred()
    api.send.mockReturnValue(request.promise)
    const { result } = renderHook(() => useFeedbackSubmission(user))
    act(() => { void result.current.send(input); void result.current.send(input) })
    expect(api.send).toHaveBeenCalledTimes(1)
    await act(async () => { request.resolve({ ok: true }) })
    expect(result.current.sent).toBe(true)
    await act(async () => { await result.current.send(input) })
    expect(api.send).toHaveBeenCalledTimes(1)
  })
  it('shows an inline failure, allows explicit retry, and has no automatic retry', async () => {
    api.send.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ ok: true })
    const { result } = renderHook(() => useFeedbackSubmission(user))
    await act(async () => { await result.current.send(input) })
    expect(result.current.error).toBe('Offline')
    expect(result.current.sent).toBe(false)
    expect(api.send).toHaveBeenCalledTimes(1)
    await act(async () => { await result.current.send(input) })
    expect(result.current.sent).toBe(true)
  })
  it('ignores callbacks from the previous account and unmounted forms', async () => {
    const request = deferred()
    api.send.mockReturnValue(request.promise)
    const { result, rerender, unmount } = renderHook(({ account }) => useFeedbackSubmission(account), { initialProps: { account: user } })
    let accepted!: Promise<boolean>
    act(() => { accepted = result.current.send(input) })
    rerender({ account: { id: 'two' } as User })
    await act(async () => { request.resolve({ ok: true }) })
    expect(await accepted).toBe(false)
    expect(result.current.sent).toBe(false)
    unmount()
    await waitFor(() => expect(api.send).toHaveBeenCalledTimes(1))
  })
})
