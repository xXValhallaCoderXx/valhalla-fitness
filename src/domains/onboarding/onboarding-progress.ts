import { defaultProgramStateRequirements } from '~/domains/program/lib/program-state-defaults'
import type { ProgramStateDefaults } from '~/shared/types'

export type OnboardingStepId = 'plan' | 'estimates' | 'firstWorkout'

export type OnboardingStep = {
  id: OnboardingStepId
  title: string
  description: string
  done: boolean
}

export type OnboardingProgressInput = {
  hasActiveProgram: boolean
  programStateDefaults: ProgramStateDefaults
  completedSessions: number
}

/** The main-lift 1RM keys onboarding tracks (mirrors the program's required main lifts). */
function oneRepMaxKeys() {
  return defaultProgramStateRequirements()
    .filter((requirement) => requirement.type === 'one_rep_max')
    .map((requirement) => requirement.key)
}

/** True only when EVERY main-lift 1RM estimate is set — a single value isn't enough to finish setup. */
export function hasAllStrengthEstimates(defaults: ProgramStateDefaults) {
  const keys = oneRepMaxKeys()
  return keys.length > 0 && keys.every((key) => {
    const value = defaults[key]
    return typeof value === 'number' && value > 0
  })
}

/** Derive the getting-started checklist from real account state — nothing per-step is stored. */
export function buildOnboardingProgress(input: OnboardingProgressInput): {
  steps: OnboardingStep[]
  allDone: boolean
} {
  // Estimates come first: a workout needs strength maxes before a plan can set sensible loads.
  const steps: OnboardingStep[] = [
    {
      id: 'estimates',
      title: 'Set your strength estimates',
      description: 'Add an estimate for each main lift so Sheetless can set sensible starting weights.',
      done: hasAllStrengthEstimates(input.programStateDefaults),
    },
    {
      id: 'plan',
      title: 'Choose a training plan',
      description: 'Pick a plan that fits your experience and schedule.',
      done: input.hasActiveProgram,
    },
    {
      id: 'firstWorkout',
      title: 'Finish your first workout',
      description: 'Log a session — Sheetless adapts your next one from how it went.',
      done: input.completedSessions > 0,
    },
  ]
  return { steps, allDone: steps.every((step) => step.done) }
}
