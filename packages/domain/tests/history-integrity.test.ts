import { describe, expect, it } from 'vitest'
import { buildHistoryDashboard, type HistorySessionInput } from '../src/history/history'
import { filterMovements, sortMovementSummaries } from '../src/history/insights'
import { buildLiftE1rmSeries } from '../src/history/strength'

function session(id: string, movement: string, load: number, units: 'kg' | 'lb' = 'kg'): HistorySessionInput {
  return {
    id, plannedSessionId: null, title: movement, scheduledDate: `2026-09-${id.padStart(2, '0')}`,
    movementCount: 1, plannedSetCount: 1, units,
    exercises: [{
      id: `exercise-${id}`, plannedMovementId: movement, performedMovementId: movement,
      performedMovementName: movement, role: 'main', sets: [{
        id: `set-${id}`, setIndex: 1, completed: true, actualLoad: load, actualReps: 5,
        actualRir: 2, isTopSet: true, isAmrap: false, isBackoff: false,
      }],
    }],
  }
}

describe('history presentation integrity', () => {
  it('retains original best-set units and compares movement records in a common unit', () => {
    const data = buildHistoryDashboard({
      sessions: [session('1', 'squat', 150), session('2', 'bench_press', 200, 'lb'), session('3', 'squat', 200, 'lb')],
      substitutions: [],
    })
    const ordered = sortMovementSummaries(data.movementSummaries, 'e1rm', 'desc')
    expect(ordered.map((row) => row.movementId)).toEqual(['squat', 'bench_press'])
    expect(ordered[0].bestSet).toMatchObject({ load: 150, units: 'kg' })
  })

  it('counts and exposes every distinct completed movement beyond forty', () => {
    const source = session('1', 'squat', 100)
    source.exercises = Array.from({ length: 45 }, (_, index) => ({
      ...source.exercises[0], id: `exercise-${index}`, performedMovementId: `movement-${index}`,
      performedMovementName: `Exercise ${index}`, plannedMovementId: `movement-${index}`,
    }))
    const data = buildHistoryDashboard({ sessions: [source], substitutions: [] })
    expect(data.overview.uniqueMovements).toBe(45)
    expect(filterMovements(data.movementSummaries, 'Exercise 44', null)).toHaveLength(1)
  })

  it('carries the resolved legacy unit into record labels and movement sorting', () => {
    const legacy = { ...session('1', 'squat', 200), units: null }
    const data = buildHistoryDashboard({
      sessions: [legacy, session('2', 'bench_press', 225, 'lb')], substitutions: [],
    })
    expect(sortMovementSummaries(data.movementSummaries, 'e1rm', 'desc').map((row) => row.movementId))
      .toEqual(['bench_press', 'squat'])
    expect(data.bestSets.find((set) => set.movementId === 'squat')).toMatchObject({ load: 200, units: 'lb' })
    expect(legacy.units).toBeNull()
  })

  it('excludes the same flagged lift sessions from derived records and strength without altering logs', () => {
    const source = Array.from({ length: 6 }, (_, index) => session(String(index + 1), 'squat', 100))
    source.push(session('7', 'squat', 400))
    const before = structuredClone(source)
    const series = buildLiftE1rmSeries(source)[0]
    expect(series.points.at(-1)?.outlier).toBe(true)
    const data = buildHistoryDashboard({ sessions: source, substitutions: [] })
    expect(data.bestSets[0].load).toBe(100)
    expect(data.movementSummaries[0].bestSet?.load).toBe(100)
    expect(data.recentSessions[0].id).toBe('7')
    expect(data.overview.loggedSets).toBe(7)
    expect(source).toEqual(before)
  })
})
