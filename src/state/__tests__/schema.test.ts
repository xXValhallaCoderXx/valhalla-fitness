import { describe, expect, it } from 'vitest'
import { parseState } from '../schema'

describe('state schema migration', () => {
  it('migrates v1 accessory logs into slot/exercise logs', () => {
    const migrated = parseState({
      schemaVersion: 1,
      updatedAt: '2026-06-18T00:00:00.000Z',
      onboarded: true,
      config: {
        units: 'kg',
        roundingKg: 2.5,
        tmPct: { squat: 0.85, bench: 0.8, deadlift: 0.85 },
        startDate: '2026-06-18',
      },
      lifts: {
        squat: { trainingMax: 150, history: [], consecutiveHoldOrReset: 0 },
        bench: { trainingMax: 100, history: [], consecutiveHoldOrReset: 0 },
        deadlift: { trainingMax: 190, history: [], consecutiveHoldOrReset: 0 },
      },
      cyclePointer: { cycleIndex: 0, weekIndex: 0 },
      sessionLogs: [
        {
          id: 'one',
          date: '2026-06-18',
          cycleIndex: 0,
          weekIndex: 0,
          weekName: '5s',
          lift: 'squat',
          sessionType: 'squat',
          mainSets: [],
          fslSets: [],
          accessories: [{ accessoryId: 'leg-press', weight: 100, sets: [{ reps: 12, rir: 2 }] }],
          barSpeedFast: true,
        },
      ],
      accessoryProgress: {
        'leg-press': { accessoryId: 'leg-press', currentWeight: 100, lastUpdated: '2026-06-18' },
      },
      mobility: { log: {}, currentStreakDays: 0, longestStreakDays: 0 },
      metrics: [],
    })

    expect(migrated?.schemaVersion).toBe(2)
    expect(migrated?.sessionLogs[0].accessories[0]).toMatchObject({
      slotId: 'squat-quad',
      exerciseId: 'leg-press',
      plannedExerciseId: 'leg-press',
    })
    expect(migrated?.exerciseLibrary['leg-press'].name).toBe('Leg press')
  })
})
