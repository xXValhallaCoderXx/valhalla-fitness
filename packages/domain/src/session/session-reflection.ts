export const SESSION_RPE_MIN = 1
export const SESSION_RPE_MAX = 10
export const REFLECTION_MAX_LENGTH = 200

export const sessionRpeQuestion = 'How hard was that?'
export const sessionRpeEndLabels = { low: '1 = easy', high: '10 = max effort' }
export const reflectionWinPrompt = 'One thing that went well?'
export const reflectionImprovePrompt = 'One thing to work on?'

/**
 * A valid whole-number rating 1–10, or null. Bad input means "skipped" —
 * reject rather than clamp, so a mangled payload never fabricates a rating.
 */
export function normalizeSessionRpe(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  if (value < SESSION_RPE_MIN || value > SESSION_RPE_MAX) return null
  return value
}

/** Trimmed, length-capped reflection text; empty or non-string input becomes null. */
export function normalizeReflection(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, REFLECTION_MAX_LENGTH)
}
