// @vitest-environment node

import { QueryClient, queryOptions } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { loadRouteQuery, prefetchRouteQueries } from '../src/shared/lib/route-loading'

describe('route loading', () => {
  it('starts optional queries together and does not reject when one fails', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const started: string[] = []
    let releaseHistory = () => {}
    const historyGate = new Promise<void>((resolve) => {
      releaseHistory = resolve
    })

    const pending = prefetchRouteQueries(queryClient, [
      queryOptions({
        queryKey: ['history'],
        queryFn: async () => {
          started.push('history')
          await historyGate
          return 'history'
        },
      }),
      queryOptions({
        queryKey: ['program'],
        queryFn: async () => {
          started.push('program')
          throw new Error('optional failure')
        },
      }),
    ])

    await Promise.resolve()
    expect(started).toEqual(['history', 'program'])
    releaseHistory()

    await expect(pending).resolves.toBeUndefined()
    expect(queryClient.getQueryState(['history'])?.status).toBe('success')
    expect(queryClient.getQueryState(['program'])?.status).toBe('error')
  })

  it('keeps required route queries rejecting on failure', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await expect(
      loadRouteQuery(
        queryClient,
        queryOptions({
          queryKey: ['today'],
          queryFn: async () => {
            throw new Error('required failure')
          },
        }),
      ),
    ).rejects.toThrow('required failure')
  })
})
