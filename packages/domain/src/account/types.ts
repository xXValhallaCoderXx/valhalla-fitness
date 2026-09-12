import type { ProgramStateDefaults, Unit } from '@sheetless/domain/shared/types'

export type ThemePreference = 'system' | 'dark' | 'light'

export type Sex = 'male' | 'female'

/**
 * How much the interface explains. `guided` speaks plain words and is the default for every
 * account; `full` swaps in technical notation. Nobody is ever asked which they are — Today
 * offers `full` once the account has history, and Settings switches it either way.
 */
export type ExperienceMode = 'guided' | 'full'

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
  /** Reading mode for planned numbers and set notation. */
  experienceMode: ExperienceMode
  /** Full-mode only: render planned loads as spreadsheet expressions. */
  showFormulas: boolean
  /** When the one-time "Full mode is ready" hint was answered; null means unanswered. */
  fullModeHintDismissedAt: string | null
}

export type BodyweightEntry = {
  id: string
  /** Calendar date (YYYY-MM-DD) the weight applies to; one entry per day. */
  recordedOn: string
  /** Stored canonically in kg; converted to display units at the edge. */
  weightKg: number
}
