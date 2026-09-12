import { describe, expect, it } from 'vitest'
import { buildCycleInspector, collectCycleRules } from '../src/program/cycle-inspector'
import type { ProgressionDecision, TemplateDefinition } from '../src/program/types'

function definition(): TemplateDefinition {
  return {
    schemaVersion: '2026.06.dsl',
    id: 'wave',
    name: 'Training Max Wave',
    durationWeeks: 2,
    daysPerWeek: 1,
    requiredState: [],
    timelineDescription: '',
    // Deliberately misleading: nothing in the codebase reads this, and it disagrees with the
    // prescriptions below. The inspector must not believe it.
    progressionRules: { main: 'DECORATIVE_DO_NOT_USE' },
    sessions: [
      {
        id: 'day1',
        title: 'Day 1',
        estimatedMinutes: 60,
        slots: [
          { id: 'squat', role: 'main', movementId: 'squat', prescriptionId: 'main' },
          { id: 'row', role: 'variation', movementId: 'barbell_row', prescriptionId: 'variation' },
          { id: 'curl', role: 'accessory', movementId: 'biceps_curl', prescriptionId: 'accessory' },
        ],
      },
    ],
    weeks: [
      {
        label: 'Week 1',
        phaseKey: 'base',
        phaseLabel: 'Base',
        summary: '',
        hardness: 'Medium',
        prescriptions: {
          main: { targetSummary: '', progressionRuleId: 'training_max_band', sets: [] },
          variation: { targetSummary: '', progressionRuleId: 'simple_linear_completion', sets: [] },
          accessory: { targetSummary: '', progressionRuleId: 'accessory_double_progression', sets: [] },
        },
      },
      {
        label: 'Week 2',
        phaseKey: 'peak',
        phaseLabel: 'Peak',
        summary: '',
        hardness: 'Hard',
        prescriptions: {
          main: { targetSummary: '', progressionRuleId: 'training_max_band', sets: [] },
          variation: { targetSummary: '', sets: [] },
          accessory: { targetSummary: '', progressionRuleId: 'accessory_double_progression', sets: [] },
        },
      },
    ],
  }
}

const decision = (overrides: Partial<ProgressionDecision>): ProgressionDecision => ({
  id: 'd',
  movementId: 'squat',
  movementName: 'Squat',
  ruleId: 'training_max_standard',
  scope: 'cycle',
  status: 'accepted',
  inputSummary: '',
  recommendation: '',
  ...overrides,
})

const stateValues = [
  {
    movementId: 'squat',
    movementName: 'Squat',
    stateKey: 'squat_training_max',
    stateType: 'training_max' as const,
    value: 130,
    units: 'kg' as const,
    startValue: 120,
  },
]

describe('collectCycleRules', () => {
  it('reads the rules that actually run, not the decorative role map', () => {
    const rules = collectCycleRules(definition(), [])
    expect(rules.map((rule) => rule.ruleId)).toEqual([
      'accessory_double_progression',
      'simple_linear_completion',
      'training_max_band',
    ])
    expect(rules.map((rule) => rule.ruleId)).not.toContain('DECORATIVE_DO_NOT_USE')
  })

  it('names every role a rule governs, deduplicated across weeks and sessions', () => {
    const rules = collectCycleRules(definition(), [])
    expect(rules.find((rule) => rule.ruleId === 'training_max_band')?.roles).toBe('main lifts')
    expect(rules.find((rule) => rule.ruleId === 'accessory_double_progression')?.roles).toBe('accessories')
  })

  it('leaves scope null until a decision supplies one, rather than guessing', () => {
    expect(collectCycleRules(definition(), []).every((rule) => rule.scope === null)).toBe(true)
  })

  it('matches a decision whose rule id is the more specific outcome of a template rule', () => {
    // Template declares `training_max_band`; the decision it emits is `training_max_standard`.
    const rules = collectCycleRules(definition(), [decision({ ruleId: 'training_max_standard', scope: 'cycle' })])
    expect(rules.find((rule) => rule.ruleId === 'training_max_band')?.scope).toBe('cycle')
    expect(rules.find((rule) => rule.ruleId === 'accessory_double_progression')?.scope).toBeNull()
  })

  it('matches an exactly-named rule too', () => {
    const rules = collectCycleRules(definition(), [
      decision({ ruleId: 'accessory_double_progression', scope: 'session' }),
    ])
    expect(rules.find((rule) => rule.ruleId === 'accessory_double_progression')?.scope).toBe('session')
  })
})

describe('buildCycleInspector', () => {
  it('states cycle position and when decisions land', () => {
    const model = buildCycleInspector({
      definition: definition(),
      weekNumber: 1,
      totalWeeks: 4,
      stateValues,
      decisions: [],
    })
    expect(model.position).toBe('Week 1 of 4')
    expect(model.decisionNote).toBe('Decisions are written when week 4 closes.')
  })

  it('changes the note on the closing week', () => {
    const model = buildCycleInspector({
      definition: definition(),
      weekNumber: 4,
      totalWeeks: 4,
      stateValues,
      decisions: [],
    })
    expect(model.decisionNote).toBe('Decisions are written as this week closes.')
  })

  it('pairs each current value with its projection, and leaves it null when there is none', () => {
    const withProjection = buildCycleInspector({
      definition: definition(),
      weekNumber: 2,
      totalWeeks: 4,
      stateValues,
      decisions: [],
      projectedByMovement: { squat: 123.5 },
    })
    expect(withProjection.projections).toEqual([
      { movementId: 'squat', label: 'Squat', current: 130, projected: 123.5 },
    ])

    const without = buildCycleInspector({
      definition: definition(),
      weekNumber: 2,
      totalWeeks: 4,
      stateValues,
      decisions: [],
    })
    expect(without.projections[0].projected).toBeNull()
  })
})
