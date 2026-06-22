import { describe, expect, it } from 'vitest'
import { expandPlannedSession, programForNextUncompletedSession } from '../src/lib/templates'
import { listFallbackTemplateDefinitions } from '../src/lib/template-definitions'
import { validateTemplateDefinition } from '../src/lib/template-engine'
import type { ProgramInstance } from '../src/types/training'

const program: ProgramInstance = {
  id: 'program-1',
  templateId: 'bromley-bullmastiff',
  templateVersionId: 'template-version-1',
  title: 'Bromley Bullmastiff',
  status: 'active',
  startDate: '2026-06-21',
  units: 'kg',
  rounding: 2.5,
  currentWeekIndex: 0,
  anchors: [
    { movementId: 'squat', anchorType: 'training_max', value: 165 },
    { movementId: 'bench_press', anchorType: 'training_max', value: 110 },
    { movementId: 'deadlift', anchorType: 'training_max', value: 190 },
    { movementId: 'overhead_press', anchorType: 'training_max', value: 75 },
  ],
}

describe('planned session progression', () => {
  it('validates all fallback template definitions', () => {
    for (const definition of listFallbackTemplateDefinitions()) {
      expect(validateTemplateDefinition(definition)).toMatchObject({ ok: true })
    }
  })

  it('keeps 5/3/1 prescriptions on the same cycle week for all four weekly sessions', () => {
    const healthyProgram: ProgramInstance = { ...program, templateId: 'healthy-531-fsl' }
    const sessions = [0, 1, 2, 3].map((currentWeekIndex) =>
      expandPlannedSession({ ...healthyProgram, currentWeekIndex }, '2026-06-21'),
    )

    expect(sessions.map((session) => session.id)).toEqual([
      'squat-day-w1',
      'bench-day-w1',
      'deadlift-day-w1',
      'press-day-w1',
    ])
    expect(sessions.every((session) => session.movements[0]?.sets.find((set) => set.isAmrap)?.targetReps === 5)).toBe(true)
  })

  it('moves 5/3/1 into week two after all four weekly sessions', () => {
    const healthyProgram: ProgramInstance = { ...program, templateId: 'healthy-531-fsl', currentWeekIndex: 4 }
    const nextSession = expandPlannedSession(healthyProgram, '2026-06-21')

    expect(nextSession.id).toBe('squat-day-w2')
    expect(nextSession.movements[0]?.sets.find((set) => set.isAmrap)?.targetReps).toBe(3)
  })

  it('moves Bullmastiff from completed squat day to bench day', () => {
    const nextProgram = programForNextUncompletedSession(program, ['bull-squat-w1'], '2026-06-21')
    const nextSession = expandPlannedSession(nextProgram, '2026-06-21')

    expect(nextProgram.currentWeekIndex).toBe(1)
    expect(nextSession.title).toBe('Bullmastiff Bench')
    expect(nextSession.movements[0]?.movementName).toBe('Bench Press')
    expect(nextSession.id).toBe('bull-bench-w1')
    expect(nextSession.movements[0]?.sets.at(-1)?.targetReps).toBe(6)
  })

  it('keeps Bullmastiff prescriptions on the same programme week for all four weekly sessions', () => {
    const sessions = [0, 1, 2, 3].map((currentWeekIndex) =>
      expandPlannedSession({ ...program, currentWeekIndex }, '2026-06-21'),
    )

    expect(sessions.map((session) => session.id)).toEqual([
      'bull-squat-w1',
      'bull-bench-w1',
      'bull-deadlift-w1',
      'bull-press-w1',
    ])
    expect(sessions.every((session) => session.movements[0]?.sets.at(-1)?.targetReps === 6)).toBe(true)
  })

  it('moves Bullmastiff into peak prescriptions after the 9-week base phase', () => {
    const peakSession = expandPlannedSession({ ...program, currentWeekIndex: 36 }, '2026-06-21')

    expect(peakSession.weekLabel).toContain('Peak Wave 1')
    expect(peakSession.movements[0]?.sets).toHaveLength(5)
    expect(peakSession.movements[0]?.sets.at(-1)?.targetReps).toBe(3)
    expect(peakSession.movements[1]?.movementName).toBe('Pause Squat')
  })

  it('does not advance when the current planned day has not been completed', () => {
    const nextProgram = programForNextUncompletedSession(program, ['bull-bench-w2'], '2026-06-21')
    const nextSession = expandPlannedSession(nextProgram, '2026-06-21')

    expect(nextProgram.currentWeekIndex).toBe(0)
    expect(nextSession.title).toBe('Bullmastiff Squat')
  })

  it('applies future movement overrides only to the matching slot and phase', () => {
    const baseSquat = expandPlannedSession(
      {
        ...program,
        currentWeekIndex: 4,
        movementOverrides: [
          {
            slotId: 'slot-bull-squat-variation',
            phaseKey: 'base',
            role: 'variation',
            originalMovementId: 'front_squat',
            replacementMovementId: 'safety_bar_squat',
            effectiveFromWeekIndex: 1,
          },
        ],
      },
      '2026-06-21',
    )
    const peakSquat = expandPlannedSession(
      {
        ...program,
        currentWeekIndex: 36,
        movementOverrides: [
          {
            slotId: 'slot-bull-squat-variation',
            phaseKey: 'base',
            role: 'variation',
            originalMovementId: 'front_squat',
            replacementMovementId: 'safety_bar_squat',
            effectiveFromWeekIndex: 1,
          },
        ],
      },
      '2026-06-21',
    )

    expect(baseSquat.movements[1]?.movementName).toBe('Safety Bar Squat')
    expect(peakSquat.movements[1]?.movementName).toBe('Pause Squat')
  })

  it('generates 70s Powerlifter first-week base work from DSL data', () => {
    const session = expandPlannedSession(
      { ...program, templateId: 'bromley-70s-powerlifter', title: '70s Powerlifter', currentWeekIndex: 0 },
      '2026-06-21',
    )

    expect(session.title).toBe('70s Bench')
    expect(session.movements.map((movement) => movement.role)).toEqual([
      'main',
      'variation',
      'variation',
      'accessory',
      'accessory',
      'accessory',
    ])
    expect(session.movements[0]?.targetSummary).toBe('3x10 @ 60%')
    expect(session.movements[0]?.sets).toHaveLength(3)
    expect(session.movements[1]?.movementName).toBe('Wide-Grip Bench Press')
  })

  it('generates 70s Powerlifter peak examples without dropping below authored peak percentages', () => {
    const peakSession = expandPlannedSession(
      { ...program, templateId: 'bromley-70s-powerlifter', title: '70s Powerlifter', currentWeekIndex: 36 },
      '2026-06-21',
    )

    expect(peakSession.weekLabel).toContain('Peak Wave 1')
    expect(peakSession.movements[0]?.targetSummary).toBe('5x3 @ 80%')
    expect(peakSession.movements[1]?.movementName).toBe('Pause Bench Press')
    expect(peakSession.movements[1]?.targetSummary).toBe('5x5 @ 70%')
  })

  it('generates Volume/Intensity volume and top-set waves', () => {
    const volumeSession = expandPlannedSession(
      { ...program, templateId: 'bromley-volume-intensity', title: 'Volume/Intensity', currentWeekIndex: 0 },
      '2026-06-21',
    )
    const peakSession = expandPlannedSession(
      { ...program, templateId: 'bromley-volume-intensity', title: 'Volume/Intensity', currentWeekIndex: 9 },
      '2026-06-21',
    )

    expect(volumeSession.title).toBe('Volume/Intensity Monday')
    expect(volumeSession.movements[0]?.targetSummary).toBe('3x12 @ 55%')
    expect(volumeSession.movements[1]?.targetSummary).toBe('65% x F')
    expect(peakSession.weekLabel).toContain('Top-set wave')
    expect(peakSession.movements[0]?.targetSummary).toBe('5x5 @ 75%')
    expect(peakSession.movements[1]?.sets[0]?.targetLoad).toBeNull()
  })
})
