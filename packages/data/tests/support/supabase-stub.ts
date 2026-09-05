import type { User } from '@supabase/supabase-js'
import type { DataClient, UserContext } from '@sheetless/data/shared/context'

export type TestRow = Record<string, unknown>
export type TestTables = Record<string, TestRow[]>

export type RpcCall = { fn: string; args: Record<string, unknown> | undefined }
export type InsertCall = { table: string; rows: TestRow[] }
export type UpsertCall = {
  table: string
  rows: TestRow[]
  options: { onConflict?: string } | undefined
}
export type UpdateCall = { table: string; values: TestRow; filters: Array<[string, unknown]> }
export type RangeCall = { table: string; from: number; to: number }

type QueryResult = { data: unknown; error: null | { message: string } }

/**
 * Structural stand-in for the PostgREST query builder — implements exactly the
 * chain surface the data functions use, resolving against in-memory tables.
 * Generalized from apps/web/tests/movement-history-server.test.ts.
 */
class TestQuery implements PromiseLike<QueryResult> {
  private readonly filters: Array<(row: TestRow) => boolean> = []
  private readonly eqCalls: Array<[string, unknown]> = []
  private readonly orders: Array<{ column: string; ascending: boolean }> = []
  private limitCount: number | null = null
  private mode: 'select' | 'update' | 'delete' = 'select'
  private updateValues: TestRow | null = null

  constructor(
    private readonly table: string,
    private readonly stub: TestSupabase,
  ) {}

  select() {
    return this
  }

  update(values: TestRow) {
    this.mode = 'update'
    this.updateValues = values
    return this
  }

  delete() {
    this.mode = 'delete'
    return this
  }

  eq(column: string, value: unknown) {
    this.eqCalls.push([column, value])
    this.filters.push((row) => row[column] === value)
    return this
  }

  lt(column: string, value: string | number) {
    this.filters.push((row) => row[column] != null && compareValues(row[column], value) < 0)
    return this
  }

  not(column: string, operator: string, value: unknown) {
    if (operator !== 'is') throw new Error(`Unsupported test operator: ${operator}`)
    this.filters.push((row) => row[column] !== value)
    return this
  }

  in(column: string, values: readonly string[]) {
    const accepted = new Set([...values].map(String))
    this.filters.push((row) => accepted.has(String(row[column])))
    return this
  }

  or(expression: string) {
    // Supports the `col.eq.x,col2.eq.y` disjunctions the session reads use.
    const clauses = expression.split(',').map((clause) => {
      const [column, operator, ...rest] = clause.split('.')
      if (operator !== 'eq') throw new Error(`Unsupported test or() operator: ${clause}`)
      const value = rest.join('.')
      return (row: TestRow) => String(row[column]) === value
    })
    this.filters.push((row) => clauses.some((clause) => clause(row)))
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending ?? true })
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  private materialize(): TestRow[] {
    const rows = (this.stub.tables[this.table] ?? [])
      .filter((row) => this.filters.every((filter) => filter(row)))
      .sort((left, right) => {
        for (const order of this.orders) {
          const comparison = compareValues(left[order.column], right[order.column])
          if (comparison !== 0) return order.ascending ? comparison : -comparison
        }
        return 0
      })
    return this.limitCount == null ? rows : rows.slice(0, this.limitCount)
  }

  private run(): QueryResult {
    if (this.mode === 'update') {
      const matched = this.materialize()
      for (const row of matched) Object.assign(row, this.updateValues)
      this.stub.updateCalls.push({
        table: this.table,
        values: this.updateValues ?? {},
        filters: this.eqCalls,
      })
      return { data: matched, error: null }
    }
    if (this.mode === 'delete') {
      const matched = new Set(this.materialize())
      this.stub.tables[this.table] = (this.stub.tables[this.table] ?? []).filter(
        (row) => !matched.has(row),
      )
      return { data: null, error: null }
    }
    return { data: this.materialize(), error: null }
  }

  async maybeSingle(): Promise<QueryResult> {
    const { data } = this.run()
    const rows = data as TestRow[]
    if (rows.length > 1) return { data: null, error: { message: 'multiple rows' } }
    return { data: rows[0] ?? null, error: null }
  }

  async single(): Promise<QueryResult> {
    const { data } = this.run()
    const rows = data as TestRow[]
    if (rows.length !== 1) return { data: null, error: { message: `expected 1 row, got ${rows.length}` } }
    return { data: rows[0], error: null }
  }

  async range(from: number, to: number): Promise<QueryResult> {
    this.stub.rangeCalls.push({ table: this.table, from, to })
    const { data } = this.run()
    return { data: (data as TestRow[]).slice(from, to + 1), error: null }
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected)
  }
}

export class TestSupabase {
  readonly fromCalls: string[] = []
  readonly rpcCalls: RpcCall[] = []
  readonly insertCalls: InsertCall[] = []
  readonly upsertCalls: UpsertCall[] = []
  readonly updateCalls: UpdateCall[] = []
  readonly rangeCalls: RangeCall[] = []
  /** Queue results for rpc calls by function name; default is `{ data: null }`. */
  readonly rpcResults = new Map<string, unknown>()

  constructor(
    readonly tables: TestTables,
    private readonly userId = 'user-1',
  ) {}

  from(table: string) {
    this.fromCalls.push(table)
    const stub = this
    const query = new TestQuery(table, this)
    return Object.assign(query, {
      insert(rows: TestRow | TestRow[]) {
        const list = Array.isArray(rows) ? rows : [rows]
        stub.tables[table] = [...(stub.tables[table] ?? []), ...list]
        stub.insertCalls.push({ table, rows: list })
        const inserted = {
          select: () => inserted,
          single: async () =>
            list.length === 1
              ? { data: list[0], error: null }
              : { data: null, error: { message: `expected 1 row, got ${list.length}` } },
          maybeSingle: async () => ({ data: list[0] ?? null, error: null }),
          then: <T>(resolve: (value: QueryResult) => T) => resolve({ data: list, error: null }),
        }
        return inserted
      },
      upsert(rows: TestRow | TestRow[], options?: { onConflict?: string }) {
        const list = Array.isArray(rows) ? rows : [rows]
        const conflictColumns = options?.onConflict?.split(',').map((column) => column.trim()) ?? []
        const storedRows = stub.tables[table] ?? []
        const results = list.map((row) => {
          const existing = conflictColumns.length
            ? storedRows.find((candidate) =>
                conflictColumns.every((column) => candidate[column] === row[column]))
            : undefined
          if (existing) {
            Object.assign(existing, row)
            return existing
          }
          const inserted = {
            ...row,
            id: row.id ?? `stub-${table}-${storedRows.length + 1}`,
          }
          storedRows.push(inserted)
          return inserted
        })
        stub.tables[table] = storedRows
        stub.upsertCalls.push({ table, rows: list, options })
        const upserted = {
          select: () => upserted,
          single: async () =>
            results.length === 1
              ? { data: results[0], error: null }
              : { data: null, error: { message: `expected 1 row, got ${results.length}` } },
          maybeSingle: async () => ({ data: results[0] ?? null, error: null }),
          then: <T>(resolve: (value: QueryResult) => T) => resolve({ data: results, error: null }),
        }
        return upserted
      },
    })
  }

  async rpc(fn: string, args?: Record<string, unknown>) {
    this.rpcCalls.push({ fn, args })
    return { data: this.rpcResults.get(fn) ?? null, error: null }
  }

  readonly auth = {
    getUser: async () => ({
      data: { user: makeStubUser(this.userId) },
      error: null,
    }),
  }
}

export function makeStubUser(id = 'user-1'): User {
  return {
    id,
    email: `${id}@test.local`,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00.000Z',
  } as User
}

/** Build a UserContext over in-memory tables for data-function tests. */
export function makeStubCtx(tables: TestTables, userId = 'user-1') {
  const stub = new TestSupabase(tables, userId)
  return {
    stub,
    ctx: { supabase: stub as unknown as DataClient, user: makeStubUser(userId) } satisfies UserContext,
  }
}

function compareValues(left: unknown, right: unknown) {
  if (left == null && right == null) return 0
  if (left == null) return -1
  if (right == null) return 1
  if (left < right) return -1
  if (left > right) return 1
  return 0
}
