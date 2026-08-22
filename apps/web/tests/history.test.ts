import { describe, expect, it } from 'vitest'
import {
  buildHistoryDashboard,
  calculateCompletedVolume,
  calculateCompletedVolumeInUnits,
  type HistorySessionInput,
} from '../src/domains/history/lib/history'

const sessions: HistorySessionInput[] = [
  {
    id: 'session-2',
    plannedSessionId: 'bench-w1',
    title: 'Bench Day',
    programTitle: 'Test Program',
    scheduledDate: '2026-06-22',
    completedAt: '2026-06-22T12:00:00.000Z',
    units: 'kg',
    weekLabel: 'Week 1',
    hardness: 'Medium',
    equipmentMode: 'free_weight',
    estimatedMinutes: 60,
    movementCount: 2,
    plannedSetCount: 4,
    exercises: [
      {
        id: 'exercise-1',
        plannedMovementId: 'bench_press',
        performedMovementId: 'bench_press',
        performedMovementName: 'Bench Press',
        role: 'main',
        targetSummary: 'Top set',
        sets: [
          {
            id: 'set-1',
            setIndex: 1,
            actualLoad: 100,
            actualReps: 5,
            actualRir: 2,
            completed: true,
            isTopSet: true,
            isAmrap: true,
            isBackoff: false,
          },
          {
            id: 'set-2',
            setIndex: 2,
            actualLoad: 80,
            actualReps: 5,
            completed: false,
            isTopSet: false,
            isAmrap: false,
            isBackoff: true,
          },
        ],
      },
      {
        id: 'exercise-2',
        plannedMovementId: 'lat_pulldown',
        performedMovementId: 'pull_up',
        performedMovementName: 'Pull-Up',
        role: 'accessory',
        targetSummary: '3x8-12',
        sets: [
          {
            id: 'set-3',
            setIndex: 1,
            actualLoad: null,
            actualReps: 10,
            completed: true,
            isTopSet: false,
            isAmrap: false,
            isBackoff: false,
          },
        ],
      },
    ],
  },
  {
    id: 'session-1',
    plannedSessionId: 'squat-w1',
    title: 'Squat Day',
    scheduledDate: '2026-06-15',
    completedAt: '2026-06-15T12:00:00.000Z',
    units: 'kg',
    movementCount: 1,
    plannedSetCount: 1,
    exercises: [
      {
        id: 'exercise-3',
        plannedMovementId: 'squat',
        performedMovementId: 'squat',
        performedMovementName: 'Squat',
        role: 'main',
        sets: [
          {
            id: 'set-4',
            setIndex: 1,
            actualLoad: 140,
            actualReps: 3,
            actualRir: 1,
            completed: true,
            isTopSet: true,
            isAmrap: false,
            isBackoff: false,
          },
        ],
      },
    ],
  },
]

describe('history aggregation', () => {
  it('counts completed volume only when completed load and reps exist', () => {
    expect(
      calculateCompletedVolume([
        { completed: true, actualLoad: 100, actualReps: 5 },
        { completed: true, actualLoad: 0, actualReps: 12 },
        { completed: true, actualLoad: -10, actualReps: 12 },
        { completed: true, actualLoad: null, actualReps: 10 },
        { completed: false, actualLoad: 80, actualReps: 5 },
      ]),
    ).toBe(500)
  })

  it('normalizes mixed session units before summing dashboard volume', () => {
    const dashboard = buildHistoryDashboard({
      sessions: [
        sessions[0],
        {
          ...sessions[1],
          units: 'lb',
          exercises: [
            {
              ...sessions[1].exercises[0],
              sets: [
                {
                  ...sessions[1].exercises[0].sets[0],
                  actualLoad: 220.462262185,
                  actualReps: 1,
                },
              ],
            },
          ],
        },
      ],
      substitutions: [],
      now: new Date('2026-06-22T12:00:00.000Z'),
    })

    expect(calculateCompletedVolumeInUnits([{ completed: true, actualLoad: 220.462262185, actualReps: 1 }], 'lb', 'kg')).toBeCloseTo(100)
    expect(dashboard.overview.units).toBe('kg')
    expect(dashboard.overview.completedVolume).toBeCloseTo(600)
  })

  it('preserves equipment mode in recent completed-session read models', () => {
    const dashboard = buildHistoryDashboard({
      sessions,
      substitutions: [],
      now: new Date('2026-06-22T12:00:00.000Z'),
    })

    expect(dashboard.recentSessions[0]?.equipmentMode).toBe('free_weight')
    expect(dashboard.recentSessions[1]?.equipmentMode).toBeUndefined()
  })

  it('normalizes mixed session units before ranking best sets', () => {
    const bench = sessions[0].exercises[0]
    const kgSession: HistorySessionInput = {
      ...sessions[0],
      id: 'session-kg',
      scheduledDate: '2026-06-22',
      completedAt: '2026-06-22T12:00:00.000Z',
      units: 'kg',
      movementCount: 1,
      plannedSetCount: 1,
      exercises: [{
        ...bench,
        sets: [{
          ...bench.sets[0],
          id: 'set-kg',
          actualLoad: 100,
          actualReps: 1,
          actualRir: 0,
        }],
      }],
    }
    const lbSession: HistorySessionInput = {
      ...kgSession,
      id: 'session-lb',
      scheduledDate: '2026-06-15',
      completedAt: '2026-06-15T12:00:00.000Z',
      units: 'lb',
      exercises: [{
        ...bench,
        sets: [{
          ...bench.sets[0],
          id: 'set-lb',
          actualLoad: 180,
          actualReps: 1,
          actualRir: 0,
        }],
      }],
    }

    const dashboard = buildHistoryDashboard({
      sessions: [lbSession, kgSession],
      substitutions: [],
      now: new Date('2026-06-22T12:00:00.000Z'),
    })

    expect(dashboard.overview.units).toBe('kg')
    expect(dashboard.bestSets[0]).toMatchObject({
      id: 'set-kg',
      sessionId: 'session-kg',
      load: 100,
      units: 'kg',
    })
    expect(dashboard.movementSummaries[0].bestSet?.id).toBe('set-kg')
  })

  it('orders same-day history by completion time, then stable ids', () => {
    const bench = sessions[0].exercises[0]
    const sameDaySession = (id: string, completedAt: string): HistorySessionInput => ({
      ...sessions[0],
      id,
      title: id,
      scheduledDate: '2026-06-22',
      completedAt,
      movementCount: 1,
      plannedSetCount: 1,
      exercises: [{
        ...bench,
        sets: [{
          ...bench.sets[0],
          id: `${id}-set`,
          actualLoad: 100,
          actualReps: 1,
          actualRir: 0,
        }],
      }],
    })
    const oldest = sameDaySession('session-a', '2026-06-22T08:00:00.000Z')
    const tiedEarlierId = sameDaySession('session-b', '2026-06-22T12:00:00.000Z')
    const tiedLaterId = sameDaySession('session-c', '2026-06-22T12:00:00.000Z')

    const dashboard = buildHistoryDashboard({
      sessions: [tiedEarlierId, oldest, tiedLaterId],
      substitutions: [
        {
          id: 'sub-a',
          sessionId: oldest.id,
          plannedMovementId: 'lat_pulldown',
          performedMovementId: 'pull_up',
          reason: 'crowded_gym',
        },
        {
          id: 'sub-b',
          sessionId: tiedEarlierId.id,
          plannedMovementId: 'lat_pulldown',
          performedMovementId: 'pull_up',
          reason: 'crowded_gym',
        },
        {
          id: 'sub-c',
          sessionId: tiedLaterId.id,
          plannedMovementId: 'lat_pulldown',
          performedMovementId: 'pull_up',
          reason: 'crowded_gym',
        },
      ],
      now: new Date('2026-06-22T12:00:00.000Z'),
    })

    expect(dashboard.recentSessions.map((session) => session.id)).toEqual([
      'session-c',
      'session-b',
      'session-a',
    ])
    expect(dashboard.bestSets[0].sessionId).toBe('session-c')
    expect(dashboard.substitutions.map((substitution) => substitution.id)).toEqual([
      'sub-c',
      'sub-b',
      'sub-a',
    ])
  })

  it('builds overview, records, movements, substitutions, and weekly volume', () => {
    const dashboard = buildHistoryDashboard({
      sessions,
      substitutions: [
        {
          id: 'sub-1',
          sessionId: 'session-2',
          plannedMovementId: 'lat_pulldown',
          performedMovementId: 'pull_up',
          reason: 'crowded_gym',
        },
      ],
      now: new Date('2026-06-22T12:00:00.000Z'),
    })

    expect(dashboard.overview).toMatchObject({
      completedSessions: 2,
      loggedSets: 3,
      completedVolume: 920,
      uniqueMovements: 3,
    })
    expect(dashboard.bestSets[0]?.movementId).toBe('squat')
    expect(dashboard.movementSummaries.find((movement) => movement.movementId === 'pull_up')?.substitutionCount).toBe(1)
    expect(dashboard.substitutions[0]).toMatchObject({
      plannedMovementName: 'Lat Pulldown',
      performedMovementName: 'Pull-Up',
    })
    expect(dashboard.weeklyVolume).toHaveLength(2)
  })

  it('uses the scheduled workout date when completion crosses a calendar boundary', () => {
    const overnight = {
      ...sessions[0],
      scheduledDate: '2026-06-21',
      completedAt: '2026-06-22T00:30:00.000Z',
    }
    const dashboard = buildHistoryDashboard({
      sessions: [overnight],
      substitutions: [{
        id: 'sub-overnight',
        sessionId: overnight.id,
        plannedMovementId: 'lat_pulldown',
        performedMovementId: 'pull_up',
        reason: 'crowded_gym',
      }],
      now: new Date('2026-06-22T00:00:00.000Z'),
    })

    expect(dashboard.overview.latestTrainingDate).toBe('2026-06-21')
    expect(dashboard.bestSets.every((set) => set.performedAt === '2026-06-21')).toBe(true)
    expect(dashboard.movementSummaries.every((movement) => movement.lastPerformedAt === '2026-06-21')).toBe(true)
    expect(dashboard.substitutions[0].performedAt).toBe('2026-06-21')
    expect(dashboard.weeklyVolume[0].weekStart).toBe('2026-06-15')
  })

  it('ranks bodyweight records by reps without deriving load, volume, or e1RM', () => {
    const pullUp = sessions[0].exercises[1]
    const dashboard = buildHistoryDashboard({
      sessions: [{
        ...sessions[0],
        exercises: [{
          ...pullUp,
          sets: [
            { ...pullUp.sets[0], id: 'bw-null', actualLoad: null, actualReps: 10 },
            { ...pullUp.sets[0], id: 'bw-zero', actualLoad: 0, actualReps: 12 },
          ],
        }],
      }],
      substitutions: [],
      now: new Date('2026-06-22T12:00:00.000Z'),
    })

    expect(dashboard.overview.completedVolume).toBe(0)
    expect(dashboard.bestSets[0]).toMatchObject({
      id: 'bw-zero',
      movementId: 'pull_up',
      load: null,
      reps: 12,
      volume: null,
      e1rm: null,
    })
  })

  it('keeps explicitly weighted bodyweight records loaded', () => {
    const pullUp = sessions[0].exercises[1]
    const dashboard = buildHistoryDashboard({
      sessions: [{
        ...sessions[0],
        exercises: [{
          ...pullUp,
          sets: [{ ...pullUp.sets[0], actualLoad: 10, actualReps: 8 }],
        }],
      }],
      substitutions: [],
      now: new Date('2026-06-22T12:00:00.000Z'),
    })

    expect(dashboard.overview.completedVolume).toBe(80)
    expect(dashboard.bestSets[0]).toMatchObject({
      movementId: 'pull_up',
      load: 10,
      reps: 8,
      volume: 80,
    })
    expect(dashboard.bestSets[0]?.e1rm).toBeGreaterThan(0)
  })
})
