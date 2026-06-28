export type FocusDemoSet = { done: boolean; rir: number | null }

/** Initial set state for the Focus Mode demo (set 1 pre-logged, like the design). */
export const initialFocusDemoSets: FocusDemoSet[] = [
  { done: true, rir: 1 },
  { done: false, rir: null },
  { done: false, rir: null },
  { done: false, rir: null },
  { done: false, rir: null },
]

/** RIR chips offered per set. The last is rendered as "3+". */
export const focusDemoRirOptions = [0, 1, 2, 3] as const

/** Toggle a set complete/incomplete. Completing with no RIR defaults it to 1. */
export function toggleFocusDemoSet(sets: FocusDemoSet[], index: number): FocusDemoSet[] {
  return sets.map((set, i) => {
    if (i !== index) return set
    const done = !set.done
    return { done, rir: done && set.rir == null ? 1 : set.rir }
  })
}

/** Pick an RIR for a set, which also marks it complete. */
export function pickFocusDemoRir(sets: FocusDemoSet[], index: number, value: number): FocusDemoSet[] {
  return sets.map((set, i) => (i === index ? { done: true, rir: value } : set))
}

/** Index of the first not-yet-done set (the "active" row), or -1 when all are done. */
export function firstActiveFocusDemoIndex(sets: FocusDemoSet[]): number {
  return sets.findIndex((set) => !set.done)
}

export type FocusDemoSummary = {
  doneCount: number
  total: number
  donePct: number
  doneLabel: string
}

/** Progress summary for the demo's progress bar and label. */
export function summarizeFocusDemo(sets: FocusDemoSet[]): FocusDemoSummary {
  const total = sets.length
  const doneCount = sets.filter((set) => set.done).length
  const donePct = total === 0 ? 0 : (doneCount / total) * 100
  return { doneCount, total, donePct, doneLabel: `${doneCount} of ${total} sets` }
}
