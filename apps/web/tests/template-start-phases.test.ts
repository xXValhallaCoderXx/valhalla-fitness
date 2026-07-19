import { describe, expect, it } from 'vitest'
import {
  buildIntensityRamp,
  buildPhaseChangeLine,
  deriveTemplatePhases,
  templateStructureMode,
} from '../src/domains/program/lib/template-start-phases'
import type { MovementRole, ProgramSetupPreviewMovement, ProgramSetupPreviewWeek } from '../src/shared/types'

function movement(
  partial: Partial<ProgramSetupPreviewMovement> & { slotId: string; role: MovementRole },
): ProgramSetupPreviewMovement {
  return {
    templateSlotId: partial.slotId,
    phaseKey: 'base',
    phaseLabel: 'Base phase',
    setupPhaseKey: 'base',
    roleLabel: 'Main',
    defaultMovementId: 'squat',
    defaultMovementName: 'Squat',
    targetSummary: '4 sets x 6+ @ 70%',
    progressionRuleId: null,
    replacementOptions: [],
    ...partial,
  }
}

function week(
  partial: Partial<ProgramSetupPreviewWeek> & { index: number; phaseKey: string; movements: ProgramSetupPreviewMovement[] },
): ProgramSetupPreviewWeek {
  return {
    label: `Week ${partial.index + 1}`,
    phaseLabel: 'Base phase',
    subtitle: '',
    summary: '',
    hardness: 'Medium',
    ...partial,
    sessions: [
      { id: 's1', label: 'Day 1', title: 'Day 1', estimatedMinutes: 60, movementSummary: '', keyPrescription: '', movements: partial.movements },
    ],
  }
}

const baseRows = () => [
  movement({ slotId: 'm1', role: 'main', roleLabel: 'Main', defaultMovementName: 'Squat', targetSummary: '4 sets x 6+ @ 70%' }),
  movement({ slotId: 'v1', role: 'variation', roleLabel: 'Variation', defaultMovementId: 'front_squat', defaultMovementName: 'Front Squat', targetSummary: '3 sets x 12 @ 60%' }),
  movement({ slotId: 'a1', role: 'accessory', roleLabel: 'Accessory', defaultMovementName: 'Leg Curl', targetSummary: '3 sets x 12' }),
]
const peakRows = () => [
  movement({ slotId: 'm1', role: 'main', roleLabel: 'Main', defaultMovementName: 'Squat', targetSummary: '5 sets x 3+ @ 85%' }),
  movement({ slotId: 'v1', role: 'variation', roleLabel: 'Variation', defaultMovementId: 'pause_squat', defaultMovementName: 'Pause Squat', targetSummary: '4 sets x 6 @ 75%' }),
  movement({ slotId: 'a1', role: 'accessory', roleLabel: 'Accessory', defaultMovementName: 'Leg Curl', targetSummary: '3 sets x 12' }),
]

const phasedWeeks: ProgramSetupPreviewWeek[] = [
  week({ index: 0, phaseKey: 'base', phaseLabel: 'Base phase', intensityPercent: 0.7, movements: baseRows() }),
  week({ index: 1, phaseKey: 'base', phaseLabel: 'Base phase', intensityPercent: 0.72, movements: baseRows() }),
  week({ index: 2, phaseKey: 'peak', phaseLabel: 'Peak phase', intensityPercent: 0.85, movements: peakRows() }),
  week({ index: 3, phaseKey: 'peak', phaseLabel: 'Peak phase', intensityPercent: 0.85, movements: peakRows() }),
]

const weeklyWeeks: ProgramSetupPreviewWeek[] = [0, 1, 2].map((index) =>
  week({
    index,
    phaseKey: 'main',
    phaseLabel: 'Main',
    movements: [
      movement({ slotId: 'm1', role: 'main', roleLabel: 'Main 1', defaultMovementName: 'Squat', targetSummary: '5 sets x 5' }),
      movement({ slotId: 'm2', role: 'main', roleLabel: 'Main 2', defaultMovementId: 'bench_press', defaultMovementName: 'Bench Press', targetSummary: '5 sets x 5' }),
    ],
  }),
)

const cycleWeeks: ProgramSetupPreviewWeek[] = [
  week({ index: 0, phaseKey: 'cycle', movements: [movement({ slotId: 'm1', role: 'main', defaultMovementName: 'Squat', targetSummary: '5x5' })] }),
  week({ index: 1, phaseKey: 'cycle', movements: [movement({ slotId: 'm1', role: 'main', defaultMovementId: 'deadlift', defaultMovementName: 'Deadlift', targetSummary: '1x5' })] }),
]

describe('deriveTemplatePhases', () => {
  it('groups a base→peak template into two phases with week ranges', () => {
    const phases = deriveTemplatePhases(phasedWeeks)
    expect(phases.map((phase) => phase.phaseLabel)).toEqual(['Base phase', 'Peak phase'])
    expect(phases[0]).toMatchObject({ weekRange: 'Weeks 1–2', weekCount: 2, firstWeekIndex: 0 })
    expect(phases[1]).toMatchObject({ weekRange: 'Weeks 3–4', weekCount: 2, firstWeekIndex: 2 })
  })

  it('uses a single-week range label when a phase is one week', () => {
    const phases = deriveTemplatePhases([week({ index: 4, phaseKey: 'deload', phaseLabel: 'Deload', movements: baseRows() })])
    expect(phases[0].weekRange).toBe('Week 5')
  })
})

describe('templateStructureMode', () => {
  it('is phased with two distinct phases', () => {
    expect(templateStructureMode(phasedWeeks)).toBe('phased')
  })
  it('is weekly for one repeating week', () => {
    expect(templateStructureMode(weeklyWeeks)).toBe('weekly')
  })
  it('is cycle for one phase with multiple distinct layouts', () => {
    expect(templateStructureMode(cycleWeeks)).toBe('cycle')
  })
})

describe('buildPhaseChangeLine', () => {
  it('reports the main scheme change and the variation swap, accessories unchanged', () => {
    const [base, peak] = deriveTemplatePhases(phasedWeeks)
    const changeLine = buildPhaseChangeLine(base!, peak!)
    expect(changeLine.entries).toEqual([
      { label: 'Main', from: '4 sets x 6+ @ 70%', to: '5 sets x 3+ @ 85%', kind: 'scheme' },
      { label: 'Variation', from: 'Front Squat', to: 'Pause Squat', kind: 'swap' },
    ])
    expect(changeLine.accessoriesUnchanged).toBe(true)
  })
})

describe('buildIntensityRamp', () => {
  it('uses real intensity and labels the start/end percents', () => {
    const ramp = buildIntensityRamp(phasedWeeks)
    expect(ramp.hasRealIntensity).toBe(true)
    expect(ramp.startLabel).toBe('~70%')
    expect(ramp.endLabel).toBe('~85%')
    expect(ramp.linePath.startsWith('M')).toBe(true)
    expect(ramp.areaPath.endsWith('Z')).toBe(true)
  })

  it('falls back to a hardness curve (no percent labels) when intensity is absent', () => {
    const ramp = buildIntensityRamp(weeklyWeeks)
    expect(ramp.hasRealIntensity).toBe(false)
    expect(ramp.startLabel).toBeUndefined()
    expect(ramp.endLabel).toBeUndefined()
  })
})
