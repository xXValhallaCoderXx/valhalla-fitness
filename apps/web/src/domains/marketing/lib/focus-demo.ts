import type { MovementSlot, SetLog } from '~/shared/types'

/**
 * Self-contained mock data for the marketing "Built for between sets" demo. The demo renders the
 * REAL Focus components (FocusStepper / FocusRirRow / FocusSetProgressBar / FocusExerciseHeader)
 * against this mock movement, so it mirrors the live logger without any session or network.
 */
export const FOCUS_DEMO_SET_TOTAL = 5
export const FOCUS_DEMO_TARGET_LOAD = 87.5
export const FOCUS_DEMO_TARGET_REPS = 5
export const FOCUS_DEMO_ROUNDING = 2.5

/** A mock Squat movement with set 1 pre-logged (like the real first-set-done state). */
export function createFocusDemoMovement(): MovementSlot {
  return {
    id: 'demo-squat',
    movementId: 'squat',
    movementName: 'Squat',
    role: 'main',
    orderIndex: 0,
    targetSummary: '5×5 @ current working load',
    sets: Array.from(
      { length: FOCUS_DEMO_SET_TOTAL },
      (_, index): SetLog => ({
        id: `demo-set-${index + 1}`,
        setIndex: index + 1,
        targetLoad: FOCUS_DEMO_TARGET_LOAD,
        targetReps: FOCUS_DEMO_TARGET_REPS,
        completed: index === 0,
        actualLoad: index === 0 ? FOCUS_DEMO_TARGET_LOAD : undefined,
        actualReps: index === 0 ? FOCUS_DEMO_TARGET_REPS : undefined,
        actualRir: index === 0 ? 1 : undefined,
      }),
    ),
  }
}

export type FocusDemoDraft = { load: number; reps: number; rir?: number }

/** Seed the draft inputs for a set from its logged/target values. */
export function focusDemoDraftFor(movement: MovementSlot, setIndex: number): FocusDemoDraft {
  const set = movement.sets.find((item) => item.setIndex === setIndex)
  return {
    load: set?.actualLoad ?? set?.targetLoad ?? FOCUS_DEMO_TARGET_LOAD,
    reps: set?.actualReps ?? set?.targetReps ?? FOCUS_DEMO_TARGET_REPS,
    rir: set?.actualRir ?? undefined,
  }
}

/** Immutably mark a set logged with the draft values. */
export function logFocusDemoSet(movement: MovementSlot, setIndex: number, draft: FocusDemoDraft): MovementSlot {
  return {
    ...movement,
    sets: movement.sets.map((set) =>
      set.setIndex === setIndex
        ? { ...set, completed: true, actualLoad: draft.load, actualReps: draft.reps, actualRir: draft.rir }
        : set,
    ),
  }
}

/** Load step the demo nudges by when it progresses or eases back (kg). */
export const FOCUS_DEMO_LOAD_STEP = 5

export type FocusDemoOutcome = 'increase' | 'hold' | 'decrease'

export type FocusDemoProgression = {
  outcome: FocusDemoOutcome
  previousLoad: number
  nextLoad: number
  deltaKg: number
  /** Short uppercase verb shown above the call. */
  eyebrow: string
  /** The call itself (carries the loads). */
  title: string
  /** Plain-language "why". */
  body: string
}

/**
 * The demo's progression call, driven by the reps-in-reserve logged on the final set:
 *  - RIR >= 2  → reps to spare, add a step (+5 kg) next session
 *  - RIR === 1 → dialed in, hold the load (no change — encouraging)
 *  - RIR === 0 → max-effort grinder with nothing left, ease the load back a step
 * A skipped effort (null/undefined RIR) holds the load. Mirrors the spirit of the real
 * `progression.ts` rules (grinder → hold, reps in reserve → progress) in a simplified form.
 */
export function focusDemoProgression(currentLoad: number, finalRir: number | null | undefined): FocusDemoProgression {
  if (finalRir != null && finalRir >= 2) {
    const nextLoad = currentLoad + FOCUS_DEMO_LOAD_STEP
    const repsLeft = finalRir >= 3 ? '3+' : String(finalRir)
    return {
      outcome: 'increase',
      previousLoad: currentLoad,
      nextLoad,
      deltaKg: FOCUS_DEMO_LOAD_STEP,
      eyebrow: 'Add weight',
      title: `${currentLoad} → ${nextLoad} kg`,
      body: `You finished all five sets with ${repsLeft} reps in reserve — strength to spare. That clears the progression rule, so Sheetless moves your squat from ${currentLoad} kg to ${nextLoad} kg next session.`,
    }
  }
  if (finalRir === 0) {
    const nextLoad = Math.max(0, currentLoad - FOCUS_DEMO_LOAD_STEP)
    return {
      outcome: 'decrease',
      previousLoad: currentLoad,
      nextLoad,
      deltaKg: nextLoad - currentLoad,
      eyebrow: 'Ease back',
      title: `${currentLoad} → ${nextLoad} kg`,
      body: `That last set was everything you had — zero reps left. Sheetless eases the load to ${nextLoad} kg next session so your form stays sharp, then you build back up stronger.`,
    }
  }
  return {
    outcome: 'hold',
    previousLoad: currentLoad,
    nextLoad: currentLoad,
    deltaKg: 0,
    eyebrow: 'Hold & repeat',
    title: `Stay at ${currentLoad} kg`,
    body: `Nice work — you owned all five sets at ${currentLoad} kg with about a rep left. No change this session: repeat it to lock in the groove, and your next jump is right around the corner.`,
  }
}
