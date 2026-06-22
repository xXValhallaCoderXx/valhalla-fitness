import { describe, expect, it } from 'vitest'
import {
  buildHistoryDashboard,
  calculateCompletedVolume,
  calculateCompletedVolumeInUnits,
  type HistorySessionInput,
} from '../src/lib/history'

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
})
