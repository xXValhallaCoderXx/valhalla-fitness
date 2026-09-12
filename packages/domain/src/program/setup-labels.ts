import type { ExperienceMode } from '@sheetless/domain/account/types'
import type { ProgramStateType } from '@sheetless/domain/program/types'

type ModeLabel = Record<ExperienceMode, string>
const label = (guided: string, full: string): ModeLabel => ({ guided, full })

/**
 * Setup is where Full first shows its hand.
 *
 * Guided sees a recent hard set and the weight it produced; Full sees the e1RM in between, the
 * formula that turns it into a training max, and the two constants that formula uses. The numbers
 * are identical — Guided is a reading mode, not a reduced programme.
 */
export const setupLabels = {
  liftColumn: label('Lift', 'Lift'),
  bestSetColumn: label('A recent hard set', 'Best recent set'),
  e1rmColumn: label('Estimated max', 'e1RM'),
  percentControl: label('Starting share', 'TM percentage'),
  roundingControl: label('Round to', 'Rounding'),
  unitsControl: label('Units', 'Units'),
  weekOnePreview: label('Your first week', 'Week 1 preview'),
  sourceNote: label(
    'Weights come from your logged sets where you have them, and from your saved estimates where you do not.',
    'Best sets come from your history; anything without one uses the saved estimate from Settings › Starting strength. Edit a value to override it for this programme only.',
  ),
} satisfies Record<string, ModeLabel>

export function setupLabel(key: keyof typeof setupLabels, mode: ExperienceMode): string {
  return setupLabels[key][mode]
}

/**
 * The header over the column that actually gets saved.
 *
 * Guided always says "starting weight". Full names the state the programme declared, because a
 * working-load programme has no training max and calling it one would be wrong, not just jargon.
 */
export function setupValueColumnLabel(types: ProgramStateType[], mode: ExperienceMode): string {
  if (mode === 'guided') return 'Starting weight'
  if (types.includes('training_max')) return 'Training max'
  if (types.includes('working_load')) return 'Working load'
  return 'Starting value'
}

/**
 * The library footer: what Sheetless is doing behind every plan.
 *
 * Guided describes the promise; Full describes the mechanism, because the mechanism is the reason
 * to trust the promise.
 */
export const programmeLibraryAbout: Record<ExperienceMode, { title: string; body: string }> = {
  guided: {
    title: 'About Sheetless programming',
    body: 'Every plan here sets your weights from what you have actually lifted, and moves them after each session based on how the reps went. You pick the shape of the week; Sheetless keeps the numbers honest.',
  },
  full: {
    title: 'About Sheetless programming',
    body: 'Every plan is a template definition: weeks × sessions × slots, with each set a prescription against a declared state key. Loads are arithmetic on your logged numbers — percent_of_state, state, fixed or user_selected — rounded to your plate step. Progression rules move the state, never the template.',
  },
}

/** `=MROUND(e1RM × 0.90, 2.5)` — built from the live controls, never restated as a literal. */
export function trainingMaxFormula(percent: number, rounding: number): string {
  return `=MROUND(e1RM × ${(percent / 100).toFixed(2)}, ${rounding})`
}
