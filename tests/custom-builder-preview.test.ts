import { describe, expect, it } from 'vitest'
import { buildProgressionPreviews, type ProgressionPreview } from '../src/domains/program/lib/custom-builder-preview'
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
    postWorkoutFeedbackDismissed: true,
    autoStartTimer: true,
    defaultRestSeconds: 120,
  }
}

function find(previews: ProgressionPreview[], movementId: string) {
  const preview = previews.find((item) => item.movementId === movementId)
  if (!preview) throw new Error(`No preview for ${movementId}`)
  return preview
}

describe('buildProgressionPreviews', () => {
  it('returns no previews for logger programmes', () => {
    expect(buildProgressionPreviews(draftFor('none', 3), null)).toEqual([])
  })

  it('builds one preview per distinct main lift', () => {
    // 4-day default mains are squat / bench / deadlift / overhead press.
    const previews = buildProgressionPreviews(draftFor('training_max_wave', 4), null)
    expect(previews.map((preview) => preview.movementId)).toEqual([
      'squat',
      'bench_press',
      'deadlift',
      'overhead_press',
    ])
  })

  it('deduplicates repeated main lifts', () => {
    const base = draftFor('training_max_wave', 2)
    const draft = { ...base, sessions: base.sessions.map((session) => ({ ...session, mainMovementId: 'squat' })) }
    const previews = buildProgressionPreviews(draft, null)
    expect(previews).toHaveLength(1)
    expect(previews[0]!.movementId).toBe('squat')
  })

  it('uses an example anchor when the user has no saved 1RM', () => {
    const squat = find(buildProgressionPreviews(draftFor('training_max_wave', 4), null), 'squat')
    expect(squat.isEstimated).toBe(true)
    expect(squat.anchorLabel).toBe('Training max')
    expect(squat.anchorValue).toBe(100)
    expect(squat.rows).toHaveLength(6)
  })

  it('derives the training max from a saved 1RM (90%) per lift', () => {
    const previews = buildProgressionPreviews(draftFor('training_max_wave', 4), makeProfile({ squat_one_rep_max: 150 }))
    const squat = find(previews, 'squat')
    expect(squat.isEstimated).toBe(false)
    expect(squat.anchorValue).toBe(135) // mround(150 * 0.9, 2.5)
    expect(squat.rows[0]!.scheme).toBe('85% × 5+')
    expect(squat.rows[0]!.load).toBe(115) // mround(135 * 0.85, 2.5)
    expect(squat.rows[3]!.label).toBe('Cycle 2 · Wk 1')
    expect(squat.rows[3]!.load).toBe(120) // mround((135 + 5) * 0.85, 2.5)
    // A lift without a saved 1RM still gets an example preview.
    expect(find(previews, 'bench_press').isEstimated).toBe(true)
  })

  it('builds a climbing working-load example for simple linear', () => {
    const squat = find(buildProgressionPreviews(draftFor('simple_linear', 3), null), 'squat')
    expect(squat.anchorLabel).toBe('Working load')
    expect(squat.rows).toHaveLength(6)
    expect(squat.rows.every((row) => row.scheme === '3 × 5')).toBe(true)
    expect(squat.rows[0]!.load).toBe(100)
    expect(squat.rows[1]!.load).toBe(105) // +5kg lower-body increment
    expect(squat.rows[5]!.load).toBe(125)
  })

  it('shows base-to-peak waves for plus-set wave', () => {
    const squat = find(buildProgressionPreviews(draftFor('plus_set_wave', 4), null), 'squat')
    expect(squat.rows).toHaveLength(6)
    expect(squat.rows[0]!.scheme).toBe('70% × 6+')
    expect(squat.rows[5]!.scheme).toBe('92% × 1+')
    const loads = squat.rows.map((row) => row.load)
    expect([...loads].sort((a, b) => a - b)).toEqual(loads)
  })

  it('anchors each lift to its own saved 1RM, falling back to an example otherwise', () => {
    // 2-day default mains are squat + bench; only bench has a saved 1RM.
    const previews = buildProgressionPreviews(draftFor('training_max_wave', 2), makeProfile({ bench_press_one_rep_max: 100 }))
    expect(previews.map((preview) => preview.movementId)).toEqual(['squat', 'bench_press'])
    expect(find(previews, 'bench_press')).toMatchObject({ isEstimated: false, anchorValue: 90 }) // mround(100 * 0.9, 2.5)
    expect(find(previews, 'squat').isEstimated).toBe(true)
  })

  it('respects pound units for the example anchor', () => {
    const squat = find(buildProgressionPreviews(draftFor('training_max_wave', 4), makeProfile({}, 'lb', 5)), 'squat')
    expect(squat.isEstimated).toBe(true)
    expect(squat.units).toBe('lb')
    expect(squat.anchorValue).toBe(220) // mround(100 * 2.20462, 5)
  })
})
