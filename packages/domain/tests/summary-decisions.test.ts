import { describe, expect, it } from 'vitest'
import { decisionUpdate, pendingDecisionCopy, summaryHeadline, updatesStat } from '@sheetless/domain/session/summary-decisions'
import type { ProgressionDecision } from '@sheetless/domain/program/types'

function decision(over: Partial<ProgressionDecision>): ProgressionDecision {
  return {
    id: 'd1',
    movementId: 'squat',
    movementName: 'Squat',
    ruleId: 'simple_linear_completion',
    scope: 'session',
    status: 'pending',
    inputSummary: 'Hit every target',
    recommendation: 'Add load next time',
    previousValue: 97.5,
    recommendedValue: 100,
    ...over,
  }
}

describe('decisionUpdate', () => {
  it('formats a numeric load increase with from / to / delta', () => {
    expect(decisionUpdate(decision({}), 'kg')).toMatchObject({
      name: 'Squat',
      isNumeric: true,
      fromLabel: '97.5 kg',
      toLabel: '100 kg',
      deltaLabel: '+2.5',
      delta: 2.5,
    })
  })

  it('formats a whole-number delta without decimals', () => {
    expect(decisionUpdate(decision({ previousValue: 150, recommendedValue: 155 }), 'kg').deltaLabel).toBe('+5')
  })

  it('falls back to the recommendation text for a qualitative (no-numbers) decision', () => {
    const update = decisionUpdate(decision({ previousValue: null, recommendedValue: null, recommendation: 'Add load next time' }), 'kg')
    expect(update.isNumeric).toBe(false)
    expect(update.fromLabel).toBeNull()
    expect(update.deltaLabel).toBeNull()
    expect(update.recommendation).toBe('Add load next time')
  })
})

describe('summaryHeadline', () => {
  it('celebrates a fully-logged session', () => {
    expect(summaryHeadline(17, 17)).toBe('Strong session, all logged')
  })
  it('is neutral for a partial session', () => {
    expect(summaryHeadline(12, 17)).toBe('Session logged')
  })
})

describe('pendingDecisionCopy', () => {
  it.each([
    [100, 'These recommendations increase your planned values.'],
    [97.5, 'These recommendations keep your current values.'],
    [90, 'These recommendations reduce your planned values.'],
    [null, 'Review each recommendation and its reason below.'],
    [Number.NaN, 'Review each recommendation and its reason below.'],
  ])('describes a recommendation for %s without claiming targets were met', (recommendedValue, body) => {
    expect(pendingDecisionCopy([decision({ recommendedValue })])).toEqual({ heading: '1 recommendation ready', body })
  })

  it('does not summarize mixed directions or qualitative recommendations as increases', () => {
    const mixed = pendingDecisionCopy([decision({}), decision({ recommendedValue: 90 })])
    expect(mixed).toEqual({ heading: '2 recommendations ready', body: 'Your recommendations include different changes. Review each one below.' })
    expect(pendingDecisionCopy([decision({}), decision({ recommendedValue: null })]).body)
      .toBe('Review each recommendation and its reason below.')
  })
})

describe('updatesStat', () => {
  it('shows the pending count in warning tone', () => {
    expect(updatesStat(3, 0)).toEqual({ value: '3 pending', tone: 'warning' })
  })
  it('shows the applied count in success tone once none are pending', () => {
    expect(updatesStat(0, 2)).toEqual({ value: '2 applied', tone: 'success' })
  })
  it('is neutral with no updates', () => {
    expect(updatesStat(0, 0)).toEqual({ value: '0', tone: 'neutral' })
  })
})
