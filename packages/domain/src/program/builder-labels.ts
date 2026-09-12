import type { ExperienceMode } from '@sheetless/domain/account/types'
import type { CustomProgramMethodology } from '@sheetless/domain/program/custom-program-meta'
import {
  SIMPLE_LINEAR_INCREMENT,
  TRAINING_MAX_RESET_FACTOR,
  TRAINING_MAX_STEP,
} from '@sheetless/domain/program/progression'
import { DEFAULT_TRAINING_MAX_PERCENT } from '@sheetless/domain/program/program-loads'

type ModeLabel = Record<ExperienceMode, string>
const label = (guided: string, full: string): ModeLabel => ({ guided, full })

/**
 * The builder in both voices.
 *
 * Guided answers questions and never shows a percentage; Full edits the same object as a grid.
 * Both produce one `TemplateDefinition`, so only the words differ.
 */
export const builderLabels = {
  title: label('Build your own programme', 'Build your own programme'),
  gridHeading: label('Your programme', 'Definition'),
  yourWeek: label('Your week', 'Your week'),
  whatHappens: label('What Sheetless will do', 'Progression rules'),
  seededFromWizard: label('Built from your answers', 'Seeded from wizard'),
  daysQuestion: label('Days a week you can train', 'Days a week you can train'),
} satisfies Record<string, ModeLabel>

export function builderLabel(key: keyof typeof builderLabels, mode: ExperienceMode): string {
  return builderLabels[key][mode]
}

/**
 * A tenth, said as a fraction rather than a percentage — Guided shows no percentages.
 *
 * Reads "a tenth" rather than "a 1 tenth"; only a larger reset needs the number said out loud.
 */
const RESET_TENTHS = Math.round((1 - TRAINING_MAX_RESET_FACTOR) * 10)
const RESET_FRACTION = RESET_TENTHS === 1 ? 'tenth' : `${RESET_TENTHS} tenths`
const START_FRACTION = `${Math.round(DEFAULT_TRAINING_MAX_PERCENT / 10)} tenths`

/**
 * What the chosen methodology will actually do, in sentences.
 *
 * Every number is read from the rule that will run — `TRAINING_MAX_STEP`, `SIMPLE_LINEAR_INCREMENT`
 * and `TRAINING_MAX_RESET_FACTOR` in `progression.ts`. Writing "2.5 kg" as a literal here would
 * keep reading correctly right up until someone changed the rule.
 */
export function progressionPlainRules(methodology: CustomProgramMethodology): string[] {
  if (methodology === 'none') {
    return [
      'Nothing is prescribed — you log whatever you do, and Sheetless keeps the history.',
      'You can turn this into a progressing programme later without losing anything.',
    ]
  }

  if (methodology === 'simple_linear') {
    return [
      `Start a little light — ${START_FRACTION} of your estimates.`,
      `Add weight after every session where you get every rep: ${SIMPLE_LINEAR_INCREMENT.upper} kg for presses, ${SIMPLE_LINEAR_INCREMENT.lower} kg for squats and deadlifts.`,
      `Miss twice at the same weight and it drops a ${RESET_FRACTION} so you can build back up.`,
    ]
  }

  const shared = [
    `Weights come off a training max — about ${START_FRACTION} of your best — so they stay manageable.`,
    `Beat the target with reps to spare and it moves up ${TRAINING_MAX_STEP.standard.upper} kg for presses, ${TRAINING_MAX_STEP.standard.lower} kg for squats and deadlifts.`,
    `Beat it by two or more and the jump doubles to ${TRAINING_MAX_STEP.double.upper} and ${TRAINING_MAX_STEP.double.lower} kg.`,
    `Miss the target reps and it backs off a ${RESET_FRACTION} so you can rebuild it.`,
  ]

  if (methodology === 'plus_set_wave') {
    return [...shared, 'Extra reps on the last set feed straight back into the next wave.']
  }
  return shared
}

/** "About 45 minutes a day before accessories." */
export function estimatedDayLengthLine(estimatedMinutes: number[]): string | null {
  if (!estimatedMinutes.length) return null
  const average = Math.round(
    estimatedMinutes.reduce((total, minutes) => total + minutes, 0) / estimatedMinutes.length / 5,
  ) * 5
  return `About ${average} minutes a day before accessories.`
}
