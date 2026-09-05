const SESSION_QUERY_PAGE_SIZE = 500
const SESSION_QUERY_ID_CHUNK_SIZE = 100
const SESSION_QUERY_CHUNK_CONCURRENCY = 4

type PostgrestPage<T> = {
  data: T[] | null
  error: { message: string } | null
}

/**
 * Reads every row from a deterministically ordered session query without
 * depending on PostgREST's project-wide maximum row setting.
 */
export async function collectSessionQueryPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PostgrestPage<T>>,
): Promise<T[]> {
  const rows: T[] = []
  while (true) {
    const from = rows.length
    const { data, error } = await fetchPage(from, from + SESSION_QUERY_PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const page = data ?? []
    rows.push(...page)
    if (page.length < SESSION_QUERY_PAGE_SIZE) return rows
  }
}

/**
 * Keeps `in (...)` URLs bounded and paginates each child lookup. A small
 * concurrency window avoids turning long training histories into serial N+1s.
 */
export async function collectChunkedSessionQueryPages<T>(
  ids: string[],
  fetchPage: (
    idChunk: string[],
    from: number,
    to: number,
  ) => PromiseLike<PostgrestPage<T>>,
): Promise<T[]> {
  const chunks: string[][] = []
  for (let start = 0; start < ids.length; start += SESSION_QUERY_ID_CHUNK_SIZE) {
    chunks.push(ids.slice(start, start + SESSION_QUERY_ID_CHUNK_SIZE))
  }

  const rows: T[] = []
  for (let start = 0; start < chunks.length; start += SESSION_QUERY_CHUNK_CONCURRENCY) {
    const pages = await Promise.all(
      chunks
        .slice(start, start + SESSION_QUERY_CHUNK_CONCURRENCY)
        .map((chunk) => collectSessionQueryPages((from, to) => fetchPage(chunk, from, to))),
    )
    for (const page of pages) rows.push(...page)
  }
  return rows
}

export function uniqueRowsById<T extends { id: string }>(rows: T[]): T[] {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values())
}
