// Core program primitives shared across the engine (and re-used by the state layer).
// Kept dependency-free so the engine stays pure and testable.

export type LiftId = 'squat' | 'bench' | 'deadlift'

/** The four weeks of a 5/3/1 cycle. */
export type WeekName = '5s' | '3s' | '531' | 'deload'

/** What a given calendar day is for. */
export type SessionType = 'squat' | 'bench' | 'deadlift' | 'assist' | 'sport' | 'z2' | 'rest'

/** Outcome band of the end-of-cycle progression evaluation. */
export type ProgressionBand = 'reset' | 'hold' | 'standard' | 'double'

export const LIFT_IDS: readonly LiftId[] = ['squat', 'bench', 'deadlift']

export const LIFT_LABELS: Record<LiftId, string> = {
  squat: 'Squat',
  bench: 'Bench',
  deadlift: 'Deadlift',
}

/** Squat & deadlift get the larger "lower-body" increments; bench is "upper". */
export function isLowerBody(lift: LiftId): boolean {
  return lift === 'squat' || lift === 'deadlift'
}
