import { describe, expect, it } from 'vitest'
import { buildProgramTrajectory, shortLiftLabel } from '../src/domains/program/lib/program-trajectory'
import type { TemplateDefinition } from '../src/domains/program/lib/template-engine'
import type { ProgramSessionStamp, ProgramStateOverview, ProgressionDecision } from '../src/shared/types'

/**
 * Synthetic 4-week / 2-day template with two phases:
 * - Base (wks 1-2): squat top set 80% of TM, progressed by training_max_band.
 * - Build (wks 3-4): squat top set 85% of TM.
 * Bench runs a working-load linear progression (kind: state) every session.
 */
function definition(): TemplateDefinition {
  const week = (label: string, phaseKey: string, phaseLabel: string, squatPercent: number) => ({
    label,
    phaseKey,
    phaseLabel,
    summary: `${phaseLabel} week`,
    hardness: 'Medium' as const,
    prescriptions: {
      'squat-main': {
        targetSummary: `Top set @ ${Math.round(squatPercent * 100)}%`,
        progressionRuleId: 'training_max_band',
        sets: [
          { targetLoad: { kind: 'percent_of_state' as const, stateType: 'training_max' as const, percent: 0.7, default: 'low' as const }, targetReps: 5 },
          { targetLoad: { kind: 'percent_of_state' as const, stateType: 'training_max' as const, percent: squatPercent, default: 'low' as const }, targetReps: 5, isTopSet: true },
        ],
      },
      'bench-main': {
        targetSummary: '3x5 @ working load',
        progressionRuleId: 'simple_linear_completion',
        sets: [{ targetLoad: { kind: 'state' as const, stateType: 'working_load' as const }, targetReps: 5 }],
      },
    },
  })

  return {
    schemaVersion: '2026.06.dsl',
    id: 'test-trajectory',
    name: 'Trajectory Test',
    durationWeeks: 4,
    daysPerWeek: 2,
    requiredState: [
      { key: 'squat_training_max', movementId: 'squat', type: 'training_max' },
      { key: 'bench_press_working_load', movementId: 'bench_press', type: 'working_load' },
    ],
    timelineDescription: 'Two-phase test plan.',
    sessions: [
      {
        id: 'day-1',
        title: 'Day 1',
        estimatedMinutes: 45,
        slots: [{ id: 'squat', role: 'main', movementId: 'squat', prescriptionId: 'squat-main' }],
      },
      {
        id: 'day-2',
        title: 'Day 2',
        estimatedMinutes: 45,
        slots: [{ id: 'bench', role: 'main', movementId: 'bench_press', prescriptionId: 'bench-main' }],
      },
    ],
    weeks: [
      week('Week 1', 'base', 'Base phase', 0.8),
      week('Week 2', 'base', 'Base phase', 0.8),
      week('Week 3', 'build', 'Build phase', 0.85),
      week('Week 4', 'build', 'Build phase', 0.85),
    ],
    progressionConfig: {
      simple_linear_completion: {
        increments: { bench_press: { kg: 2.5, lb: 5 } },
      },
    },
  } as TemplateDefinition
}

function state(overrides: Partial<ProgramStateOverview> & Pick<ProgramStateOverview, 'movementId' | 'stateKey' | 'stateType' | 'value'>): ProgramStateOverview {
  return {
    movementName: overrides.movementId,
    units: 'kg',
    startValue: overrides.value,
    ...overrides,
  }
}

const squatTm = state({ movementId: 'squat', stateKey: 'squat_training_max', stateType: 'training_max', value: 100 })
const benchWl = state({ movementId: 'bench_press', stateKey: 'bench_press_working_load', stateType: 'working_load', value: 60 })

function build(overrides: Partial<Parameters<typeof buildProgramTrajectory>[0]> = {}) {
  return buildProgramTrajectory({
    definition: definition(),
    currentGlobalIndex: 4, // week 3, session 1 next
    rounding: 2.5,
    units: 'kg',
    stateValues: [squatTm, benchWl],
    acceptedDecisions: [],
    sessionStamps: [],
    ...overrides,
  })
}

describe('program trajectory', () => {
  it('groups weeks into phases with statuses and subtitles', () => {
    const trajectory = build()
    expect(trajectory.totalWeeks).toBe(4)
    expect(trajectory.currentWeekNumber).toBe(3)
    expect(trajectory.phases.map((phase) => phase.key)).toEqual(['base', 'build'])

    const [base, buildPhase] = trajectory.phases
    expect(base!.status).toBe('done')
    expect(base!.label).toBe('Base')
    expect(base!.subtitle).toBe('Wk 1–2 · completed, 4/4 sessions')
    expect(buildPhase!.status).toBe('current')
    expect(buildPhase!.subtitle).toBe('Wk 3–4 · week 1 of 2')
  })

  it('marks week rows with session progress and status', () => {
    const trajectory = build({ currentGlobalIndex: 5 }) // week 3, session 2 of 2 next
    const buildPhase = trajectory.phases[1]!
    const [week3, week4] = buildPhase.weeks
    expect(week3!.status).toBe('current')
    expect(week3!.sessionsDone).toBe(1)
    expect(week3!.sessionsTotal).toBe(2)
    expect(week4!.status).toBe('upcoming')
    expect(week4!.isProjected).toBe(true)
  })

  it('prices the current week from live state and future weeks from projected increments', () => {
    const trajectory = build()
    const buildPhase = trajectory.phases[1]!
    const week3 = buildPhase.weeks[0]!
    // Current week: 85% of TM 100 -> 85; bench working load as-is.
    expect(week3.targets).toEqual([
      { movementId: 'squat', label: 'Squat', load: 85 },
      { movementId: 'bench_press', label: 'Bench', load: 60 },
    ])
    // Week 4: squat has one progression event (wk3 session) -> TM 105 -> 89.25 ~ 90.
    // Bench has one event -> 62.5.
    const week4 = buildPhase.weeks[1]!
    expect(week4.targets).toEqual([
      { movementId: 'squat', label: 'Squat', load: 90 },
      { movementId: 'bench_press', label: 'Bench', load: 62.5 },
    ])
  })

  it('publishes last-week targets as the "if targets hit" projection', () => {
    const trajectory = build()
    const buildPhase = trajectory.phases[1]!
    expect(buildPhase.projected).toEqual({
      byWeekNumber: 4,
      values: [
        { movementId: 'squat', label: 'Squat', value: 90 },
        { movementId: 'bench_press', label: 'Bench', value: 62.5 },
      ],
    })
    expect(buildPhase.banked).toBeUndefined()
  })

  it('projects from the heaviest upcoming week, skipping a deload finale', () => {
    const def = definition()
    def.weeks[3]!.hardness = 'Deload'
    const trajectory = build({ definition: def, currentGlobalIndex: 2 }) // week 2 current
    expect(trajectory.phases[1]!.projected?.byWeekNumber).toBe(3)
  })

  it('banks completed-phase values from accepted decision history', () => {
    const decisions: ProgressionDecision[] = [
      {
        id: 'd2',
        movementId: 'squat',
        movementName: 'Back Squat',
        stateKey: 'squat_training_max',
        stateType: 'training_max',
        ruleId: 'training_max_band',
        scope: 'cycle',
        status: 'accepted',
        inputSummary: '',
        recommendation: '',
        previousValue: 97.5,
        recommendedValue: 100,
        resolvedAt: '2026-01-14T10:00:00Z', // after the base phase ended
      },
      {
        id: 'd1',
        movementId: 'squat',
        movementName: 'Back Squat',
        stateKey: 'squat_training_max',
        stateType: 'training_max',
        ruleId: 'training_max_band',
        scope: 'cycle',
        status: 'accepted',
        inputSummary: '',
        recommendation: '',
        previousValue: 95,
        recommendedValue: 97.5,
        resolvedAt: '2026-01-05T10:00:00Z', // during the base phase
      },
    ]
    const stamps: ProgramSessionStamp[] = [
      { weekIndex: 0, completedAt: '2026-01-01T10:00:00Z' },
      { weekIndex: 1, completedAt: '2026-01-04T10:00:00Z' },
      { weekIndex: 2, completedAt: '2026-01-08T10:00:00Z' },
      { weekIndex: 3, completedAt: '2026-01-11T10:00:00Z' }, // last base session
    ]
    const trajectory = build({ acceptedDecisions: decisions, sessionStamps: stamps })
    const base = trajectory.phases[0]!
    // TM in effect at the end of base: d1 landed before the boundary, d2 after.
    expect(base.banked?.atWeekNumber).toBe(2)
    expect(base.banked?.values).toContainEqual({ movementId: 'squat', label: 'Squat', value: 97.5 })
  })

  it('falls back to current values when no history exists', () => {
    const trajectory = build()
    const base = trajectory.phases[0]!
    expect(base.banked?.values).toContainEqual({ movementId: 'squat', label: 'Squat', value: 100 })
  })

  it('reports hasTargets false for templates without stateful main sets', () => {
    const def = definition()
    for (const week of def.weeks) {
      week.prescriptions['squat-main']!.sets = [{ targetLoad: { kind: 'user_selected' }, targetReps: 5 }] as any
      week.prescriptions['bench-main']!.sets = [{ targetLoad: { kind: 'user_selected' }, targetReps: 5 }] as any
    }
    const trajectory = build({ definition: def })
    expect(trajectory.hasTargets).toBe(false)
    expect(trajectory.phases[1]!.projected).toBeUndefined()
  })

  it('abbreviates the big lifts', () => {
    expect(shortLiftLabel('deadlift')).toBe('Dead')
    expect(shortLiftLabel('overhead_press')).toBe('OHP')
  })
})
