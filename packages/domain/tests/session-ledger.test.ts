import { describe, expect, it } from 'vitest'
import {
  SESSION_LEDGER_COLUMNS,
  buildSessionLedgerRows,
  filterLedgerRows,
  sessionLedgerCsv,
  sessionLedgerTotals,
  weekOverWeekTotals,
} from '../src/history/session-ledger'
import type { LiftE1rmSeries, RecentHistoryEntry } from '../src/history/types'

const entry = (over: Partial<RecentHistoryEntry> & { id: string }): RecentHistoryEntry => ({
  title: 'Squat day',
  scheduledDate: '2026-08-03',
  completedAt: '2026-08-03T11:00:00.000Z',
  movementCount: 4,
  completedSetCount: 18,
  plannedSetCount: 19,
  tonnage: 8200,
  durationMinutes: null,
  estimatedMinutes: 75,
  ...over,
})

const point = (over: Partial<LiftE1rmSeries['points'][number]> = {}) => ({
  date: '2026-08-03',
  sessionId: 'a',
  e1rm: 150,
  load: 130,
  reps: 5,
  rir: 2,
  outlier: false,
  ...over,
})

const series = (points: ReturnType<typeof point>[], movementName = 'Squat'): LiftE1rmSeries[] => [
  { movementId: 'squat', movementName, points, repMaxBests: {} as LiftE1rmSeries['repMaxBests'] },
]

describe('buildSessionLedgerRows', () => {
  // The plan's estimate and the lifter's actual time are different facts.
  it('prefers the recorded duration and marks an estimate as one', () => {
    const [measured, estimated] = buildSessionLedgerRows({
      sessions: [entry({ id: 'a', durationMinutes: 63 }), entry({ id: 'b', durationMinutes: null })],
      liftSeries: null,
    })
    expect(measured).toMatchObject({ minutes: 63, minutesMeasured: true })
    expect(estimated).toMatchObject({ minutes: 75, minutesMeasured: false })
  })

  it('reports no top lift rather than zero when nothing tracked was trained', () => {
    const [row] = buildSessionLedgerRows({ sessions: [entry({ id: 'a' })], liftSeries: null })
    expect(row.topE1rm).toBeNull()
    expect(row.topE1rmMovement).toBeNull()
    expect(row.isPr).toBe(false)
  })

  it('takes the best e1RM of the session and names the lift it came from', () => {
    const [row] = buildSessionLedgerRows({
      sessions: [entry({ id: 'a' })],
      liftSeries: series([point({ sessionId: 'a', e1rm: 150 }), point({ sessionId: 'a', e1rm: 162.5 })]),
    })
    expect(row.topE1rm).toBe(162.5)
    expect(row.topE1rmMovement).toBe('Squat')
  })

  it('flags a personal best only when it beats every earlier session', () => {
    const rows = buildSessionLedgerRows({
      sessions: [entry({ id: 'a' }), entry({ id: 'b' }), entry({ id: 'c' })],
      liftSeries: series([
        point({ sessionId: 'a', e1rm: 150 }),
        point({ sessionId: 'b', e1rm: 160 }),
        point({ sessionId: 'c', e1rm: 155 }),
      ]),
    })
    expect(rows.map((row) => row.isPr)).toEqual([true, true, false])
  })

  // Matching a previous best is not beating it.
  it('does not call an equal result a new best', () => {
    const rows = buildSessionLedgerRows({
      sessions: [entry({ id: 'a' }), entry({ id: 'b' })],
      liftSeries: series([point({ sessionId: 'a', e1rm: 150 }), point({ sessionId: 'b', e1rm: 150 })]),
    })
    expect(rows.map((row) => row.isPr)).toEqual([true, false])
  })

  it('ignores a point the series flagged as an outlier', () => {
    const [row] = buildSessionLedgerRows({
      sessions: [entry({ id: 'a' })],
      liftSeries: series([point({ sessionId: 'a', e1rm: 400, outlier: true })]),
    })
    expect(row.topE1rm).toBeNull()
  })
})

describe('sessionLedgerTotals', () => {
  it('averages only the sessions that actually recorded a time', () => {
    const rows = buildSessionLedgerRows({
      sessions: [
        entry({ id: 'a', durationMinutes: 60 }),
        entry({ id: 'b', durationMinutes: 80 }),
        entry({ id: 'c', durationMinutes: null, estimatedMinutes: 200 }),
      ],
      liftSeries: null,
    })
    const totals = sessionLedgerTotals(rows)
    expect(totals.sessions).toBe(3)
    // 200 is a plan estimate and must not drag the average.
    expect(totals.averageMinutes).toBe(70)
    expect(totals.completedSets).toBe(54)
    expect(totals.tonnage).toBe(24600)
  })

  it('says nothing about average time when no session recorded one', () => {
    const rows = buildSessionLedgerRows({ sessions: [entry({ id: 'a' })], liftSeries: null })
    expect(sessionLedgerTotals(rows).averageMinutes).toBeNull()
  })
})

describe('weekOverWeekTotals', () => {
  // Mondays: 2026-08-03 and 2026-07-27. `now` sits inside the week of 2026-08-03.
  const NOW = '2026-08-05T10:00:00.000Z'

  it('compares this calendar week with the one before it, and says it is unfinished', () => {
    const rows = buildSessionLedgerRows({
      sessions: [
        entry({ id: 'a', scheduledDate: '2026-08-03', tonnage: 5000 }),
        entry({ id: 'b', scheduledDate: '2026-08-04', tonnage: 6900 }),
        entry({ id: 'c', scheduledDate: '2026-07-28', tonnage: 9000 }),
        entry({ id: 'd', scheduledDate: '2026-07-30', tonnage: 8000 }),
        entry({ id: 'e', scheduledDate: '2026-07-31', tonnage: 9300 }),
      ],
      liftSeries: null,
    })
    const comparison = weekOverWeekTotals(rows, NOW)
    expect(comparison).toMatchObject({
      current: { sessions: 2, tonnage: 11900 },
      previous: { sessions: 3, tonnage: 26300 },
      currentInProgress: true,
    })
  })

  // Array position is not calendar position: a rest week must read as zero, not be skipped over.
  it('reads a week with no sessions as zero rather than reaching further back', () => {
    const rows = buildSessionLedgerRows({
      sessions: [entry({ id: 'a', scheduledDate: '2026-08-03' }), entry({ id: 'b', scheduledDate: '2026-06-01' })],
      liftSeries: null,
    })
    expect(weekOverWeekTotals(rows, NOW)?.previous).toEqual({ sessions: 0, tonnage: 0 })
  })
})

describe('sessionLedgerCsv', () => {
  const rows = buildSessionLedgerRows({
    sessions: [entry({ id: 'a', title: 'Squat, bench "heavy"', durationMinutes: 63 })],
    liftSeries: series([point({ sessionId: 'a', e1rm: 162.5 })]),
  })

  it('escapes a title containing a comma and a quote', () => {
    const csv = sessionLedgerCsv(rows, 'full')
    expect(csv).toContain('"Squat, bench ""heavy"""')
    // One record, not three, despite the comma in the title.
    expect(csv.split('\r\n')).toHaveLength(2)
  })

  // Splitting on bare commas is exactly what the quoting protects against, so the test parses
  // fields the way a reader would rather than the way that happens to work on tidy data.
  const fields = (line: string) =>
    (line.match(/"(?:[^"]|"")*"/g) ?? []).map((cell) => cell.slice(1, -1).replace(/""/g, '"'))

  it('writes the header the mode actually shows, and a body that lines up with it', () => {
    for (const mode of ['guided', 'full'] as const) {
      const [header, body] = sessionLedgerCsv(rows, mode).split('\r\n')
      expect(fields(header)).toEqual([...SESSION_LEDGER_COLUMNS[mode]])
      expect(fields(body)).toHaveLength(SESSION_LEDGER_COLUMNS[mode].length)
      expect(fields(body)[1]).toBe('Squat, bench "heavy"')
    }
    expect(sessionLedgerCsv(rows, 'guided')).not.toContain('Top e1RM')
  })

  it('marks an estimated time so a reader does not take it as measured', () => {
    const estimated = buildSessionLedgerRows({
      sessions: [entry({ id: 'b', durationMinutes: null, estimatedMinutes: 75 })],
      liftSeries: null,
    })
    expect(sessionLedgerCsv(estimated, 'full')).toContain('"~75"')
    expect(sessionLedgerCsv(rows, 'full')).toContain('"63"')
  })
})

describe('filterLedgerRows', () => {
  const rows = buildSessionLedgerRows({
    sessions: [
      entry({ id: 'a', title: 'Squat day', programTitle: 'Wave', hardness: 'Hard' }),
      entry({ id: 'b', title: 'Bench day', programTitle: 'Wave', hardness: 'Medium' }),
      entry({ id: 'c', title: 'Random session', programTitle: null, isAdHoc: true }),
    ],
    liftSeries: series([point({ sessionId: 'b', e1rm: 150 })]),
  })

  it('narrows to personal bests, which only rows know about', () => {
    expect(filterLedgerRows(rows, 'pr', '').map((row) => row.id)).toEqual(['b'])
  })

  it('narrows to the active programme, and excludes ad-hoc work', () => {
    expect(filterLedgerRows(rows, 'programme', '', 'Wave').map((row) => row.id)).toEqual(['a', 'b'])
  })

  // With no active programme there is nothing to mean by "this programme".
  it('matches nothing rather than everything when no programme is active', () => {
    expect(filterLedgerRows(rows, 'programme', '', null)).toEqual([])
  })

  it('still searches titles and keeps the intensity chips working', () => {
    expect(filterLedgerRows(rows, 'all', 'bench').map((row) => row.id)).toEqual(['b'])
    expect(filterLedgerRows(rows, 'Hard', '').map((row) => row.id)).toEqual(['a'])
    expect(filterLedgerRows(rows, 'adhoc', '').map((row) => row.id)).toEqual(['c'])
  })
})
