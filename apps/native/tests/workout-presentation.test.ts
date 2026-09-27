import { describe, expect, it } from 'vitest'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
import { confirmed, focusValueFontSize, setLogLabel, setRingArcs, workoutSetDetail } from '../src/features/session/focus/workout-display'
import { focusRestTarget } from '../src/features/session/rest-timer/focus-rest'
import { IDLE_REST } from '../src/features/session/rest-timer/rest-timer-context'

const bench: MovementSlot = { id: 'bench', movementId: 'bench_press', movementName: 'Bench', role: 'main', orderIndex: 0,
  targetSummary: '2 × 5', sets: [{ id: 'b1', setIndex: 1, targetLoad: 80, targetReps: 5, actualLoad: 80, actualReps: 5, completed: true },
    { id: 'b2', setIndex: 2, targetLoad: 80, targetReps: 5, completed: false }] }
const row: MovementSlot = { ...bench, id: 'row', movementId: 'row', orderIndex: 1,
  sets: [{ id: 'r1', setIndex: 1, targetLoad: 20, targetReps: 8, completed: false }] }
const session = { movements: [bench, row], units: 'kg', rounding: 2.5 } as WorkoutSession
const rest = { ...IDLE_REST, active: true, endsAt: 200000, durationSeconds: 180, secondsLeft: 153, source: 'b1',
  receipt: { source: 'b1', movementId: 'bench', setIndex: 1, load: 80, reps: 5 } }

describe('workout presentation preserves recorded state', () => {
  it('uses the visible draft in Log, including zero and decimal text, and retains retry/update actions', () => {
    expect(setLogLabel('Log set', { load: '0', reps: '10', rir: null }, 'lb')).toBe('Log 0 lb × 10')
    expect(setLogLabel('Log set', { load: '97,5', reps: '5', rir: null }, 'kg')).toBe('Log 97,5 kg × 5')
    expect(setLogLabel('Retry save', { load: '95', reps: '5', rir: null }, 'kg')).toBe('Retry save')
  })
  it('never paints a pending or failed optimistic completion as confirmed', () => {
    expect(confirmed({ ...bench.sets[0], syncState: 'saving' })).toBe(false)
    expect(confirmed({ ...bench.sets[0], syncState: 'syncFailed' })).toBe(false)
    expect(workoutSetDetail(bench.sets[0], bench, session, false)).toBe('as planned')
    expect(workoutSetDetail({ ...bench.sets[0], actualLoad: null }, bench, session, false)).toBe('logged')
    expect(workoutSetDetail({ ...bench.sets[0], actualRir: null }, bench, session, true)).not.toContain('RIR')
  })
  it('has finite separated arcs for a single set and many sets, and none for invalid counts', () => {
    expect(setRingArcs(0)).toEqual([])
    expect(setRingArcs(1.5)).toEqual([])
    for (const count of [1, 5, 30]) {
      const arcs = setRingArcs(count)
      expect(arcs).toHaveLength(count)
      expect(new Set(arcs).size).toBe(count)
      expect(arcs.join(' ')).not.toMatch(/NaN|Infinity/)
    }
    expect(setRingArcs(1)[0]).toContain('A 110 110 0 1 1')
  })
  it('fits long values at narrow width and larger system text without truncating the draft', () => {
    const regular = focusValueFontSize('95', 393, 1, true)
    const long = focusValueFontSize('1000.5', 320, 1.5, true)
    expect(regular).toBe(64)
    expect(long).toBeLessThan(regular)
    expect(long * 1.5 * 6 * 0.65 + 30 * 1.5).toBeLessThanOrEqual((320 - 32) * 0.76)
  })
})

describe('source-aware Focus rest', () => {
  it('switches to the dock while browsing another set and restores the ring on returning', () => {
    expect(focusRestTarget(session, rest, 'bench', 2)).toMatchObject({ kind: 'set', setIndex: 2 })
    expect(focusRestTarget(session, rest, 'bench', 1)).toBeNull()
    expect(focusRestTarget(session, rest, 'row', 1)).toBeNull()
    expect(focusRestTarget(session, rest, 'bench', 2)).toMatchObject({ kind: 'set' })
  })
  it('follows actual next exercise after the last source set and rejects stale receipts', () => {
    const finishedBench = { ...session, movements: [{ ...bench, sets: bench.sets.map(set => ({ ...set, completed: true })) }, row] }
    const afterLast = { ...rest, source: 'b2', receipt: { ...rest.receipt, source: 'b2', setIndex: 2 } }
    expect(focusRestTarget(finishedBench, afterLast, 'row', 1)).toMatchObject({ kind: 'movement', movementId: 'row' })
    expect(focusRestTarget(finishedBench, { ...afterLast, source: 'different' }, 'row', 1)).toBeNull()
    expect(focusRestTarget(finishedBench, { ...afterLast, active: false }, 'row', 1)).toBeNull()
  })
})
