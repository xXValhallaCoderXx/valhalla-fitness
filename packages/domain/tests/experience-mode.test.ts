import { describe, expect, it } from 'vitest'
import {
  experienceModeDescriptions,
  experienceModeLabels,
  fullModeHintCopy,
  shouldOfferFullMode,
} from '../src/account/experience-mode'
import { ESTABLISHED_MIN_SESSIONS } from '../src/history/insight-state'
import { programLoadReferenceCopy } from '../src/program/program-loads'
import { programmeWeekIndex } from '../src/program/program-phase-map'

const base = {
  experienceMode: 'guided' as const,
  completedSessions: ESTABLISHED_MIN_SESSIONS,
  fullModeHintDismissedAt: null,
}

describe('shouldOfferFullMode', () => {
  it('offers Full once the account reaches the established threshold', () => {
    expect(shouldOfferFullMode(base)).toBe(true)
    expect(shouldOfferFullMode({ ...base, completedSessions: ESTABLISHED_MIN_SESSIONS + 40 })).toBe(true)
  })

  it('stays quiet while the account is still building a baseline', () => {
    expect(shouldOfferFullMode({ ...base, completedSessions: ESTABLISHED_MIN_SESSIONS - 1 })).toBe(false)
    expect(shouldOfferFullMode({ ...base, completedSessions: 0 })).toBe(false)
  })

  it('never re-offers once the hint has been answered', () => {
    expect(shouldOfferFullMode({ ...base, fullModeHintDismissedAt: '2026-09-07T10:00:00.000Z' })).toBe(false)
  })

  it('does not offer Full to an account already in Full', () => {
    expect(shouldOfferFullMode({ ...base, experienceMode: 'full' })).toBe(false)
  })

  it('keeps the hint copy in step with the threshold it describes', () => {
    expect(fullModeHintCopy.title).toContain(String(ESTABLISHED_MIN_SESSIONS))
  })
})

describe('experience mode copy', () => {
  it('labels both modes', () => {
    expect(experienceModeLabels).toEqual({ guided: 'Guided', full: 'Full' })
    expect(experienceModeDescriptions.guided).not.toBe(experienceModeDescriptions.full)
  })
})

describe('programLoadReferenceCopy', () => {
  it('speaks plainly in Guided and names training maxes in Full', () => {
    expect(programLoadReferenceCopy('guided', 2.5).label).toBe('Your training weights')
    expect(programLoadReferenceCopy('guided', 2.5).caption).not.toMatch(/MROUND|e1RM|TM/)
    expect(programLoadReferenceCopy('full', 2.5).label).toBe('Training maxes')
  })

  it('shows the derivation with the programme rounding in Full', () => {
    expect(programLoadReferenceCopy('full', 2.5).caption).toContain('MROUND(e1RM × 0.90, 2.5)')
    expect(programLoadReferenceCopy('full', 5).caption).toContain('MROUND(e1RM × 0.90, 5)')
  })
})

describe('programmeWeekIndex', () => {
  const definition = { durationWeeks: 4, daysPerWeek: 3 }

  it('converts a completed-session count into the week of the cycle', () => {
    expect(programmeWeekIndex(0, definition)).toBe(0)
    expect(programmeWeekIndex(2, definition)).toBe(0)
    expect(programmeWeekIndex(3, definition)).toBe(1)
    expect(programmeWeekIndex(11, definition)).toBe(3)
  })

  it('wraps once the programme runs past the end of its cycle', () => {
    expect(programmeWeekIndex(12, definition)).toBe(0)
    expect(programmeWeekIndex(13, { durationWeeks: 2, daysPerWeek: 3 })).toBe(0)
  })

  it('returns null rather than NaN for an unusable definition', () => {
    expect(programmeWeekIndex(4, { durationWeeks: 0, daysPerWeek: 3 })).toBeNull()
    expect(programmeWeekIndex(4, { durationWeeks: 4, daysPerWeek: 0 })).toBeNull()
  })
})
