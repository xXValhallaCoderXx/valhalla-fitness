import { describe, expect, it } from 'vitest'
import type { MovementSlot, ProgressionDecision, SessionSummary, SetLog, WorkoutSession } from '../src/shared/types'
import { buildSessionReceipt, summarizeMovementPerformance } from '../src/domains/session/lib/session-receipt'

function set(partial: Partial<SetLog>): SetLog {
  return { id: `s${partial.setIndex ?? 1}`, setIndex: 1, completed: true, ...partial }
}

function movement(partial: Partial<MovementSlot>): MovementSlot {
  return {
    id: 'm1',
    movementId: 'squat',
    movementName: 'Squat',
    role: 'main',
    orderIndex: 0,
    targetSummary: '3x5',
    sets: [],
    ...partial,
  } as MovementSlot
}

function session(movements: MovementSlot[]): WorkoutSession {
  return { sessionId: 'sess1', title: 'Lower A', units: 'kg', movements } as unknown as WorkoutSession
}

function summaryWith(decisions: ProgressionDecision[]): SessionSummary {
  return { decisions } as unknown as SessionSummary
}

describe('summarizeMovementPerformance', () => {
  it('summarizes goal, reps, result, and best set', () => {
    const main = movement({
      sets: [
        set({ setIndex: 1, targetReps: 5, actualReps: 5, actualLoad: 100 }),
        set({ setIndex: 2, targetReps: 5, actualReps: 5, actualLoad: 100 }),
        set({ setIndex: 3, targetReps: 5, actualReps: 9, actualLoad: 100, actualRir: 1, isTopSet: true }),
      ],
    })
    const performance = summarizeMovementPerformance(main, 'kg')
    expect(performance.goal).toBe('3 sets of 5 reps')
    expect(performance.didReps).toEqual([5, 5, 9])
    expect(performance.result).toBe('Beat the target on your best set')
    expect(performance.bestSet?.compact).toBe('100 kg × 9 · ~1 left (RIR 1)')
  })
})

describe('buildSessionReceipt', () => {
  it('turns a progression decision into a learned/change/why entry', () => {
    const main = movement({
      sets: [set({ setIndex: 1, targetReps: 5, actualReps: 5, actualLoad: 100, actualRir: 2, isTopSet: true })],
    })
    const decision: ProgressionDecision = {
      id: 'd1',
      movementId: 'squat',
      movementName: 'Squat',
      ruleId: 'training_max_standard',
      scope: 'cycle',
      status: 'pending',
      inputSummary: 'Squat cycle top sets evaluated as standard.',
      recommendation: 'Move TM from 190 to 195.',
      rationale: 'You beat the target with good effort, so Sheetless progresses the lift.',
      previousValue: 190,
      recommendedValue: 195,
    }
    const [entry] = buildSessionReceipt(session([main]), summaryWith([decision]))
    expect(entry.change).toBe('Move TM from 190 to 195.')
    expect(entry.why).toContain('progresses the lift')
    expect(entry.tone).toBe('success')
  })

  it('reassures when a main lift comes up short with no decision', () => {
    const main = movement({
      sets: [set({ setIndex: 1, targetReps: 5, actualReps: 3, actualLoad: 100, isTopSet: true })],
    })
    const entries = buildSessionReceipt(session([main]))
    const missed = entries.find((entry) => entry.learned.includes('3 reps'))
    expect(missed).toBeDefined()
    expect(missed?.change).toContain('repeat this weight')
  })

  it('explains a substitution as similar work', () => {
    const accessory = movement({
      movementId: 'lat_pulldown',
      movementName: 'Lat Pulldown',
      role: 'accessory',
      performedMovementId: 'pull_up',
      performedMovementName: 'Pull-Up',
      sets: [set({ setIndex: 1, targetReps: 8, actualReps: 8, completed: true })],
    })
    const entry = buildSessionReceipt(session([accessory])).find((item) => item.learned.includes('swapped'))
    expect(entry?.learned).toContain('Lat Pulldown')
    expect(entry?.learned).toContain('Pull-Up')
  })

  it('adds a reassuring entry for a partial session', () => {
    const main = movement({
      sets: [
        set({ setIndex: 1, targetReps: 5, actualReps: 5, completed: true }),
        set({ setIndex: 2, targetReps: 5, completed: false }),
      ],
    })
    const entry = buildSessionReceipt(session([main])).find((item) => item.movementName === 'This session')
    expect(entry?.learned).toBe('You completed 1 of 2 planned sets.')
    expect(entry?.tone).toBe('warning')
  })
})
