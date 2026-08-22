import { describe, expect, it, vi } from 'vitest'
import {
  collectChunkedSessionQueryPages,
  collectSessionQueryPages,
  uniqueRowsById,
} from '@sheetless/domain/session/session-query-pages'

describe('session query pagination', () => {
  it('reads past the former 400-row history ceiling', async () => {
    const source = Array.from({ length: 1_205 }, (_, index) => ({ id: String(index) }))
    const fetchPage = vi.fn(async (from: number, to: number) => ({
      data: source.slice(from, to + 1),
      error: null,
    }))

    await expect(collectSessionQueryPages(fetchPage)).resolves.toEqual(source)
    expect(fetchPage.mock.calls).toEqual([
      [0, 499],
      [500, 999],
      [1_000, 1_499],
    ])
  })

  it('chunks parent ids and paginates every child lookup', async () => {
    const ids = Array.from({ length: 205 }, (_, index) => `id-${index}`)
    const fetchPage = vi.fn(async (chunk: string[], from: number, to: number) => ({
      data: from === 0 && to >= from ? chunk.map((id) => ({ id })) : [],
      error: null,
    }))

    const rows = await collectChunkedSessionQueryPages(ids, fetchPage)

    expect(rows).toHaveLength(205)
    expect(fetchPage.mock.calls.map(([chunk, from, to]) => [chunk.length, from, to])).toEqual([
      [100, 0, 499],
      [100, 0, 499],
      [5, 0, 499],
    ])
  })

  it('deduplicates planned and performed movement query matches', () => {
    expect(uniqueRowsById([
      { id: 'exercise-1', source: 'planned' },
      { id: 'exercise-2', source: 'planned' },
      { id: 'exercise-1', source: 'performed' },
    ])).toEqual([
      { id: 'exercise-1', source: 'performed' },
      { id: 'exercise-2', source: 'planned' },
    ])
  })
})
