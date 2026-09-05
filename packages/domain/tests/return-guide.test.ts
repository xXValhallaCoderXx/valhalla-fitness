import { describe, expect, it } from 'vitest'
import type {
  ProgramInstance,
  TemplateDefinition,
  TemplateSetDefinition,
} from '../src/program/types'
import type { WorkoutSession } from '../src/session/types'
import { programLoadChanges, resetLoad, withLoadChanges } from '../src/program/return-loads'
import { defaultReturnSettings } from '../src/program/return-settings'
import { buildReturnPreview } from '../src/program/return-preview'
import { expandSessionFromTemplateDefinition } from '../src/program/template-engine'
import { buildProgressionDecisionsForSession } from '../src/program/progression-decisions'
import { seedLoadForSet } from '../src/session/live-session-utils'
import { buildReturnOutlook } from '../src/program/return-outlook'

const stateSet: TemplateSetDefinition = {
  targetLoad: { kind: 'state', stateKey: 'custom_anchor', stateType: 'working_load' },
  targetReps: 5,
  targetRir: 2,
}
function program(
  sets: TemplateSetDefinition[] = Array.from({ length: 5 }, () => ({ ...stateSet })),
): ProgramInstance {
  const templateDefinition: TemplateDefinition = {
    schemaVersion: '2026.06.dsl',
    id: 'return-test',
    name: 'Return test',
    daysPerWeek: 1,
    durationWeeks: 2,
    requiredState: [{ key: 'custom_anchor', movementId: 'squat', type: 'working_load' }],
    timelineDescription: '',
    sessions: [
      {
        id: 'day',
        title: 'Day',
        estimatedMinutes: 30,
        slots: [{ id: 'lift', movementId: 'squat', role: 'main', prescriptionId: 'work' }],
      },
    ],
    weeks: ['base', 'peak'].map((phaseKey) => ({
      label: phaseKey,
      phaseKey,
      phaseLabel: phaseKey,
      summary: '',
      hardness: 'Medium',
      prescriptions: {
        work: { sets, targetSummary: 'Five sets', progressionRuleId: 'simple_linear_completion' },
      },
    })),
  }
  return {
    id: 'program',
    title: 'Test',
    templateId: templateDefinition.id,
    templateVersionId: 'version',
    status: 'active',
    startDate: '2026-01-01',
    units: 'kg',
    rounding: 2.5,
    currentWeekIndex: 0,
    stateVersion: 0,
    customizationStatus: 'default',
    customizationSummary: { movementOverrideCount: 0, accessoryAdditionCount: 0 },
    stateValues: [
      { ...templateDefinition.requiredState[0], value: 100 },
      { key: 'unreferenced', movementId: 'squat', type: 'one_rep_max', value: 160 },
    ],
    templateDefinition,
  }
}
function returning(base = program()) {
  return {
    ...withLoadChanges(base, programLoadChanges(base)),
    lastLoadResetAt: '2026-09-06T00:00:00Z',
    returnPeriod: {
      id: 'period',
      policyVersion: 1 as const,
      status: 'active' as const,
      startedAt: '2026-09-06T00:00:00Z',
      completedWorkouts: 0,
      settings: defaultReturnSettings(1, base.rounding),
    },
  }
}
function completed(base = returning()): WorkoutSession {
  const planned = expandSessionFromTemplateDefinition(base, base.templateDefinition!, '2026-09-06')
  return {
    ...planned,
    sessionId: 'session',
    stateVersion: 0,
    status: 'in_progress',
    movements: planned.movements.map((movement) => ({
      ...movement,
      sets: movement.sets.map((set) => ({
        ...set,
        completed: true,
        actualLoad: set.targetLoad,
        actualReps: set.targetReps,
        actualRir: 3,
      })),
    })),
  }
}

describe('permanent return load sources', () => {
  it('resets a custom shared anchor once, leaving unreferenced account-like state separate', () => {
    const base = program()
    const changes = programLoadChanges(base)
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ key: 'custom_anchor', before: 100, after: 80 })
    expect(withLoadChanges(base, changes).stateValues[1].value).toBe(160)
    expect(base.stateValues[0].value).toBe(100)
  })
  it.each([
    [2.5, 0.2, 2.5, null],
    [0, 0.2, 2.5, 0],
    [102.5, 0.2, 2.5, 80],
    [100, 0.2, 5, 80],
  ])('rounds %s down and makes zero explicit', (value, reduction, step, expected) => {
    expect(resetLoad(value!, reduction!, step!)).toBe(expected)
  })
  it('keeps blank, missing, and user-selected targets manual', () => {
    const base = program([
      { targetReps: 5 },
      { targetLoad: { kind: 'user_selected' } },
      {
        targetLoad: {
          kind: 'percent_of_state',
          stateType: 'working_load',
          stateKey: 'missing',
          percent: 0.7,
          default: 'blank',
        },
      },
    ])
    expect(programLoadChanges(base)).toEqual([])
    expect(
      expandSessionFromTemplateDefinition(
        base,
        base.templateDefinition!,
        '2026-09-06',
      ).movements[0].sets.every((set) => set.targetLoad === null),
    ).toBe(true)
  })
  it('pins fixed loads by session, slot, week, movement and source set before conversion', () => {
    const base = program([{ targetLoad: { kind: 'fixed', kg: 20, lb: 45 }, targetReps: 8 }])
    base.units = 'lb'
    base.rounding = 5
    const changes = programLoadChanges(base)
    expect(changes).toHaveLength(2)
    expect(changes[0]).toMatchObject({ before: 45, after: 35 })
    const reset = withLoadChanges(base, changes)
    expect(
      expandSessionFromTemplateDefinition(reset, base.templateDefinition!, '2026-09-06')
        .movements[0].sets[0].targetLoad,
    ).toBe(35)
    expect(base.templateDefinition!.weeks[0].prescriptions.work.sets[0].targetLoad).toEqual({
      kind: 'fixed',
      kg: 20,
      lb: 45,
    })
  })
  it('updates existing accessory targets and preserves newly entered values', () => {
    const base = program()
    base.accessoryAdditions = [
      {
        id: 'addition',
        sessionId: 'day',
        slotId: 'extra',
        phaseKey: '*',
        movementId: 'barbell_row',
        prescriptionId: 'manual',
        effectiveFromWeekIndex: 0,
        orderIndex: 2,
        sets: [{ id: 'one', setIndex: 1, targetLoad: 50, targetReps: 8 }],
      },
    ]
    const reset = returning(base)
    reset.accessoryAdditions!.push({
      ...base.accessoryAdditions[0],
      id: 'new',
      slotId: 'new',
      sets: [{ id: 'one', setIndex: 1, targetLoad: 60, targetReps: 8 }],
    })
    const session = completed(reset)
    expect(session.movements[1].sets[0].targetLoad).toBe(40)
    expect(session.movements[2].sets[0].targetLoad).toBe(60)
  })
})

describe('return prescriptions and progression', () => {
  it('keeps three of five identical sets and earns a capped increase against adjusted work', () => {
    const base = returning()
    const session = completed(base)
    expect(session.movements[0].sets.map((set) => set.setIndex)).toEqual([1, 2, 3])
    expect(session.movements[0].sets.every((set) => set.targetRir === 3)).toBe(true)
    expect(buildProgressionDecisionsForSession(session, base)[0]).toMatchObject({
      previousValue: 80,
      recommendedValue: 82.5,
      stateKey: 'custom_anchor',
    })
  })
  it('preserves ramps even when loads round identically, plus sets and one backoff', () => {
    const sets: TemplateSetDefinition[] = [0.601, 0.602, 0.603].map((percent) => ({
      ...stateSet,
      targetLoad: {
        kind: 'percent_of_state',
        stateType: 'working_load',
        stateKey: 'custom_anchor',
        percent,
        default: 'low',
      },
    }))
    sets[2].isAmrap = true
    sets.push(...Array.from({ length: 5 }, () => ({ ...stateSet, isBackoff: true })))
    const base = returning(program(sets))
    base.returnPeriod.settings.stages[0].setFraction = 0
    const session = completed(base)
    expect(session.movements[0].sets.map((set) => set.setIndex)).toEqual([1, 2, 3, 4])
    expect(session.movements[0].targetSummary).toContain('5+ reps; stop with 3 reps left')
  })
  it.each(['lighter', 'missing effort', 'incomplete', 'different movement', 'stale state'])(
    'does not increase with %s',
    (reason) => {
      const base = returning()
      const session = completed(base)
      const set = session.movements[0].sets[0]
      if (reason === 'lighter') set.actualLoad = 60
      if (reason === 'missing effort') set.actualRir = null
      if (reason === 'incomplete') set.completed = false
      if (reason === 'different movement') session.movements[0].performedMovementId = 'deadlift'
      if (reason === 'stale state') base.stateValues[0].value = 90
      expect(buildProgressionDecisionsForSession(session, base)).toEqual([])
    },
  )
  it('never rounds above a fractional cap and supports an explicit hold', () => {
    const base = returning()
    base.returnPeriod.settings.caps.custom_anchor = 2.4
    expect(buildProgressionDecisionsForSession(completed(base), base)[0].recommendedValue).toBe(80)
    base.returnPeriod.settings.caps.custom_anchor = 0
    expect(buildProgressionDecisionsForSession(completed(base), base)[0].recommendation).toContain(
      'Keep 80',
    )
  })
  it('retains exact decimal steps without rounding above a nearby cap', () => {
    const base = returning()
    base.rounding = 0.1
    base.returnPeriod.settings.caps.custom_anchor = 0.3
    expect(buildProgressionDecisionsForSession(completed(base), base)[0].recommendedValue).toBe(
      80.3,
    )
    base.returnPeriod.settings.caps.custom_anchor = 0.299999999999
    expect(buildProgressionDecisionsForSession(completed(base), base)[0].recommendedValue).toBe(
      80.2,
    )
  })
  it.each(['plus_set_wave', 'training_max_band'])(
    'caps %s against all retained percentage work',
    (rule) => {
      const sets = [0.6, 0.7, 0.8].map(
        (percent, index): TemplateSetDefinition => ({
          targetLoad: {
            kind: 'percent_of_state',
            stateKey: 'custom_anchor',
            stateType: 'training_max',
            percent,
            default: 'low',
          },
          targetReps: 5,
          isTopSet: index === 2,
          isAmrap: index === 2,
        }),
      )
      const source = program(sets)
      source.stateValues[0].type = 'training_max'
      source.templateDefinition!.weeks[0].prescriptions.work.progressionRuleId = rule
      const base = returning(source)
      const session = completed(base)
      session.movements[0].sets[2].actualReps = 10
      const decision = buildProgressionDecisionsForSession(session, base)[0]
      expect(decision).toMatchObject({
        stateKey: 'custom_anchor',
        previousValue: 80,
        recommendedValue: 82.5,
      })
      expect(decision.recommendation).toContain('Individual set loads')
      session.movements[0].sets[0].completed = false
      expect(buildProgressionDecisionsForSession(session, base)).toEqual([])
    },
  )
  it('retains valid training-max hold/reset behaviour without treating omitted sets as failures', () => {
    const source = program([{ ...stateSet, isTopSet: true }, stateSet, stateSet, stateSet])
    source.templateDefinition!.weeks[0].prescriptions.work.progressionRuleId = 'training_max_band'
    const base = returning(source)
    const session = completed(base)
    expect(session.movements[0].sets).toHaveLength(2)
    session.movements[0].sets[0].actualRir = 1
    expect(buildProgressionDecisionsForSession(session, base)[0].recommendedValue).toBe(80)
    session.movements[0].sets[0].actualReps = 3
    expect(buildProgressionDecisionsForSession(session, base)[0].recommendedValue).toBe(72.5)
    session.movements[0].sets[0].actualLoad = 60
    expect(buildProgressionDecisionsForSession(session, base)).toEqual([])
  })
  it('does not reapply the reduction during editing or ending, and previews phase transitions', () => {
    const base = returning()
    base.stateValues[0].value = 82.5
    const preview = buildReturnPreview(base, { reduction: 0.9, scheduledDate: '2026-09-06' })
    expect(preview.changes[0].after).toBe(82.5)
    expect(preview.upcoming.map((session) => session.weekLabel)).toEqual(['base', 'peak', 'base'])
    expect(preview.upcoming[2].returnContext?.review).toBe(true)
    const ended = { ...base, returnPeriod: { ...base.returnPeriod, status: 'completed' as const } }
    const ordinary = expandSessionFromTemplateDefinition(
      ended,
      ended.templateDefinition!,
      '2026-09-06',
    )
    expect(ordinary.movements[0].sets).toHaveLength(5)
    expect(ordinary.movements[0].sets[0].targetLoad).toBe(82.5)
  })
  it('shows old comparables separately and seeds only post-reset matching history', () => {
    const session = completed(returning(program([{ targetReps: 8 }])))
    const movement = session.movements[0]
    const set = movement.sets[0]
    set.actualLoad = null
    movement.previous = {
      movementId: 'squat',
      label: 'Old',
      load: 100,
      performedAt: '2026-08-01T00:00:00Z',
    }
    expect(seedLoadForSet(movement, set)).toBeNull()
    expect(movement.previous.load).toBe(100)
    movement.previous.performedAt = '2026-09-07T00:00:00Z'
    movement.previous.postResetSets = [{ setIndex: set.setIndex, load: 100, reps: 8, rir: 3 }]
    expect(seedLoadForSet(movement, set)).toBe(100)
  })
})

describe('return outlook', () => {
  const outlook = (
    source = program(),
    reduction = 0.2,
    baseline: Parameters<typeof buildReturnOutlook>[2] = [],
  ) =>
    buildReturnOutlook(
      source,
      buildReturnPreview(source, { reduction, scheduledDate: '2026-09-06' }),
      baseline,
    )

  it('counts actual lift exposures and responds to the single starting-weight slider', () => {
    const normal = outlook()
    expect(normal.lifts).toHaveLength(1)
    expect(normal.lifts[0].reference).toEqual({
      key: 'custom_anchor',
      label: 'Working load',
      before: 100,
      after: 80,
    })
    expect(normal.totalWorkouts).toBe(9)
    expect(outlook(program(), 0.1).totalWorkouts).toBe(5)
    expect(normal.weeks).toEqual([
      { number: 1, phases: ['base'], setPercentages: [50], referencePercentRange: [80, 80] },
      { number: 2, phases: ['peak'], setPercentages: [75], referencePercentRange: [83, 83] },
    ])
    expect(normal.reviewAfter).toBe(2)
  })
  it('uses the actual last load and reps, not a training-max number or a heavier low-rep set', () => {
    const baseline = [
      { movementId: 'squat', slotId: 'slot-day-lift', load: 90, reps: 5, date: '2026-08-01' },
    ]
    expect(outlook(program(), 0.2, baseline).lifts[0]).toMatchObject({
      goalKind: 'last_workout',
      goalLoad: 90,
      workouts: 5,
    })
    expect(outlook(program(), 0.2, [{ ...baseline[0], reps: 8 }]).totalWorkouts).toBeNull()
    expect(
      outlook(program(), 0.2, [{ ...baseline[0], movementId: 'deadlift' }]).lifts[0].goalKind,
    ).toBe('reference')
  })
  it('does not invent increases for manual loads, descriptive rules, or a zero cap', () => {
    const held = returning()
    held.returnPeriod.settings.defaultCap = 0
    held.loadAdjustments = [
      { createdAt: held.returnPeriod.startedAt, changes: programLoadChanges(program()) },
    ]
    expect(outlook(held).totalWorkouts).toBeNull()
    expect(outlook(program([{ targetReps: 5 }])).lifts[0]).toMatchObject({
      reference: null,
      workouts: null,
    })
    const descriptive = program()
    descriptive.templateDefinition!.weeks.forEach((week) => {
      week.prescriptions.work.progressionRuleId = 'custom_description'
    })
    expect(outlook(descriptive).totalWorkouts).toBeNull()
  })
  it('keeps the original pre-return reference after accepted increases and guide edits', () => {
    const active = returning()
    active.stateValues[0].value = 95
    active.returnPeriod.completedWorkouts = 6
    active.loadAdjustments = [
      { createdAt: active.returnPeriod.startedAt, changes: programLoadChanges(program()) },
    ]
    const result = outlook(active)
    expect(result.lifts[0].reference).toMatchObject({ before: 100, after: 95 })
    expect(result.totalWorkouts).toBe(3)
    expect(result.reviewAfter).toBe(0)
    expect(active.stateValues[0].value).toBe(95)
  })
  it('keeps percentage programmes and plus-set assumptions distinct from performed weights', () => {
    const source = program([
      {
        targetLoad: {
          kind: 'percent_of_state',
          stateKey: 'custom_anchor',
          stateType: 'training_max',
          percent: 0.75,
          default: 'low',
        },
        targetReps: 5,
        isAmrap: true,
      },
    ])
    source.stateValues[0].type = 'training_max'
    source.templateDefinition!.weeks.forEach((week) => {
      week.prescriptions.work.progressionRuleId = 'plus_set_wave'
    })
    const result = outlook(source, 0.2, [
      { movementId: 'squat', slotId: 'slot-day-lift', load: 70, reps: 7, date: '2026-08-01' },
    ])
    expect(result.hasPlusSets).toBe(true)
    expect(result.lifts[0].reference?.label).toBe('Training max')
    expect(result.totalWorkouts).toBe(6)
  })
})
