// Pure strength math. Units = kg throughout. See docs/Ultimate-workout-plan.md §4.

export const DEFAULT_ROUNDING_KG = 2.5

/** Round a weight to the nearest barbell increment (default 2.5 kg). */
export function roundTo(kg: number, increment: number = DEFAULT_ROUNDING_KG): number {
  if (increment <= 0) return kg
  return Math.round(kg / increment) * increment
}

/**
 * Estimated 1RM via Epley, extended with reps-in-reserve:
 *   e1RM = weight * (1 + (reps + rir) / 30)
 * A true 1RM (reps=1, rir=0) returns the weight itself.
 */
export function e1rm(weight: number, reps: number, rir: number): number {
  return weight * (1 + (reps + rir) / 30)
}

/**
 * Training Max from a recent top set:
 *   TM = round(e1RM * tmPct)
 * tmPct is 0.85 for squat/deadlift, 0.80 for bench (shoulder-conservative).
 */
export function trainingMax(
  weight: number,
  reps: number,
  rir: number,
  tmPct: number,
  rounding: number = DEFAULT_ROUNDING_KG,
): number {
  return roundTo(e1rm(weight, reps, rir) * tmPct, rounding)
}

/** Prescribed weight for a working set = round(TM * setPct). */
export function setWeight(
  tm: number,
  setPct: number,
  rounding: number = DEFAULT_ROUNDING_KG,
): number {
  return roundTo(tm * setPct, rounding)
}
