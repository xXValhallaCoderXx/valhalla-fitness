import { describe, expect, it } from 'vitest'
import { getMovementHistoryEntries } from '../src/domains/history/server/movement-history'
import type { SupabaseServerClient } from '../src/shared/server/supabase'

type TestRow = Record<string, unknown>
type TestTables = Record<string, TestRow[]>

type InCall = {
  table: string
  column: string
  values: string[]
}

class TestQuery {
  private readonly filters: Array<(row: TestRow) => boolean> = []
  private readonly orders: Array<{ column: string; ascending: boolean }> = []

  constructor(
    private readonly table: string,
    private readonly rows: TestRow[],
    private readonly inCalls: InCall[],
  ) {}

  select() {
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value)
    return this
  }

  not(column: string, operator: string, value: unknown) {
    if (operator !== 'is') throw new Error(`Unsupported test operator: ${operator}`)
    this.filters.push((row) => row[column] !== value)
    return this
  }

  in(column: string, values: readonly string[]) {
    const copiedValues = [...values]
    this.inCalls.push({ table: this.table, column, values: copiedValues })
    const accepted = new Set(copiedValues)
    this.filters.push((row) => accepted.has(String(row[column])))
    return this
  }

  order(column: string, options: { ascending: boolean }) {
    this.orders.push({ column, ascending: options.ascending })
    return this
  }

  async range(from: number, to: number) {
    const matchingRows = this.rows
      .filter((row) => this.filters.every((filter) => filter(row)))
      .sort((left, right) => {
        for (const order of this.orders) {
          const comparison = compareValues(left[order.column], right[order.column])
          if (comparison !== 0) return order.ascending ? comparison : -comparison
        }
        return 0
      })

    return {
      data: matchingRows.slice(from, to + 1),
      error: null,
    }
  }
}

class TestSupabase {
  readonly inCalls: InCall[] = []

  constructor(private readonly tables: TestTables) {}

  from(table: string) {
    return new TestQuery(table, this.tables[table] ?? [], this.inCalls)
  }
}

function compareValues(left: unknown, right: unknown) {
  if (left === right) return 0
  if (left === null || left === undefined) return -1
  if (right === null || right === undefined) return 1
  return String(left).localeCompare(String(right))
}

function session(
  id: string,
  scheduledDate: string,
  completedAt: string,
  equipmentMode?: 'standard' | 'free_weight',
): TestRow {
  return {
    id,
    user_id: 'user-1',
    planned_session_id: `planned-${id}`,
    status: 'completed',
    scheduled_date: scheduledDate,
    completed_at: completedAt,
    prescription_snapshot: {
      title: `Session ${id}`,
      units: 'kg',
      equipmentMode,
      movements: [],
    },
  }
}

function exercise(
  id: string,
  sessionId: string,
  plannedMovementId: string,
  performedMovementId: string,
): TestRow {
  return {
    id,
    user_id: 'user-1',
    session_id: sessionId,
    planned_movement_id: plannedMovementId,
    performed_movement_id: performedMovementId,
    role: 'main',
    target_summary: '3 x 5',
  }
}

function set(
  id: string,
  exerciseLogId: string,
  options: {
    completed?: boolean
    actualReps?: number | null
    setIndex?: number
  } = {},
): TestRow {
  return {
    id,
    user_id: 'user-1',
    exercise_log_id: exerciseLogId,
    set_index: options.setIndex ?? 0,
    target_load: 100,
    target_reps: 5,
    target_rep_min: null,
    target_rep_max: null,
    target_rir: null,
    actual_load: 100,
    actual_reps: options.actualReps === undefined ? 5 : options.actualReps,
    actual_rir: 2,
    completed: options.completed ?? true,
    is_top_set: false,
    is_amrap: false,
    is_backoff: false,
  }
}

function client(tables: TestTables) {
  const supabase = new TestSupabase(tables)
  return {
    supabase,
    client: supabase as unknown as SupabaseServerClient,
  }
}

describe('movement history server query', () => {
  it('selects literal performed movement matches instead of planned movement matches', async () => {
    const { client: supabase } = client({
      workout_sessions: [session('session-1', '2026-07-30', '2026-07-30T10:00:00Z', 'free_weight')],
      exercise_logs: [
        exercise('planned-only', 'session-1', 'squat', 'front_squat'),
        exercise('performed-match', 'session-1', 'front_squat', 'squat'),
      ],
      set_logs: [
        set('planned-only-set', 'planned-only'),
        set('performed-set', 'performed-match'),
      ],
    })

    const entries = await getMovementHistoryEntries(supabase, 'user-1', 'squat')

    expect(entries.map((entry) => entry.id)).toEqual(['performed-match'])
    expect(entries[0]).toMatchObject({
      plannedMovementId: 'front_squat',
      performedMovementId: 'squat',
      performedMovementName: 'Squat',
      equipmentMode: 'free_weight',
    })
  })

  it('includes only completed sets with actual reps and omits empty exercise entries', async () => {
    const { client: supabase } = client({
      workout_sessions: [session('session-1', '2026-07-30', '2026-07-30T10:00:00Z')],
      exercise_logs: [
        exercise('with-completed-set', 'session-1', 'squat', 'squat'),
        exercise('without-completed-set', 'session-1', 'squat', 'squat'),
      ],
      set_logs: [
        set('completed', 'with-completed-set', { actualReps: 5 }),
        set('unchecked', 'with-completed-set', { completed: false, actualReps: 8, setIndex: 1 }),
        set('missing-reps', 'with-completed-set', { actualReps: null, setIndex: 2 }),
        set('empty-exercise-set', 'without-completed-set', { completed: false }),
      ],
    })

    const entries = await getMovementHistoryEntries(supabase, 'user-1', 'squat')

    expect(entries.map((entry) => entry.id)).toEqual(['with-completed-set'])
    expect(entries[0]?.sets.map((row) => row.id)).toEqual(['completed'])
  })

  it('continues beyond a full 100-session page of irrelevant rows', async () => {
    const irrelevantSessions = Array.from({ length: 100 }, (_, index) =>
      session(
        `newer-${String(index).padStart(3, '0')}`,
        '2026-07-30',
        `2026-07-30T${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}:00Z`,
      ),
    )
    const irrelevantExercises = irrelevantSessions.map((row, index) =>
      exercise(`unchecked-${index}`, String(row.id), 'squat', 'squat'),
    )
    const relevantSession = session('older-relevant', '2026-07-29', '2026-07-29T10:00:00Z')
    const { client: supabase } = client({
      workout_sessions: [...irrelevantSessions, relevantSession],
      exercise_logs: [
        ...irrelevantExercises,
        exercise('older-completed', 'older-relevant', 'squat', 'squat'),
      ],
      set_logs: [
        ...irrelevantExercises.map((row, index) =>
          set(`unchecked-set-${index}`, String(row.id), { completed: false }),
        ),
        set('older-completed-set', 'older-completed'),
      ],
    })

    const entries = await getMovementHistoryEntries(supabase, 'user-1', 'squat')

    expect(entries.map((entry) => entry.id)).toEqual(['older-completed'])
  })

  it('orders cross-date workouts by scheduled date before completion timestamp', async () => {
    const { client: supabase } = client({
      workout_sessions: [
        session('scheduled-later', '2026-07-30', '2026-07-30T08:00:00Z'),
        session('completed-later', '2026-07-29', '2026-07-31T08:00:00Z'),
      ],
      exercise_logs: [
        exercise('scheduled-later-exercise', 'scheduled-later', 'squat', 'squat'),
        exercise('completed-later-exercise', 'completed-later', 'squat', 'squat'),
      ],
      set_logs: [
        set('scheduled-later-set', 'scheduled-later-exercise'),
        set('completed-later-set', 'completed-later-exercise'),
      ],
    })

    const entries = await getMovementHistoryEntries(supabase, 'user-1', 'squat')

    expect(entries.map((entry) => entry.id)).toEqual([
      'scheduled-later-exercise',
      'completed-later-exercise',
    ])
  })

  it('chunks large exercise-id filters before reading set logs', async () => {
    const exercises = Array.from({ length: 205 }, (_, index) =>
      exercise(`exercise-${String(index).padStart(3, '0')}`, 'session-1', 'squat', 'squat'),
    )
    const { client: supabase, supabase: testClient } = client({
      workout_sessions: [session('session-1', '2026-07-30', '2026-07-30T10:00:00Z')],
      exercise_logs: exercises,
      set_logs: exercises.map((row, index) => set(`set-${index}`, String(row.id))),
    })

    const entries = await getMovementHistoryEntries(supabase, 'user-1', 'squat')

    expect(entries).toHaveLength(12)
    expect(
      testClient.inCalls
        .filter((call) => call.table === 'set_logs' && call.column === 'exercise_log_id')
        .map((call) => call.values.length),
    ).toEqual([100, 100, 5])
  })
})
