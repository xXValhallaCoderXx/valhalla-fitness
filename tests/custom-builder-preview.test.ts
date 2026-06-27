import { describe, expect, it } from 'vitest'
import { buildProgressionPreview } from '../src/domains/program/lib/custom-builder-preview'
import {
  createDefaultCustomProgramBuilderInput,
  type CustomProgramMethodology,
} from '../src/domains/program/lib/custom-templates'
import type { ProgramStateDefaults, Unit, UserProfile } from '../src/shared/types'

function draftFor(methodology: CustomProgramMethodology, daysPerWeek: number) {
  return createDefaultCustomProgramBuilderInput({ methodology, daysPerWeek })
}

function makeProfile(programStateDefaults: ProgramStateDefaults, units: Unit = 'kg', rounding = 2.5): UserProfile {
  return {
    id: 'user-1',
    email: 'lifter@example.com',
    units,
    rounding,
    equipmentProfile: [],
    themePreference: 'system',
    programStateDefaults,
    onboardingCompleted: true,
    liveOnboardingDismissed: true,
  }
}

describe('buildProgressionPreview', () => {
  it('returns null for logger programmes', () => {
    expect(buildProgressionPreview(draftFor('none', 3), null)).toBeNull()
  })

  it('uses an example anchor when the user has no saved 1RM', () => {
    const preview = buildProgressionPreview(draftFor('training_max_wave', 4), null)
    expect(preview).not.toBeNull()
    expect(preview!.isEstimated).toBe(true)
    expect(preview!.anchorLabel).toBe('Training max')
    expect(preview!.movementId).toBe('squat')
    expect(preview!.anchorValue).toBe(100)
    expect(preview!.rows).toHaveLength(6)
  })

  it('derives the training max from a saved 1RM (90%)', () => {
    const preview = buildProgressionPreview(draftFor('training_max_wave', 4), makeProfile({ squat_one_rep_max: 150 }))
    expect(preview!.isEstimated).toBe(false)
    expect(preview!.anchorValue).toBe(135) // mround(150 * 0.9, 2.5)
    // Cycle 1 · Wk 1 top set is 85% of training max.
    expect(preview!.rows[0]!.scheme).toBe('85% × 5+')
    expect(preview!.rows[0]!.load).toBe(115) // mround(135 * 0.85, 2.5)
    // Second cycle bumps the training max by +5kg (lower body) before recomputing.
    expect(preview!.rows[3]!.label).toBe('Cycle 2 · Wk 1')
    expect(preview!.rows[3]!.load).toBe(120) // mround((135 + 5) * 0.85, 2.5)
  })

  it('builds a climbing working-load example for simple linear', () => {
    const preview = buildProgressionPreview(draftFor('simple_linear', 3), null)
    expect(preview!.anchorLabel).toBe('Working load')
    expect(preview!.rows).toHaveLength(6)
    expect(preview!.rows.every((row) => row.scheme === '3 × 5')).toBe(true)
    expect(preview!.rows[0]!.load).toBe(100)
    expect(preview!.rows[1]!.load).toBe(105) // +5kg lower-body increment
    expect(preview!.rows[5]!.load).toBe(125)
  })

  it('shows base-to-peak waves for plus-set wave', () => {
    const preview = buildProgressionPreview(draftFor('plus_set_wave', 4), null)
    expect(preview!.rows).toHaveLength(6)
    expect(preview!.rows[0]!.scheme).toBe('70% × 6+')
    expect(preview!.rows[5]!.scheme).toBe('92% × 1+')
    // Loads climb monotonically across the block at a fixed anchor.
    const loads = preview!.rows.map((row) => row.load)
    expect([...loads].sort((a, b) => a - b)).toEqual(loads)
  })

  it('features a main lift the user actually has data for', () => {
    // 2-day default mains are squat + bench; only bench has a saved 1RM.
    const preview = buildProgressionPreview(
      draftFor('training_max_wave', 2),
      makeProfile({ bench_press_one_rep_max: 100 }),
    )
    expect(preview!.movementId).toBe('bench_press')
    expect(preview!.isEstimated).toBe(false)
    expect(preview!.anchorValue).toBe(90) // mround(100 * 0.9, 2.5)
  })

  it('respects pound units for the example anchor', () => {
    const preview = buildProgressionPreview(draftFor('training_max_wave', 4), makeProfile({}, 'lb', 5))
    expect(preview!.isEstimated).toBe(true)
    expect(preview!.units).toBe('lb')
    expect(preview!.anchorValue).toBe(220) // mround(100 * 2.20462, 5)
  })
})
