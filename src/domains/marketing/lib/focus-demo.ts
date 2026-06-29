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
