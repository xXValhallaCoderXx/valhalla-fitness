import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { transitionAccountCache } from '../src/shared/lib/account-cache'
import {
  accountQueryKeys,
  authQueryKeys,
  publicQueryKeys,
} from '../src/shared/lib/query-keys'

describe('account query keys', () => {
  it('isolates account-owned data by authenticated subject', () => {
    expect(accountQueryKeys.templates('user-a')).not.toEqual(
      accountQueryKeys.templates('user-b'),
    )
    expect(accountQueryKeys.session('user-a', 'session-1')).not.toEqual(
      accountQueryKeys.session('user-b', 'session-1'),
    )
    expect(accountQueryKeys.bodyweight('user-a')).not.toEqual(
      accountQueryKeys.bodyweight('user-b'),
    )
  })

  it('keeps genuinely public data independent of the account subject', () => {
    expect(publicQueryKeys.templates()).toEqual(['public', 'templates'])
    expect(publicQueryKeys.authPolicy()).toEqual(['public', 'auth-policy'])
  })
})

describe('transitionAccountCache', () => {
  it('removes every account cache while preserving public data', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(authQueryKeys.accountSubject(), 'user-a')
    queryClient.setQueryData(accountQueryKeys.profile('user-a'), { id: 'user-a' })
    queryClient.setQueryData(accountQueryKeys.templates('user-a'), ['private-a'])
    queryClient.setQueryData(accountQueryKeys.profile('user-b'), { id: 'user-b' })
    queryClient.setQueryData(publicQueryKeys.templates(), ['public'])

    await transitionAccountCache(queryClient, 'user-b')

    expect(queryClient.getQueryData(accountQueryKeys.profile('user-a'))).toBeUndefined()
    expect(queryClient.getQueryData(accountQueryKeys.templates('user-a'))).toBeUndefined()
    expect(queryClient.getQueryData(accountQueryKeys.profile('user-b'))).toBeUndefined()
    expect(queryClient.getQueryData(publicQueryKeys.templates())).toEqual(['public'])
    expect(queryClient.getQueryData(authQueryKeys.accountSubject())).toBe('user-b')
  })

  it('does not clear a warm cache when the subject is unchanged', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(authQueryKeys.accountSubject(), 'user-a')
    queryClient.setQueryData(accountQueryKeys.profile('user-a'), { id: 'user-a' })

    await expect(transitionAccountCache(queryClient, 'user-a')).resolves.toBe(false)
    expect(queryClient.getQueryData(accountQueryKeys.profile('user-a'))).toEqual({
      id: 'user-a',
    })
  })

  it('clears account data on sign-out', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(authQueryKeys.accountSubject(), 'user-a')
    queryClient.setQueryData(accountQueryKeys.today('user-a'), { activeSession: null })

    await transitionAccountCache(queryClient, null)

    expect(queryClient.getQueryData(accountQueryKeys.today('user-a'))).toBeUndefined()
    expect(queryClient.getQueryData(authQueryKeys.accountSubject())).toBeNull()
  })
})
