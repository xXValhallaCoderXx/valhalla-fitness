import { describe, expect, it, vi } from 'vitest'
import { collectPostgrestPages } from '../src/domains/history/lib/postgrest-pagination'

describe('collectPostgrestPages', () => {
  it('reads past a PostgREST-sized page until the final partial page', async () => {
    const source = Array.from({ length: 1_205 }, (_, index) => index)
    const fetchPage = vi.fn(async (from: number, to: number) => ({
      data: source.slice(from, to + 1),
      error: null,
    }))

    await expect(collectPostgrestPages(fetchPage)).resolves.toEqual(source)
    expect(fetchPage.mock.calls).toEqual([
      [0, 499],
      [500, 999],
      [1_000, 1_499],
    ])
  })

  it('honors an explicit bounded-read limit without requesting an extra page', async () => {
    const source = Array.from({ length: 1_205 }, (_, index) => index)
    const fetchPage = vi.fn(async (from: number, to: number) => ({
      data: source.slice(from, to + 1),
      error: null,
    }))

    const rows = await collectPostgrestPages(fetchPage, { limit: 620 })

    expect(rows).toEqual(source.slice(0, 620))
    expect(fetchPage.mock.calls).toEqual([
      [0, 499],
      [500, 619],
    ])
  })

  it('propagates a page failure instead of returning partial history', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, index) => index), error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'history page failed' } })

    await expect(collectPostgrestPages(fetchPage)).rejects.toThrow('history page failed')
  })
})
