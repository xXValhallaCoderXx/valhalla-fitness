import type { ProgramStateDefaults, Unit } from '~/shared/types'

export type ThemePreference = 'system' | 'dark' | 'light'

export type Sex = 'male' | 'female'

export type UserProfile = {
  id: string
  email: string | null
  displayName?: string | null
  units: Unit
  rounding: number
  equipmentProfile: string[]
  themePreference: ThemePreference
  timezone: string | null
  programStateDefaults: ProgramStateDefaults
  onboardingCompleted: boolean
  liveOnboardingDismissed: boolean
  /** "Don't ask again" opt-out for the post-workout beta feedback prompt. */
  postWorkoutFeedbackDismissed: boolean
  /** Only used to pick the DOTS coefficient set; null shows the xBW fallback. */
  sex?: Sex | null
  /** Auto-start the in-session rest timer after each completed set. */
  autoStartTimer: boolean
  /** Baseline rest duration (seconds); role multipliers scale off this. */
  defaultRestSeconds: number
}

export type BodyweightEntry = {
  id: string
  /** Calendar date (YYYY-MM-DD) the weight applies to; one entry per day. */
  recordedOn: string
  /** Stored canonically in kg; converted to display units at the edge. */
  weightKg: number
}
