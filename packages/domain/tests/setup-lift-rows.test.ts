import { describe, expect, it } from 'vitest'
import {
  buildSetupLiftRows,
  convertSetupStateValues,
  resolveSetupLiftAnchor,
  roundingForUnit,
  setupOneRepMaxResolver,
} from '../src/program/setup-lift-rows'
import { buildProgramStartStateValues } from '../src/program/program-loads'
import { mround } from '../src/program/progression'
import type { LiftE1rmSeries } from '../src/history/types'
import type { ProgramStateInput } from '../src/program/types'

const point = (over: Partial<LiftE1rmSeries['points'][number]> = {}) => ({
  date: '2026-08-02',
  sessionId: 'session-1',
  e1rm: 150,
  load: 130,
  reps: 5,
  rir: 2,
  outlier: false,
  ...over,
})

const series = (points: ReturnType<typeof point>[]): LiftE1rmSeries[] => [
  { movementId: 'squat', movementName: 'Squat', points, repMaxBests: {} as LiftE1rmSeries['repMaxBests'] },
]

const DEFAULTS = { squat_one_rep_max: 140, bench_press_one_rep_max: 100 }

const state = (over: Partial<ProgramStateInput> = {}): ProgramStateInput => ({
  key: 'squat_training_max',
  movementId: 'squat',
  type: 'training_max',
  label: 'Squat',
  value: null,
  ...over,
})

describe('resolveSetupLiftAnchor', () => {
  it('prefers the best logged set over the saved estimate, and says which it used', () => {
    const anchor = resolveSetupLiftAnchor({
      movementId: 'squat',
      liftSeries: series([point({ e1rm: 150 }), point({ e1rm: 162.5, load: 140, date: '2026-08-16' })]),
      defaults: DEFAULTS,
    })
    expect(anchor).toEqual({
      e1rm: 162.5,
      source: 'history',
      bestSet: { load: 140, reps: 5, date: '2026-08-16' },
    })
  })

  it('falls back to the saved estimate when nothing is logged', () => {
    const anchor = resolveSetupLiftAnchor({ movementId: 'bench_press', liftSeries: series([point()]), defaults: DEFAULTS })
    expect(anchor).toEqual({ e1rm: 100, source: 'estimate', bestSet: null })
  })

  // Seeding a whole programme off a mistyped load is the failure this ordering exists to avoid.
  it('ignores a set the series flagged as an outlier', () => {
    const anchor = resolveSetupLiftAnchor({
      movementId: 'squat',
      liftSeries: series([point({ e1rm: 150 }), point({ e1rm: 400, load: 350, outlier: true })]),
      defaults: DEFAULTS,
    })
    expect(anchor?.e1rm).toBe(150)
  })

  it('returns nothing when there is neither history nor an estimate', () => {
    expect(resolveSetupLiftAnchor({ movementId: 'deadlift', liftSeries: null, defaults: DEFAULTS })).toBeNull()
  })
})

describe('buildSetupLiftRows', () => {
  it('derives the training max as MROUND(e1RM × percent, rounding)', () => {
    const [row] = buildSetupLiftRows({
      stateValues: [state({ value: 147.5 })],
      liftSeries: series([point({ e1rm: 162.5 })]),
      defaults: DEFAULTS,
      rounding: 2.5,
      trainingMaxPercent: 90,
      workingLoadPercent: 75,
    })
    expect(row.e1rm).toBe(162.5)
    expect(row.suggested).toBe(mround(162.5 * 0.9, 2.5))
    // 162.5 × 0.9 = 146.25, which is a whole 59 steps of 2.5.
    expect(row.suggested).toBe(147.5)
    expect(row.source).toBe('history')
    expect(row.edited).toBe(false)
  })

  it('rounds to whichever step is in force', () => {
    const rows = (rounding: number) =>
      buildSetupLiftRows({
        stateValues: [state()],
        liftSeries: series([point({ e1rm: 162.5 })]),
        defaults: DEFAULTS,
        rounding,
        trainingMaxPercent: 90,
        workingLoadPercent: 75,
      })[0]
    expect(rows(2.5).suggested).toBe(147.5)
    expect(rows(5).suggested).toBe(145)
  })

  it('flags a value the user has typed over so the percentage can leave it alone', () => {
    const [row] = buildSetupLiftRows({
      stateValues: [state({ value: 150 })],
      liftSeries: series([point({ e1rm: 162.5 })]),
      defaults: DEFAULTS,
      rounding: 2.5,
      trainingMaxPercent: 90,
      workingLoadPercent: 75,
    })
    expect(row.edited).toBe(true)
  })

  it('applies the working-load percentage to working-load state', () => {
    const [row] = buildSetupLiftRows({
      stateValues: [state({ key: 'squat_working_load', type: 'working_load' })],
      liftSeries: series([point({ e1rm: 160 })]),
      defaults: DEFAULTS,
      rounding: 2.5,
      trainingMaxPercent: 90,
      workingLoadPercent: 75,
    })
    expect(row.percent).toBe(75)
    expect(row.suggested).toBe(120)
  })
})

describe('setupOneRepMaxResolver', () => {
  // The table and the values actually saved must agree; they agree by sharing this resolver.
  it('seeds start values from the same anchor the table displays', () => {
    const liftSeries = series([point({ e1rm: 162.5 })])
    const [seeded] = buildProgramStartStateValues({
      unit: 'kg',
      requiredState: [{ key: 'squat_training_max', movementId: 'squat', type: 'training_max' }],
      defaults: DEFAULTS,
      rounding: 2.5,
      oneRepMaxFor: setupOneRepMaxResolver({ liftSeries, defaults: DEFAULTS }),
    })
    const [row] = buildSetupLiftRows({
      stateValues: [state({ value: seeded.value })],
      liftSeries,
      defaults: DEFAULTS,
      rounding: 2.5,
      trainingMaxPercent: 90,
      workingLoadPercent: 75,
    })
    expect(seeded.value).toBe(row.suggested)
    expect(row.edited).toBe(false)
  })

  // Without a resolver it must behave exactly as it did before this change.
  it('still uses the saved estimate when no resolver is supplied', () => {
    const [seeded] = buildProgramStartStateValues({
      unit: 'kg',
      requiredState: [{ key: 'squat_training_max', movementId: 'squat', type: 'training_max' }],
      defaults: DEFAULTS,
      rounding: 2.5,
    })
    expect(seeded.value).toBe(mround(140 * 0.9, 2.5))
  })
})

describe('convertSetupStateValues', () => {
  // Relabelling 130 kg as 130 lb would start the programme 55% too heavy with nothing on screen
  // to say the number had changed meaning.
  it('converts the numbers when units change, and takes the new plate step with them', () => {
    const [converted] = convertSetupStateValues(
      [state({ value: 130 })],
      'kg',
      'lb',
      roundingForUnit('lb'),
    )
    expect(converted.unit).toBe('lb')
    // 130 kg ≈ 286.6 lb, on the nearest 5 lb.
    expect(converted.value).toBe(285)
  })

  it('round-trips back to roughly where it started', () => {
    const toLb = convertSetupStateValues([state({ value: 100 })], 'kg', 'lb', roundingForUnit('lb'))
    const [back] = convertSetupStateValues(toLb, 'lb', 'kg', roundingForUnit('kg'))
    expect(Math.abs((back.value ?? 0) - 100)).toBeLessThanOrEqual(2.5)
  })

  it('leaves a value that was never set as unset, rather than converting null to zero', () => {
    const [converted] = convertSetupStateValues([state({ value: null })], 'kg', 'lb', 5)
    expect(converted.value).toBeNull()
  })

  it('is a no-op when the unit has not actually changed', () => {
    const input = [state({ value: 130 })]
    expect(convertSetupStateValues(input, 'kg', 'kg', 2.5)).toBe(input)
  })

  it('uses the plate step lifters actually load in each unit', () => {
    expect(roundingForUnit('kg')).toBe(2.5)
    expect(roundingForUnit('lb')).toBe(5)
  })
})
