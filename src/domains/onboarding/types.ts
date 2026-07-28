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
