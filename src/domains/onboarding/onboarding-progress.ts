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

export function hasStrengthEstimate(defaults: ProgramStateDefaults) {
  return Object.entries(defaults).some(
    ([key, value]) => key.endsWith('_one_rep_max') && typeof value === 'number' && value > 0,
  )
}

/** Derive the getting-started checklist from real account state — nothing per-step is stored. */
export function buildOnboardingProgress(input: OnboardingProgressInput): {
  steps: OnboardingStep[]
  allDone: boolean
} {
  const steps: OnboardingStep[] = [
    {
      id: 'plan',
      title: 'Choose a training plan',
      description: 'Pick a plan that fits your experience and schedule.',
      done: input.hasActiveProgram,
    },
    {
      id: 'estimates',
      title: 'Set your strength estimates',
      description: 'Tell Sheetless roughly what you lift so it can set sensible starting weights.',
      done: hasStrengthEstimate(input.programStateDefaults),
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

const SNOOZE_DAYS = 7
/** How long "Skip for now" hides the getting-started checklist before it resurfaces. */
export const ONBOARDING_SNOOZE_MS = SNOOZE_DAYS * 24 * 60 * 60 * 1000

/** True when a snooze timestamp is set and still in the future. */
export function isOnboardingSnoozed(snoozeUntil: number | null, now: number): boolean {
  return typeof snoozeUntil === 'number' && Number.isFinite(snoozeUntil) && snoozeUntil > now
}
