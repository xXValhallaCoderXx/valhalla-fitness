import type { Unit, UserProfile } from '~/shared/types'
import { getMovementName } from '~/domains/movement/lib/movements'
import { mround } from '~/domains/program/lib/progression'
import {
  DEFAULT_TRAINING_MAX_PERCENT,
  DEFAULT_WORKING_LOAD_PERCENT,
  suggestedLoadFromOneRepMax,
} from '~/domains/program/lib/program-loads'
import type { CustomProgramBuilderInput } from './custom-templates'

/**
 * Builds an illustrative "this is how your loads progress" example for the Custom Program
 * Builder review step. Loads are anchored to the user's saved 1RM where available (matching the
 * start flow, which derives training max = 90% of 1RM and working load = 75% of 1RM via
 * `suggestedLoadFromOneRepMax`); otherwise an example anchor is hard-coded so new lifters still
 * see concrete numbers. The example assumes average progress — hitting targets each cycle.
 *
 * Percentages / rep schemes mirror the prescription builders in `custom-templates.ts`
 * (`mainTrainingMaxWavePrescription`, `plusSetWaveMainPrescription`, the simple_linear branch).
 */

export type ProgressionPreviewRow = {
  label: string
  scheme: string
  load: number
}

export type ProgressionPreview = {
  movementId: string
  movementName: string
  anchorLabel: 'Training max' | 'Working load'
  anchorValue: number
  isEstimated: boolean
  units: Unit
  note: string
  rows: ProgressionPreviewRow[]
}

// Example anchors (training-max / working-load magnitude, in kg) used only when the user has no
// saved 1RM for the featured lift. Deliberately "average gym" numbers.
const EXAMPLE_ANCHOR_KG: Record<string, number> = {
  squat: 100,
  bench_press: 70,
  deadlift: 120,
  overhead_press: 45,
}
const FALLBACK_EXAMPLE_ANCHOR_KG = 60

const KG_TO_LB = 2.20462

function defaultRounding(units: Unit) {
  return units === 'lb' ? 5 : 2.5
}

function exampleAnchorFor(movementId: string, units: Unit, rounding: number) {
  const kg = EXAMPLE_ANCHOR_KG[movementId] ?? FALLBACK_EXAMPLE_ANCHOR_KG
  return units === 'lb' ? mround(kg * KG_TO_LB, rounding) : kg
}

function standardIncrement(movementId: string, units: Unit) {
  const isUpper = movementId === 'bench_press' || movementId === 'overhead_press' || movementId === 'barbell_row'
  if (units === 'lb') return isUpper ? 5 : 10
  return isUpper ? 2.5 : 5
}

function uniqueMainMovements(draft: CustomProgramBuilderInput) {
  return Array.from(new Set(draft.sessions.map((session) => session.mainMovementId)))
}

function percentScheme(percent: number, reps: number) {
  return `${Math.round(percent * 100)}% × ${reps}+`
}

export function buildProgressionPreview(
  draft: CustomProgramBuilderInput,
  profile: UserProfile | null,
): ProgressionPreview | null {
  if (draft.methodology === 'none') return null

  const units: Unit = profile?.units ?? 'kg'
  const rounding = profile?.rounding ?? defaultRounding(units)
  const defaults = profile?.programStateDefaults ?? {}
  const anchorPercent = draft.methodology === 'simple_linear' ? DEFAULT_WORKING_LOAD_PERCENT : DEFAULT_TRAINING_MAX_PERCENT

  const mains = uniqueMainMovements(draft)
  const resolveSaved = (movementId: string) =>
    suggestedLoadFromOneRepMax(defaults, movementId, anchorPercent, rounding)

  // Prefer a lift the user actually has data for so the example uses real numbers.
  const featured = mains.find((movementId) => resolveSaved(movementId) != null) ?? mains[0]
  if (!featured) return null

  const savedAnchor = resolveSaved(featured)
  const isEstimated = savedAnchor == null
  const anchorValue = savedAnchor ?? exampleAnchorFor(featured, units, rounding)
  const movementName = getMovementName(featured)

  const round = (value: number) => mround(value, rounding)

  if (draft.methodology === 'simple_linear') {
    const increment = standardIncrement(featured, units)
    const rows: ProgressionPreviewRow[] = Array.from({ length: 6 }, (_, index) => ({
      label: `Session ${index + 1}`,
      scheme: '3 × 5',
      load: round(anchorValue + increment * index),
    }))
    return {
      movementId: featured,
      movementName,
      anchorLabel: 'Working load',
      anchorValue,
      isEstimated,
      units,
      note: 'Linear progression: complete every set at target and the load climbs each session.',
      rows,
    }
  }

  if (draft.methodology === 'training_max_wave') {
    const increment = standardIncrement(featured, units)
    const weeks: Array<{ percent: number; reps: number }> = [
      { percent: 0.85, reps: 5 },
      { percent: 0.9, reps: 3 },
      { percent: 0.95, reps: 1 },
    ]
    const rows: ProgressionPreviewRow[] = []
    for (let cycle = 0; cycle < 2; cycle += 1) {
      const cycleTm = anchorValue + increment * cycle
      weeks.forEach((week, weekIndex) => {
        rows.push({
          label: `Cycle ${cycle + 1} · Wk ${weekIndex + 1}`,
          scheme: percentScheme(week.percent, week.reps),
          load: round(cycleTm * week.percent),
        })
      })
    }
    return {
      movementId: featured,
      movementName,
      anchorLabel: 'Training max',
      anchorValue,
      isEstimated,
      units,
      note: `Top-set example over two cycles. Hit your targets and the training max rises ~${increment}${units} per cycle.`,
      rows,
    }
  }

  // plus_set_wave: show the heaviest top set across each base and peak wave.
  const waves: Array<{ label: string; percent: number; reps: number }> = [
    { label: 'Base · Wave 1', percent: 0.7, reps: 6 },
    { label: 'Base · Wave 2', percent: 0.75, reps: 5 },
    { label: 'Base · Wave 3', percent: 0.8, reps: 4 },
    { label: 'Peak · Wave 1', percent: 0.85, reps: 3 },
    { label: 'Peak · Wave 2', percent: 0.88, reps: 2 },
    { label: 'Peak · Wave 3', percent: 0.92, reps: 1 },
  ]
  const rows: ProgressionPreviewRow[] = waves.map((wave) => ({
    label: wave.label,
    scheme: percentScheme(wave.percent, wave.reps),
    load: round(anchorValue * wave.percent),
  }))
  return {
    movementId: featured,
    movementName,
    anchorLabel: 'Training max',
    anchorValue,
    isEstimated,
    units,
    note: 'Loads climb from base to peak; banking extra reps on the + set pushes your training max up.',
    rows,
  }
}
