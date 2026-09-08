import { describe, expect, it } from 'vitest'
import {
  buildLoadTrace,
  projectTrainingMaxBands,
  stateChangeProvenance,
  stateKeyLabel,
} from '../src/program/load-trace'
import { evaluateTrainingMaxBand } from '../src/program/progression'
import { fixedLoadKey } from '../src/program/return-loads'
import type { MovementSlot, PlannedSession, SetLog } from '../src/session/types'
import type { ProgramInstance, TemplateLoadDefinition } from '../src/program/types'

/** Mirrors what `expandSet` actually produces, including both provenance fields. */
function plannedSet(overrides: Partial<SetLog> = {}): SetLog {
  return {
    id: 'set-3',
    setIndex: 3,
    sourcePrescription: {
      targetLoad: { kind: 'percent_of_state', stateType: 'training_max', percent: 0.95, default: 'low' },
      targetReps: 1,
      isTopSet: true,
      isAmrap: true,
    },
    sourceBinding: { stateKey: 'deadlift_training_max', stateType: 'training_max', value: 192.5 },
    targetLoad: 182.5,
    targetReps: 1,
    targetRir: 2,
    isTopSet: true,
    isAmrap: true,
    completed: false,
    ...overrides,
  }
}

const movement: MovementSlot = {
  id: 'slot-day1-deadlift',
  slotId: 'slot-day1-deadlift',
  movementId: 'deadlift',
  movementName: 'Deadlift',
  role: 'main',
  orderIndex: 0,
  targetSummary: '5/3/1+',
  sets: [],
}

function session(overrides: Partial<PlannedSession> = {}): PlannedSession {
  return {
    id: 'planned',
    templateSessionId: 'day1',
    title: 'Deadlift + Posterior Chain',
    programTitle: 'Training Max Wave',
    templateId: 'training-max-wave',
    weekIndex: 8,
    weekLabel: 'Week 3',
    phaseLabel: 'Peak',
    hardness: 'Hard',
    scheduledDate: '2026-09-07',
    estimatedMinutes: 75,
    units: 'kg',
    rounding: 2.5,
    movements: [],
    ...overrides,
  }
}

describe('buildLoadTrace — percent of a programme state', () => {
  it('shows the formula, the substitution, and a result that matches the planned load', () => {
    const trace = buildLoadTrace({ set: plannedSet(), movement, session: session() })!

    expect(trace.expression).toBe('=MROUND(TM_deadlift × 0.95, 2.5)')
    expect(trace.substituted).toBe('=MROUND(192.5 × 0.95, 2.5)')
    expect(trace.evaluated).toBe('=MROUND(182.875, 2.5)')
    expect(trace.result).toBe('182.5 kg')
    expect(trace.matchesPlannedLoad).toBe(true)
  })

  it('names the subject and the cycle position', () => {
    const trace = buildLoadTrace({ set: plannedSet(), movement, session: session() })!
    expect(trace.subject).toBe('Deadlift · top set')
    expect(trace.context).toBe('Week 3 · Peak')
  })

  it('lists the three inputs that actually produced the number', () => {
    const trace = buildLoadTrace({ set: plannedSet(), movement, session: session() })!
    expect(trace.inputs.map((input) => input.label)).toEqual(['TM_deadlift', 'percent', 'rounding'])
    expect(trace.inputs[0].value).toBe('192.5 kg')
    expect(trace.inputs[2].provenance).toBe('programme setting')
  })

  it('uses percentMax when the prescription opts into the top of the range', () => {
    const highLoad: TemplateLoadDefinition = {
      kind: 'percent_of_state',
      stateType: 'training_max',
      percent: 0.9,
      percentMax: 0.95,
      default: 'high',
    }
    const set = plannedSet({ sourcePrescription: { targetLoad: highLoad, targetReps: 1 } })
    expect(buildLoadTrace({ set, movement, session: session() })!.substituted).toContain('× 0.95')
  })

  // A trace that quietly disagrees with the number beside it is worse than no trace.
  it('flags a mismatch rather than asserting a formula that did not produce the load', () => {
    const stale = plannedSet({ targetLoad: 175 })
    expect(buildLoadTrace({ set: stale, movement, session: session() })!.matchesPlannedLoad).toBe(false)
  })
})

describe('buildLoadTrace — nothing to explain', () => {
  it('returns null when the lifter chooses the load', () => {
    const set = plannedSet({ sourcePrescription: { targetLoad: { kind: 'user_selected' } }, sourceBinding: null })
    expect(buildLoadTrace({ set, movement, session: session() })).toBeNull()
  })

  it('returns null for a deliberately blank prescription', () => {
    const blank: TemplateLoadDefinition = { kind: 'percent_of_state', stateType: 'training_max', percent: 0.9, default: 'blank' }
    const set = plannedSet({ sourcePrescription: { targetLoad: blank }, sourceBinding: null })
    expect(buildLoadTrace({ set, movement, session: session() })).toBeNull()
  })

  // Manually added accessories bypass template expansion, so they carry neither field.
  it('returns null for a manually added accessory', () => {
    const set = plannedSet({ sourcePrescription: undefined, sourceBinding: null })
    expect(buildLoadTrace({ set, movement, session: session() })).toBeNull()
  })
})

describe('buildLoadTrace — overrides', () => {
  const fixedSet = plannedSet({
    sourcePrescription: { targetLoad: { kind: 'fixed', kg: 60 }, targetReps: 5 },
    sourceBinding: null,
    targetLoad: 72.5,
  })

  const program = {
    templateDefinition: { durationWeeks: 4, daysPerWeek: 3 },
    loadOverrides: [
      {
        key: fixedLoadKey({
          templateSessionId: 'day1',
          slotId: 'slot-day1-deadlift',
          // weekIndex 8 sessions in, 3 days a week → programme week index 2
          weekIndex: 2,
          movementId: 'deadlift',
          setIndex: 3,
        }),
        value: 72.5,
      },
    ],
  } as unknown as ProgramInstance

  it('reports what the override replaced, since the set itself keeps no marker', () => {
    const trace = buildLoadTrace({ set: fixedSet, movement, session: session(), program })!
    expect(trace.overriddenFrom).toBe(60)
    expect(trace.result).toBe('72.5 kg')
    expect(trace.matchesPlannedLoad).toBe(true)
  })

  it('leaves the trace unoverridden when no override matches the set', () => {
    const trace = buildLoadTrace({ set: fixedSet, movement, session: session() })!
    expect(trace.overriddenFrom).toBeNull()
    // Without the override the template's 60 no longer explains the planned 72.5.
    expect(trace.matchesPlannedLoad).toBe(false)
  })
})

describe('stateKeyLabel', () => {
  it('renders the design notation from the stored key', () => {
    expect(stateKeyLabel('deadlift_training_max', 'training_max')).toBe('TM_deadlift')
    expect(stateKeyLabel('barbell_row_working_load', 'working_load')).toBe('WL_barbell_row')
    expect(stateKeyLabel('squat_one_rep_max', 'one_rep_max')).toBe('1RM_squat')
  })

  it('leaves a custom key alone apart from its prefix', () => {
    expect(stateKeyLabel('custom_anchor', 'working_load')).toBe('WL_custom_anchor')
  })
})

describe('projectTrainingMaxBands', () => {
  it('agrees with the rule it is projecting, for every band', () => {
    const bands = projectTrainingMaxBands({
      currentTm: 192.5,
      rounding: 2.5,
      movementId: 'deadlift',
      stateKey: 'deadlift_training_max',
      targetReps: 1,
    })
    expect(bands.map((band) => band.band)).toEqual(['double', 'standard', 'hold', 'reset'])

    // Each projection must equal what evaluateTrainingMaxBand actually returns for that outcome.
    const byBand = Object.fromEntries(bands.map((band) => [band.band, band]))
    expect(byBand.double.value).toBe(200) // lower body: +7.5
    expect(byBand.standard.value).toBe(197.5) // lower body: +5
    expect(byBand.hold.value).toBe(192.5)
    expect(byBand.reset.value).toBe(evaluateTrainingMaxBand(
      [{ actualReps: 0, actualRir: 3, targetReps: 1 }], 192.5, 2.5, 'deadlift', 'deadlift_training_max',
    ).recommendedValue)
  })

  it('uses the smaller upper-body increments', () => {
    const bands = projectTrainingMaxBands({
      currentTm: 95,
      rounding: 2.5,
      movementId: 'bench_press',
      stateKey: 'bench_press_training_max',
      targetReps: 3,
    })
    const byBand = Object.fromEntries(bands.map((band) => [band.band, band]))
    expect(byBand.double.value).toBe(100) // upper body: +5
    expect(byBand.standard.value).toBe(97.5) // upper body: +2.5
  })

  it('carries the real rule id, so the panel names the rule that will run', () => {
    const bands = projectTrainingMaxBands({
      currentTm: 100, rounding: 2.5, movementId: 'squat', stateKey: 'squat_training_max', targetReps: 5,
    })
    expect(bands.map((band) => band.ruleId)).toEqual([
      'training_max_double',
      'training_max_standard',
      'training_max_hold',
      'training_max_reset',
    ])
  })
})

describe('stateChangeProvenance', () => {
  const base = {
    movementId: 'deadlift',
    movementName: 'Deadlift',
    stateKey: 'deadlift_training_max',
    stateType: 'training_max' as const,
    value: 192.5,
    units: 'kg' as const,
    startValue: 180,
  }

  it('reads back the accepted decision that moved the value', () => {
    expect(stateChangeProvenance({
      ...base,
      lastAcceptedDecision: {
        id: 'd1', movementId: 'deadlift', movementName: 'Deadlift', ruleId: 'training_max_standard',
        scope: 'cycle', status: 'accepted', inputSummary: '', recommendation: '',
        previousValue: 187.5, recommendedValue: 192.5, resolvedAt: '2026-07-12T10:00:00.000Z',
      },
    }, 'kg')).toBe('set Jul 12 · training_max_standard · +5 kg')
  })

  it('falls back to the timestamp rather than inventing a cause', () => {
    expect(stateChangeProvenance({ ...base, updatedAt: '2026-07-12T10:00:00.000Z' }, 'kg')).toBe('set Jul 12')
    expect(stateChangeProvenance({ ...base }, 'kg')).toBeNull()
    expect(stateChangeProvenance(undefined, 'kg')).toBeNull()
  })
})
