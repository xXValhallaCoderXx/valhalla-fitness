import { describe, expect, it } from 'vitest'
import { buildLastSessionCard } from '@sheetless/domain/session/last-session'
import type { ProgressionDecision } from '@sheetless/domain/program/types'
import type { SetLog, WorkoutSession } from '@sheetless/domain/session/types'

function set(over: Partial<SetLog> = {}): SetLog {
  return {
    id: `s${over.setIndex ?? 1}`,
    setIndex: over.setIndex ?? 1,
    completed: true,
    actualLoad: 90,
    actualReps: 3,
    actualRir: 2,
    targetReps: 3,
    ...over,
  }
}

function session(over: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 'planned-1',
    sessionId: 'sess-1',
    stateVersion: 1,
    status: 'completed',
    title: 'Bench + Upper Back',
    programTitle: 'Training Max Wave',
    templateId: 'tpl',
    weekIndex: 2,
    weekLabel: 'Week 3',
    hardness: 'Hard',
    scheduledDate: '2026-08-06',
    estimatedMinutes: 60,
    units: 'kg',
    rounding: 2.5,
    startedAt: '2026-08-06T17:00:00.000Z',
    completedAt: '2026-08-06T17:52:14.000Z',
    movements: [
      {
        id: 'slot-1',
        movementId: 'bench_press',
        movementName: 'Bench press',
        role: 'main',
        orderIndex: 1,
        targetSummary: '5/3/1',
        sets: [set({ setIndex: 1, isTopSet: true }), set({ setIndex: 2, actualLoad: 80, actualReps: 5 })],
      },
    ],
    ...over,
  }
}

describe('buildLastSessionCard', () => {
  it('builds the Guided card from the session snapshot alone', () => {
    const card = buildLastSessionCard(session({ prs: [] }), 'guided')

    expect(card.title).toBe('Bench + Upper Back')
    // Actual elapsed time, not the template's 60-minute estimate.
    expect(card.meta).toBe('Thu 6 Aug · 53 min')
    expect(card.tiles.map((tile) => [tile.label, tile.value])).toEqual([
      ['sets done', '2 of 2'],
      ['weight moved', '670 kg'],
      ['new bests', '0'],
    ])
    expect(card.linkLabel).toBe('Open session')
  })

  it('highlights the third tile and names the best when a PR was set', () => {
    const card = buildLastSessionCard(
      session({
        prs: [{ movementId: 'bench_press', movementName: 'Bench press', kinds: ['best_e1rm'], load: 90, reps: 3, e1rm: 105, previousLabel: null }],
      }),
      'guided',
    )

    expect(card.tiles[2]).toMatchObject({ label: 'new best', value: '1', highlight: true })
    expect(card.lines[0]).toContain('a new best of')
  })

  it('switches to technical tiles, lines and link in Full', () => {
    const decision: ProgressionDecision = {
      id: 'd1',
      movementId: 'bench_press',
      movementName: 'Bench press',
      stateKey: 'bench_press_training_max',
      stateType: 'training_max',
      ruleId: 'training_max_standard',
      scope: 'cycle',
      status: 'pending',
      inputSummary: '',
      recommendation: '',
      previousValue: 95,
      recommendedValue: 97.5,
    }
    const card = buildLastSessionCard(session({ prs: [] }), 'full', [decision])

    expect(card.tiles[0]).toMatchObject({ label: 'sets', value: '2 / 2' })
    expect(card.tiles[1].label).toBe('tonnage')
    expect(card.tiles[2].label).toBe('bench e1RM')
    expect(card.lines[0]).toMatch(/^Top set .* · e1RM /)
    expect(card.lines[1]).toBe('Pending: TM_bench_press 95 kg → 97.5 kg · training_max_standard')
    expect(card.linkLabel).toBe('Review decisions')
  })

  it('drops the duration when the workout was never bracketed', () => {
    const card = buildLastSessionCard(session({ startedAt: null, completedAt: null }), 'guided')
    expect(card.meta).toBe('Thu 6 Aug')
  })

  it('survives a bodyweight-only session with no best set', () => {
    const card = buildLastSessionCard(
      session({
        movements: [
          {
            id: 'slot-1',
            movementId: 'chin_up',
            movementName: 'Chin-up',
            role: 'accessory',
            orderIndex: 1,
            targetSummary: '3 × 8',
            sets: [set({ setIndex: 1, actualLoad: 0, actualReps: 8, isTopSet: false })],
          },
        ],
      }),
      'full',
    )

    expect(card.tiles[2]).toEqual({ label: 'top e1RM', value: '—' })
    expect(card.lines).toEqual([])
  })
})
