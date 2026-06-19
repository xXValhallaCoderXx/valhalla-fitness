// Within-session, set-to-set advisory shown live in the logger.
// See docs/Ultimate-workout-plan.md §6.1.

export type SetHint =
  | { kind: 'proceed'; message: string }
  | { kind: 'reduce_next'; message: string }
  | { kind: 'drop_load'; message: string }
  | { kind: 'too_easy'; message: string }

/**
 * Advisory for the NEXT set, given how the current set went.
 * - missed target           -> drop load 10%, never grind a 2nd failed set
 * - hit target, RIR 0-1      -> ease the next set (-1 rep or -10% load)
 * - hit target, RIR >= 4     -> too easy; keep load, flag "raise TM next cycle"
 * - hit target, RIR 2-3      -> proceed as written
 */
export function nextSetHint(targetReps: number, repsDone: number, rir: number): SetHint {
  if (repsDone < targetReps) {
    return {
      kind: 'drop_load',
      message: 'Missed the target — drop ~10% on the next set. Never grind a second failed set.',
    }
  }
  if (rir <= 1) {
    return {
      kind: 'reduce_next',
      message: 'That was a grind — next set drop 1 rep or ~10% load. Don’t add weight.',
    }
  }
  if (rir >= 4) {
    return {
      kind: 'too_easy',
      message: 'Very easy — keep the prescribed load today, and flag "raise TM next cycle".',
    }
  }
  return { kind: 'proceed', message: 'On target — proceed as written.' }
}
