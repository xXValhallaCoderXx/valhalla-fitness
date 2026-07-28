const DEFAULT_PAGE_SIZE = 500

type PostgrestPage<T> = {
  data: T[] | null
  error: { message: string } | null
}

/**
 * Read every row from a PostgREST query without relying on the project's
 * server-side max-row setting. Callers must apply a deterministic order before
 * `range` so adjacent pages cannot overlap or skip tied rows.
 */
export async function collectPostgrestPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PostgrestPage<T>>,
  options: {
    limit?: number
    pageSize?: number
  } = {},
): Promise<T[]> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE
  const limit = options.limit
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error('PostgREST page size must be a positive integer')
  }
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 0)) {
    throw new Error('PostgREST row limit must be a non-negative integer')
  }
  if (limit === 0) return []

  const rows: T[] = []
  while (limit === undefined || rows.length < limit) {
    const requestedCount = Math.min(pageSize, limit === undefined ? pageSize : limit - rows.length)
    const from = rows.length
    const { data, error } = await fetchPage(from, from + requestedCount - 1)
    if (error) throw new Error(error.message)

    const page = data ?? []
    rows.push(...page.slice(0, requestedCount))
    if (page.length < requestedCount) break
  }
  return rows
}
