import { ESTABLISHED_MIN_SESSIONS } from '@sheetless/domain/history/insight-state'
import type { ExperienceMode } from '@sheetless/domain/account/types'

/**
 * Guided/Full is never asked at sign-up. Full is offered once — on Today, after the account has
 * enough history for the technical view to say anything — and is switched from Settings after
 * that. `ESTABLISHED_MIN_SESSIONS` is the same threshold insight gating uses to call an account
 * established, so the offer lands exactly when the data stops being thin.
 */
export type FullModeHintInput = {
  experienceMode: ExperienceMode
  completedSessions: number
  /** ISO stamp of when the hint was answered; null means it never has been. */
  fullModeHintDismissedAt: string | null
}

export function shouldOfferFullMode({
  experienceMode,
  completedSessions,
  fullModeHintDismissedAt,
}: FullModeHintInput): boolean {
  if (experienceMode !== 'guided') return false
  if (fullModeHintDismissedAt !== null) return false
  return completedSessions >= ESTABLISHED_MIN_SESSIONS
}

export const experienceModeLabels: Record<ExperienceMode, string> = {
  guided: 'Guided',
  full: 'Full',
}

export const experienceModeDescriptions: Record<ExperienceMode, string> = {
  guided: 'Plain words. Sets read as sentences and every number is explained.',
  full: 'Technical notation. Percentages, RIR and estimated maxes on every planned load.',
}

/** Copy for the one-time Today hint. Kept here so both surfaces read the same strings. */
export const fullModeHintCopy = {
  title: `You've logged ${ESTABLISHED_MIN_SESSIONS} sessions — Full mode is ready.`,
  body: 'Technical notation and the reasoning behind every number. Switch whenever you like.',
  confirm: 'Open Settings',
  dismiss: 'Not now',
} as const
