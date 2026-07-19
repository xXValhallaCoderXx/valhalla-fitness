import type { MovementRole, MovementSlot } from '~/shared/types'

/**
 * Per-role scaling of the user's global default rest. Compounds rest longer than accessories, so
 * the "smart" defaults stay meaningful AND the global setting still moves every value.
 */
export const REST_ROLE_MULTIPLIER: Record<MovementRole, number> = {
  main: 1.5,
  variation: 1.25,
  accessory: 0.75,
  warmup: 0.5,
  event: 1.5,
}

export type RestTimerPrefs = {
  autoStartTimer: boolean
  defaultRestSeconds: number
}

/**
 * How long to rest after completing a set of `slot`. A per-slot override wins; otherwise the
 * global default scaled by the movement role. Returns null when auto-start is off or the resolved
 * duration is non-positive (nothing to time). Pure — unit-tested.
 */
export function resolveRestSeconds(
  slot: Pick<MovementSlot, 'role' | 'restSeconds'>,
  prefs: RestTimerPrefs,
  multipliers: Record<MovementRole, number> = REST_ROLE_MULTIPLIER,
): number | null {
  if (!prefs.autoStartTimer) return null
  if (typeof slot.restSeconds === 'number') return slot.restSeconds > 0 ? slot.restSeconds : null
  const seconds = Math.round(prefs.defaultRestSeconds * (multipliers[slot.role] ?? 1))
  return seconds > 0 ? seconds : null
}

/** Whole seconds left until `endsAt`, floored at 0. Wall-clock based — no accumulator to drift. */
export function remaining(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000))
}

/** Format a duration in seconds as `m:ss`. */
export function formatRest(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
