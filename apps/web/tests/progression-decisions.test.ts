import { describe, expect, it } from 'vitest'
import type { MovementSlot, ProgramInstance, SetLog, WorkoutSession } from '../src/shared/types'
import { buildProgressionDecisionsForSession } from '../src/domains/program/lib/progression-decisions'

function set(partial: Partial<SetLog>): SetLog {
  return {
    id: `s${partial.setIndex ?? 1}`,
    setIndex: 1,
    completed: true,
    targetRepMin: 8,
    targetRepMax: 12,
    targetRir: 2,
    ...partial,
  } as SetLog
}

function accessory(sets: SetLog[], partial: Partial<MovementSlot> = {}): MovementSlot {
  return {
    id: 'm1',
    movementId: 'cable_crunch',
    movementName: 'Cable Crunch',
    role: 'accessory',
    orderIndex: 1,
    targetSummary: '3 x 8-12',
    progressionRuleId: 'accessory_double_progression',
    sets,
    ...partial,
  } as MovementSlot
}

function session(movements: MovementSlot[]): WorkoutSession {
  return { sessionId: 'sess1', title: 'Bench + Upper Back', units: 'kg', movements } as unknown as WorkoutSession
}

const program = { rounding: 2.5, units: 'kg', stateValues: [] } as unknown as ProgramInstance

describe('buildProgressionDecisionsForSession — accessory add-load decisions', () => {
  it('anchors the suggestion to the heaviest logged weight plus one increment', () => {
    const decisions = buildProgressionDecisionsForSession(
      session([
        accessory([
          set({ setIndex: 1, actualReps: 12, actualRir: 2, actualLoad: 12.5 }),
          set({ setIndex: 2, actualReps: 12, actualRir: 2, actualLoad: 15 }),
          set({ setIndex: 3, actualReps: 12, actualRir: 3, actualLoad: 12.5 }),
        ]),
      ]),
      program,
    )
    expect(decisions).toHaveLength(1)
    expect(decisions[0]).toMatchObject({
      id: 'pending-accessory-cable_crunch',
      ruleId: 'accessory_double_progression',
      recommendation: 'Add load next time',
      previousValue: 15,
      recommendedValue: 17.5,
    })
    expect(decisions[0]!.inputSummary).toContain('15 kg')
    expect(decisions[0]!.rationale).toContain('small increase')
  })

  it('stays qualitative when no set carried weight (bodyweight work)', () => {
    const decisions = buildProgressionDecisionsForSession(
      session([
        accessory([
          set({ setIndex: 1, actualReps: 12, actualRir: 2, actualLoad: null }),
          set({ setIndex: 2, actualReps: 12, actualRir: 2, actualLoad: 0 }),
        ]),
      ]),
      program,
    )
    expect(decisions).toHaveLength(1)
    expect(decisions[0]).toMatchObject({ recommendation: 'Add load next time' })
    expect(decisions[0]!.previousValue).toBeUndefined()
    expect(decisions[0]!.recommendedValue).toBeUndefined()
    expect(decisions[0]!.inputSummary).toBe('Cable Crunch completed the top of the rep range.')
  })

  it('ignores incomplete sets when picking the anchor weight', () => {
    const decisions = buildProgressionDecisionsForSession(
      session([
        accessory([
          set({ setIndex: 1, actualReps: 12, actualRir: 2, actualLoad: 12.5 }),
          set({ setIndex: 2, actualReps: 12, actualRir: 2, actualLoad: 40, completed: false }),
        ]),
      ]),
      program,
    )
    // An incomplete set means incomplete accessory inputs — no decision at all.
    expect(decisions).toEqual([])
  })

  it('produces no decision when the rep-range top was not reached', () => {
    const decisions = buildProgressionDecisionsForSession(
      session([
        accessory([
          set({ setIndex: 1, actualReps: 10, actualRir: 2, actualLoad: 12.5 }),
          set({ setIndex: 2, actualReps: 9, actualRir: 1, actualLoad: 12.5 }),
        ]),
      ]),
      program,
    )
    expect(decisions).toEqual([])
  })
})
