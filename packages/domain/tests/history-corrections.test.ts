import { describe, expect, it } from 'vitest'
import { buildHistoryDashboard, rankBestSets, type HistorySessionInput } from '../src/history/history'
import { buildHistoryInsights } from '../src/history/build-insights'
import { assessHistorySets, assessmentKey } from '../src/history/set-assessment'
import { buildLiftE1rmSeries } from '../src/history/strength'
import { sortMovementSummaries } from '../src/history/insights'
import { resolveInsightGates } from '../src/history/insight-gates'
import { buildSessionLedgerRows, sessionsSubtitle } from '../src/history/session-ledger'
import { formatHistoryVolume } from '../src/history/insight-format'
import { selectSessionPage, workoutCompletion, recentWorkoutDates, type SessionBrowserState } from '../src/history/session-browser'
import { buildMovementBalance, buildRegionAdequacy, calendarRegionWeeks } from '../src/history/muscle-volume'
import { LB_PER_KG } from '../src/shared/math'

const today = '2026-09-28'
function workout(id: string, date: string, loads = [100], movement = 'squat', units: 'kg' | 'lb' | null = 'kg'): HistorySessionInput {
  return { id, title: id, scheduledDate: date, units, plannedSessionId: null, movementCount: 1, plannedSetCount: loads.length,
    exercises: [{ id: `${id}-exercise`, plannedMovementId: movement, performedMovementId: movement, performedMovementName: movement,
      role: 'main', sets: loads.map((load, index) => ({ id: `${id}-${index}`, setIndex: index + 1, actualLoad: load, actualReps: 5, actualRir: 0, completed: true })) }] }
}
function dashboard(sessions: HistorySessionInput[], units: 'kg' | 'lb' = 'kg') {
  const data = buildHistoryDashboard({ sessions, substitutions: [], displayUnits: units, recentSessionLimit: null, bestSetLimit: null })
  return { ...data, insights: buildHistoryInsights({ sessions, overview: data.overview, bodyweightEntries: [], sex: null,
    accountUnits: units, now: `${today}T12:00:00Z`, today }) }
}

const all: SessionBrowserState = { query: '', intensity: 'all', completion: 'all', date: null, page: 0 }

describe('shared Insights corrections', () => {
  it('normalizes sorting and aggregates while literal kg/lb sets survive account changes', () => {
    const sessions = [workout('old', '2026-08-01', [150]), workout('new', '2026-09-01', [200], 'bench_press', 'lb')]
    const kg = dashboard(sessions)
    const lb = dashboard(sessions, 'lb')
    expect(sortMovementSummaries(lb.movementSummaries, 'e1rm', 'desc').map(row => row.movementId)).toEqual(['squat', 'bench_press'])
    expect(kg.bestSets[0]).toMatchObject({ load: 150, units: 'kg' })
    expect(lb.bestSets).toEqual(kg.bestSets)
    expect(lb.overview.completedVolume).toBeCloseTo(kg.overview.completedVolume * LB_PER_KG)
    expect(lb.insights.weeklyVolume[0].volume).toBeCloseTo(kg.insights.weeklyVolume[0].volume * LB_PER_KG)
    expect(lb.insights.liftSeries[0].points[0].e1rm).toBeCloseTo(kg.insights.liftSeries[0].points[0].e1rm * LB_PER_KG, 0)
  })

  it('uses the newest explicit historical unit for missing units, independent of array order and profile', () => {
    const sessions = [workout('missing', '2026-09-20', [230], 'squat', null), workout('oldkg', '2026-08-01', [100]), workout('lb', '2026-09-01', [200], 'bench_press', 'lb')]
    const kg = dashboard(sessions)
    const lb = dashboard([...sessions].reverse(), 'lb')
    expect(kg.bestSets.find(set => set.movementId === 'squat')).toMatchObject({ load: 230, units: 'lb' })
    expect(lb.bestSets).toEqual(kg.bestSets)
    expect(lb.insights.weeklyMovements.at(-1)?.volume).toBe(1150)
    expect(kg.insights.weeklyMovements.at(-1)?.volume).toBeCloseTo(1150 / LB_PER_KG)
    expect(dashboard([workout('unknown', today, [100], 'squat', null)], 'lb').bestSets[0].units).toBe('kg')
  })

  it('retains more than 40 movements and opts into every best while preserving the default 12', () => {
    const sessions = Array.from({ length: 45 }, (_, i) => workout(`s${i}`, today, [50], `movement-${i}`))
    const complete = dashboard(sessions)
    expect(complete.overview.uniqueMovements).toBe(45)
    expect(complete.movementSummaries).toHaveLength(45)
    expect(complete.bestSets).toHaveLength(45)
    expect(buildHistoryDashboard({ sessions, substitutions: [] }).bestSets).toHaveLength(12)
  })

  it('assesses sets against a fixed workout threshold and retains accepted lower work', () => {
    const sessions = [workout('a', '2026-08-01'), workout('b', '2026-08-08'), workout('c', '2026-08-15'),
      workout('mixed', '2026-08-22', [400, 110, 150, 151]), workout('flagged', today, [500])]
    const source = JSON.stringify(sessions)
    const assessments = assessHistorySets(sessions)
    const values = sessions[3].exercises[0].sets.map(set => assessments.get(assessmentKey('mixed', 'mixed-exercise', set.id)))
    expect(values.map(value => value?.unusual)).toEqual([true, false, false, true])
    expect(new Set(values.map(value => value?.thresholdKg)).size).toBe(1)
    expect(rankBestSets(sessions)[0]).toMatchObject({ id: 'mixed-2', load: 150, isBaseline: false, exerciseId: 'mixed-exercise' })
    const lift = buildLiftE1rmSeries(sessions)[0]
    expect(lift.points[3]).toMatchObject({ load: 150, outlier: false, setId: 'mixed-2' })
    expect(lift.points[4]).toMatchObject({ load: 500, outlier: true, setId: 'flagged-0' })
    expect(lift.repMaxBests.fiveRm?.load).toBe(150)
    expect(JSON.stringify(sessions)).toBe(source)
  })

  it('does not let multiple exercise rows in one workout advance its baseline', () => {
    const first = workout('a', '2026-08-01')
    first.exercises.push({ ...first.exercises[0], id: 'other', sets: [{ ...first.exercises[0].sets[0], id: 'other-set', actualLoad: 101 }] })
    const sessions = [first, workout('b', '2026-08-08'), workout('c', '2026-08-15'), workout('d', today, [400])]
    const assessment = assessHistorySets(sessions).get(assessmentKey('d', 'd-exercise', 'd-0'))
    expect(assessment).toMatchObject({ priorObservations: 3, unusual: true })
  })

  it('keeps high-rep and bodyweight best-set eligibility separate from strength eligibility', () => {
    const high = workout('high', today, [80], 'bench_press')
    high.exercises[0].sets[0].actualReps = 20
    const bw = workout('bw', today, [0], 'pull_up')
    bw.exercises[0].sets[0].actualReps = 25
    const data = dashboard([high, bw])
    expect(data.bestSets.map(set => set.reps)).toEqual([20, 25])
    expect(data.bestSets.every(set => set.isBaseline)).toBe(true)
    expect(data.insights.liftSeries).toHaveLength(0)
  })

  it('unlocks a qualifying lift despite another lift having more insufficient points', () => {
    const qualifying = ['2026-08-01', '2026-08-08', '2026-08-15', '2026-08-22'].map((date, i) => workout(`q${i}`, date))
    const cramped = Array.from({ length: 8 }, (_, i) => workout(`c${i}`, today, [60], 'bench_press'))
    const insights = dashboard([...qualifying, ...cramped]).insights
    expect(resolveInsightGates(insights).strength_trend).toMatchObject({ unlocked: true, progress: { current: 4 } })
    const dirty = dashboard([workout('one', '2026-08-01'), workout('two', '2026-08-02'), workout('three', '2026-08-03'), workout('bad', today, [400])]).insights
    expect(resolveInsightGates(dirty).strength_trend).toMatchObject({ unlocked: false, progress: { current: 3 } })
  })

  it('unlocks a total without bodyweight and preserves the fallback chain', () => {
    const sessions = ['squat', 'bench_press', 'deadlift'].map((lift, i) => workout(String(i), today, [100], lift))
    const data = dashboard(sessions)
    expect(data.insights.strengthScore.kind).toBe('total')
    expect(resolveInsightGates(data.insights).strength_score.unlocked).toBe(true)
    for (const [sex, expected] of [[null, 'bw_multiple'], ['female', 'dots']] as const) {
      const insights = buildHistoryInsights({ sessions, overview: data.overview, bodyweightEntries: [{ id: 'bw', recordedOn: today, weightKg: 80 }], sex, now: `${today}T12:00:00Z`, today })
      expect(insights.strengthScore.kind).toBe(expected)
    }
  })

  it('preserves an earned PR when a stronger non-PR lift becomes the headline, in either lift order', () => {
    const sessions = [workout('before', '2026-08-01'), workout('after', today, [110])]
    for (const session of sessions) session.exercises.push(workout(session.id, session.scheduledDate, [200], 'deadlift').exercises[0])
    const data = dashboard(sessions)
    for (const series of [data.insights.liftSeries, [...data.insights.liftSeries].reverse()]) {
      const rows = buildSessionLedgerRows({ sessions: data.recentSessions, liftSeries: series })
      expect(rows.find(row => row.id === 'after')).toMatchObject({ isPr: true, topE1rmMovement: 'Deadlift' })
      expect(rows.find(row => row.id === 'before')?.isPr).toBe(false)
    }
  })

  it('never calls pounds tonnes', () => {
    expect(formatHistoryVolume(20000, 'lb')).toBe('20,000 lb')
    expect(formatHistoryVolume(20000, 'kg')).toBe('20.0 t')
    expect(sessionsSubtitle({ sessions: 1, completedSets: 1, plannedSets: 1, tonnage: 20000, averageMinutes: null, prCount: 0 }, 'full', 'lb')).toContain('20,000 lb moved')
  })
})

describe('loaded workout browsing and calendar windows', () => {
  const sessions = Array.from({ length: 240 }, (_, index) => workout(`workout-${index}`, new Date(Date.parse(today) - index * 86400000).toISOString().slice(0, 10)))
  const rows = dashboard(sessions).recentSessions
  it('exposes rows beyond 20 and 60, retaining the old caller default', () => {
    expect(rows).toHaveLength(240)
    expect(buildHistoryDashboard({ sessions, substitutions: [] }).recentSessions).toHaveLength(60)
    expect(selectSessionPage(rows, { ...all, page: 3 }, 'all', today).rows[0].id).toBe('workout-60')
    expect(selectSessionPage(rows, { ...all, query: 'workout-239', page: 8 }, 'all', today)).toMatchObject({ total: 1, page: 0 })
    expect(selectSessionPage(rows, { ...all, query: 'workout-239' }, '8w', today).total).toBe(0)
  })
  it('applies completion, intensity, search and dates before pagination', () => {
    const edited = rows.map(row => row.id === 'workout-239' ? { ...row, title: 'Boundary workout', hardness: 'Hard' as const, recordedSetCount: 2, completedSetCount: 1 } : row)
    const page = selectSessionPage(edited, { ...all, query: 'Boundary', intensity: 'Hard', completion: 'cut_short', date: rows[239].scheduledDate }, 'all', today)
    expect(page.rows.map(row => row.id)).toEqual(['workout-239'])
    const dates = recentWorkoutDates(rows, today)
    expect(dates).toHaveLength(14)
    expect(dates[0].date).toBe('2026-09-15')
    expect(dates.at(-1)).toEqual({ date: today, count: 1 })
  })
  it('uses recorded counts for partial and ad-hoc workouts while retaining legacy/empty rows neutrally', () => {
    const base = rows[0]
    expect(workoutCompletion({ ...base, completedSetCount: 1, recordedSetCount: 1, plannedSetCount: 20, isAdHoc: true })).toBe('finished')
    expect(workoutCompletion({ ...base, completedSetCount: 1, recordedSetCount: 3, plannedSetCount: 1 })).toBe('cut_short')
    expect(workoutCompletion({ ...base, recordedSetCount: undefined })).toBe('unknown')
    expect(workoutCompletion({ ...base, completedSetCount: 0, recordedSetCount: 0 })).toBe('empty')
  })
  it('uses four calendar weeks, zero weeks and incomplete current week rather than four trained buckets', () => {
    const weeks = [{ weekStart: '2026-01-05', weekLabel: 'Jan 5', regionSets: { chest: 100 }, totalSets: 100 },
      { weekStart: '2026-09-21', weekLabel: 'Sep 21', regionSets: { chest: 12 }, totalSets: 12 },
      { weekStart: '2026-10-05', weekLabel: 'Oct 5', regionSets: { chest: 999 }, totalSets: 999 }]
    const recent = calendarRegionWeeks(weeks, today)
    expect(recent.map(week => week.totalSets)).toEqual([0, 0, 12, 0])
    expect(buildMovementBalance(recent, null).signal).toBe('insufficient')
    expect(buildRegionAdequacy(weeks, today).regions.find(region => region.regionId === 'chest')?.weeklySets).toBe(3)
  })
})
