import { describe, expect, it } from 'vitest'
import { submitFeedback } from '../src/feedback/feedback'
import { makeStubCtx } from './support/supabase-stub'

describe('feedback data boundary', () => {
  it.each([
    { source: 'menu', message: 'x'.repeat(2001) },
    { source: 'menu', message: 'Hello', userId: 'other-account' },
    { source: 'decision', category: 'rule_unclear', decisionId: 'invalid' },
    { source: 'post_workout', answer: 'yes' },
    { source: 'menu', message: 'Hello', metadata: { big: 'x'.repeat(16001) } },
    { source: 'menu', answer: 'yes' },
    { source: 'menu', message: '   ' },
  ])('rejects invalid feedback before any database call', async (input) => {
    const { ctx, stub } = makeStubCtx({ feedback_events: [] })
    await expect(submitFeedback(ctx, input as never)).rejects.toThrow()
    expect(stub.fromCalls).toEqual([])
  })

  it('normalizes valid feedback and inserts once as the authenticated account', async () => {
    const { ctx, stub } = makeStubCtx({ feedback_events: [] })
    await expect(submitFeedback(ctx, { source: 'menu', category: 'bug', message: '  A problem  ' })).resolves.toEqual({ ok: true })
    expect(stub.tables.feedback_events).toHaveLength(1)
    expect(stub.tables.feedback_events[0]).toMatchObject({ user_id: 'user-1', message: 'A problem', source: 'menu' })
  })
})
