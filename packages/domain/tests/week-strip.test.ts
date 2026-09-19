import { describe, expect, it } from 'vitest'
import { guidedWeekCharacter, guidedWeekDescriptor } from '@sheetless/domain/program/week-character'
import { formatWeekPercentages } from '@sheetless/domain/program/week-percentages'
import { fallbackTemplateDefinitions } from '@sheetless/domain/program/template-definitions'
import type { TemplateDefinition } from '@sheetless/domain/program/types'

describe('guidedWeekDescriptor', () => {
  it('prefers the wave, which is what tells repeated weeks apart', () => {
    // An 18-week programme has six "Base phase" weeks but names its waves.
    expect(
      guidedWeekDescriptor({ phaseLabel: 'Base phase', waveLabel: 'Volume wave', hardness: 'Light' }),
    ).toBe('Volume wave')
    expect(
      guidedWeekDescriptor({ phaseLabel: 'Peak phase', waveLabel: 'Top-set wave', hardness: 'Hard' }),
    ).toBe('Top-set wave')
  })

  it("falls back to the programme's phase word when there is no wave", () => {
    expect(guidedWeekDescriptor({ phaseLabel: 'Peak week', hardness: 'Hard' })).toBe('Peak week')
    expect(guidedWeekDescriptor({ phaseLabel: '5s week', hardness: 'Medium' })).toBe('5s week')
  })

  it('falls back to the hardness character when the template leaves it blank', () => {
    expect(guidedWeekDescriptor({ phaseLabel: '', hardness: 'Hard' })).toBe('the heaviest week')
    expect(guidedWeekDescriptor({ phaseLabel: '   ', hardness: 'Deload' })).toBe('a deload week')
  })

  it('never leaks the hardness token itself', () => {
    for (const hardness of ['Light', 'Medium', 'Hard', 'Deload'] as const) {
      expect(guidedWeekCharacter[hardness]).not.toContain(hardness)
    }
  })
})

describe('formatWeekPercentages', () => {
  // Drive this from the real shipped wave template rather than a fixture, so the string cannot
  // drift from what the programme actually prescribes.
  const wave = Object.values(fallbackTemplateDefinitions).find(
    (definition: TemplateDefinition) => definition.weeks.some((week) => week.phaseLabel === 'Peak week'),
  )

  it('reads the shipped wave template', () => {
    expect(wave).toBeDefined()
  })

  it('renders the ramp and excludes the back-off', () => {
    const peak = wave!.weeks.find((week) => week.phaseLabel === 'Peak week')!
    // Week 3 of the wave is 75/85/95 with five back-off sets at 65%.
    expect(formatWeekPercentages(wave!, peak)).toBe('75 · 85 · 95 % × 5 · 3 · 1+')
  })

  it('renders every week of the cycle', () => {
    const rendered = wave!.weeks.map((week) => formatWeekPercentages(wave!, week))
    expect(rendered.every((value) => value === null)).toBe(false)
    for (const value of rendered) {
      if (value === null) continue
      expect(value).toMatch(/^[\d.]+( · [\d.]+)* % × /)
    }
  })

  it('collapses a block of identical sets instead of repeating the percentage', () => {
    const block = {
      sessions: [{ id: 'd1', title: 'Day 1', estimatedMinutes: 60, slots: [{ id: 's', role: 'main' as const, movementId: 'squat', prescriptionId: 'p' }] }],
    }
    const week = {
      prescriptions: {
        p: {
          targetSummary: '5x6 @ 70%',
          sets: Array.from({ length: 5 }, () => ({
            targetLoad: { kind: 'percent_of_state' as const, stateType: 'training_max' as const, percent: 0.7, default: 'low' as const },
            targetReps: 6,
          })),
        },
      },
    }
    expect(formatWeekPercentages(block, week)).toBe('5 × 70 % × 6')
  })

  it('keeps the ramp format when a block is followed by a distinct top set', () => {
    const mixed = {
      sessions: [{ id: 'd1', title: 'Day 1', estimatedMinutes: 60, slots: [{ id: 's', role: 'main' as const, movementId: 'squat', prescriptionId: 'p' }] }],
    }
    const pct = (percent: number) => ({ kind: 'percent_of_state' as const, stateType: 'training_max' as const, percent, default: 'low' as const })
    const week = {
      prescriptions: {
        p: {
          targetSummary: 'block + top',
          sets: [
            { targetLoad: pct(0.7), targetReps: 6 },
            { targetLoad: pct(0.7), targetReps: 6 },
            { targetLoad: pct(0.9), targetReps: 1, isAmrap: true },
          ],
        },
      },
    }
    expect(formatWeekPercentages(mixed, week)).toBe('2 × 70 % × 6 · 90 % × 1+')
  })

  it('returns null when the main lift is not percentage-driven', () => {
    const fixed = {
      sessions: [{ id: 'd1', title: 'Day 1', estimatedMinutes: 60, slots: [{ id: 's', role: 'main' as const, movementId: 'squat', prescriptionId: 'p' }] }],
    }
    const week = {
      prescriptions: { p: { targetSummary: '5x5', sets: [{ targetLoad: { kind: 'fixed' as const, kg: 60 }, targetReps: 5 }] } },
    }
    expect(formatWeekPercentages(fixed, week)).toBeNull()
  })

  it('returns null when the week has no main prescription', () => {
    expect(formatWeekPercentages({ sessions: [] }, { prescriptions: {} })).toBeNull()
  })
})
