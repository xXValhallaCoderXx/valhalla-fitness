/**
 * A logged load is external resistance only when it is finite and greater than
 * zero. Zero is the explicit bodyweight/loadless value; null also covers
 * unset and legacy loadless rows.
 */
export function isPositiveLoad(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/** Normalize a raw load for derived records, volume, e1RM, and display models. */
export function externalLoadOrNull(value: unknown): number | null {
  return isPositiveLoad(value) ? value : null
}
