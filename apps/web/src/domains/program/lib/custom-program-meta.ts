import type { Movement } from '~/shared/types'
import { movementCatalog } from '~/domains/movement/lib/movements'

/**
 * Presentation metadata + defaults for the Custom Program Builder, kept free of the DSL
 * generator (and zod) so the client wizard can import it without bundling template-engine
 * or `buildCustomProgramTemplateDefinition`. The generator itself lives in
 * `custom-templates.ts` and is reached only through server functions.
 */

export const customProgramMethodologyValues = ['none', 'training_max_wave', 'plus_set_wave', 'simple_linear'] as const

export type CustomProgramMethodology = (typeof customProgramMethodologyValues)[number]

/**
 * Hand-written mirror of `customProgramBuilderInputSchema`'s output type so this module
 * stays zod-free. A compile-time equality guard in `custom-templates.ts` keeps the two
 * in lockstep — change them together.
 */
export type CustomProgramBuilderInput = {
    name: string
    goal?: string | null
    methodology: CustomProgramMethodology
    daysPerWeek: number
    sessions: Array<{
        title: string
        mainMovementId: string
        variationMovementId?: string | null
        mainSetCount: number
        mainTargetReps: number
        mainTargetRir?: number | null
        accessories: Array<{
            movementId: string
            setCount: number
            repMin: number
            repMax: number
            targetRir?: number | null
            progressionMethod: 'history_only' | 'double_progression'
        }>
        loggerExercises: Array<{
            movementId: string
            setCount: number
            repMin: number
            repMax: number
            targetRir?: number | null
        }>
    }>
}

export const MAX_ACCESSORIES_PER_DAY = 6
export const MAX_LOGGER_EXERCISES_PER_DAY = 12

export const customProgramMethodologies: Record<
  CustomProgramMethodology,
  {
    label: string
    shortLabel: string
    description: string
    tooltip: string
    regulationSummary: string
    progressionLabel: string
    complexity: string
    tag: string
  }
> = {
  none: {
    label: 'None (logger only)',
    shortLabel: 'Logger only',
    description: 'Structured sessions repeat as written and loads are chosen while training.',
    tooltip: 'No automatic recommendations are created; workouts are logged for history only.',
    regulationSummary: 'Sheetless will not regulate loads or progressions. Every set uses a user-selected load.',
    progressionLabel: 'Logger only',
    complexity: 'Custom',
    tag: 'logger',
  },
  training_max_wave: {
    label: 'Training Max Wave',
    shortLabel: 'TM Wave',
    description: 'Training-max state drives percentage main work and cycle-to-cycle recommendations.',
    tooltip: 'Regulates only main-lift training-max changes through the training-max band rule.',
    regulationSummary: 'Sheetless regulates main-lift training maxes from the cycle top sets.',
    progressionLabel: 'Training-max band',
    complexity: 'Intermediate',
    tag: 'training max',
  },
  plus_set_wave: {
    label: 'Plus-Set Wave Block',
    shortLabel: 'Plus-set wave',
    description: 'Base-to-peak waves use anchored percentages and plus-set regulation for main lifts.',
    tooltip: 'Regulates main-lift plus sets with plus_set_wave; variation and phase structure are planned only in v1.',
    regulationSummary: 'Sheetless regulates main-lift training maxes from plus sets; variations and accessories stay planned.',
    progressionLabel: 'Plus-set wave',
    complexity: 'Advanced',
    tag: 'wave',
  },
  simple_linear: {
    label: 'Simple linear progression',
    shortLabel: 'Linear',
    description: 'Repeat fixed sets and reps, then recommend conservative load increases after completed work.',
    tooltip: 'Regulates main lifts only when all target work is completed at or above target reps and RIR.',
    regulationSummary: 'Sheetless regulates main-lift working loads after completed 3x5 work.',
    progressionLabel: 'Linear completion',
    complexity: 'Beginner',
    tag: 'linear',
  },
}

export function anchorMovementIdFor(movementId: string, catalog: Record<string, Movement>) {
  const movement = catalog[movementId]
  return movement?.variationOf ?? movementId
}

export function clampDaysPerWeek(daysPerWeek: number) {
  if (!Number.isFinite(daysPerWeek)) return 3
  return Math.min(7, Math.max(1, Math.round(daysPerWeek)))
}

export function customSessionTitle(index: number, movementId: string, catalog: Record<string, Movement>) {
  const movementName = catalog[movementId]?.name ?? movementId
  return `Day ${index + 1} - ${movementName} day`
}

export function createDefaultCustomProgramBuilderInput({
  methodology = 'none',
  daysPerWeek = 3,
}: {
  methodology?: CustomProgramMethodology
  daysPerWeek?: number
} = {}): CustomProgramBuilderInput {
  const normalizedDaysPerWeek = clampDaysPerWeek(daysPerWeek)
  // Seven distinct day templates so 5-7 day programmes stay balanced without simply
  // duplicating heavy main work. Days 5-7 reuse a competition main (required) but with a
  // different variation and accessory focus to keep weekly volume varied and recoverable.
  const dayDefaults = [
    { mainMovementId: 'squat', variation: 'front_squat', accessoryMovementId: 'leg_press' },
    { mainMovementId: 'bench_press', variation: 'close_grip_bench_press', accessoryMovementId: 'chest_supported_row' },
    { mainMovementId: 'deadlift', variation: 'romanian_deadlift', accessoryMovementId: 'hamstring_curl' },
    { mainMovementId: 'overhead_press', variation: 'push_press', accessoryMovementId: 'face_pull' },
    { mainMovementId: 'squat', variation: 'pause_squat', accessoryMovementId: 'split_squat' },
    { mainMovementId: 'bench_press', variation: 'incline_bench_press', accessoryMovementId: 'dumbbell_row' },
    { mainMovementId: 'deadlift', variation: 'stiff_leg_deadlift', accessoryMovementId: 'back_extension' },
  ]

  return {
    name: 'Custom programme',
    goal: '',
    methodology,
    daysPerWeek: normalizedDaysPerWeek,
    sessions: Array.from({ length: normalizedDaysPerWeek }, (_, index) => {
      const day = dayDefaults[index % dayDefaults.length]!
      return {
        title: methodology === 'none' ? `Day ${index + 1}` : customSessionTitle(index, day.mainMovementId, movementCatalog),
        mainMovementId: day.mainMovementId,
        variationMovementId: methodology === 'plus_set_wave' ? day.variation : null,
        mainSetCount: methodology === 'simple_linear' ? 3 : 4,
        mainTargetReps: methodology === 'simple_linear' ? 5 : 8,
        mainTargetRir: methodology === 'none' ? 2 : 1,
        accessories: methodology === 'none' ? [] : [
          {
            movementId: day.accessoryMovementId,
            setCount: 3,
            repMin: 10,
            repMax: 15,
            progressionMethod: 'history_only',
          },
        ],
        loggerExercises: methodology === 'none'
          ? [
              {
                movementId: day.mainMovementId,
                setCount: 3,
                repMin: 5,
                repMax: 5,
                targetRir: 2,
              },
              {
                movementId: day.accessoryMovementId,
                setCount: 3,
                repMin: 10,
                repMax: 15,
                targetRir: 2,
              },
            ]
          : [],
      }
    }),
  }
}
