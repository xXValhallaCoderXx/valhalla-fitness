import type { InsightGate } from '~/domains/history/lib/insight-gates'

/**
 * "squat 2 of 4" — how far along a locked insight is.
 *
 * Null once the gate's own count is satisfied, so a card still locked for some other reason does
 * not display a finished-looking counter.
 */
export function gateCounter(gate: InsightGate): string | null {
  const { progress } = gate
  if (!progress || progress.current >= progress.required) return null
  return `${progress.subject ? `${progress.subject} ` : ''}${progress.current} of ${progress.required}`
}
