import { describe, expect, it } from 'vitest'
import type { PreviousComparable } from '../src/shared/types'
import { formatPreviousShort, resolveSetRir } from '../src/domains/session/components/live-session-utils'

function previous(extra: Partial<PreviousComparable> = {}): PreviousComparable {
  return { movementId: 'm1', label: 'Last comparable: 90 kg × 5 @ RIR 3 · e1RM 111 kg - 2026-06-29', ...extra }
}

describe('formatPreviousShort', () => {
  it('renders load and reps with the unit', () => {
    expect(formatPreviousShort(previous({ load: 90, reps: 5 }), 'kg')).toBe('90 kg × 5')
  })

  it('drops the unit when none is provided', () => {
    expect(formatPreviousShort(previous({ load: 92.5, reps: 5 }))).toBe('92.5 × 5')
  })

  it('shows BW when there is no load (bodyweight movement)', () => {
    expect(formatPreviousShort(previous({ load: null, reps: 8 }), 'kg')).toBe('BW × 8')
  })

  it('falls back to an em dash when reps are missing', () => {
    expect(formatPreviousShort(previous({ load: 60, reps: null }), 'kg')).toBe('60 kg × —')
  })
})

describe('resolveSetRir', () => {
  it('uses a just-tapped draft over everything else', () => {
    expect(resolveSetRir({ draftRir: 1, savedRir: 3, completed: false, suggestedRir: 2 })).toBe(1)
  })

  it('shows the saved RIR after a set is completed (the carry-over bug)', () => {
    // Set was completed by accepting the carried-over suggestion: no draft, but actualRir was saved.
    expect(resolveSetRir({ savedRir: 2, completed: true })).toBe(2)
  })

  it('keeps RIR 0 visible (not treated as empty)', () => {
    expect(resolveSetRir({ savedRir: 0, completed: true })).toBe(0)
  })

  it('shows the carried-over suggestion while the set is still open', () => {
    expect(resolveSetRir({ completed: false, suggestedRir: 2 })).toBe(2)
  })

  it('ignores the suggestion once the set is completed without a saved value', () => {
    expect(resolveSetRir({ completed: true, suggestedRir: 2 })).toBeUndefined()
  })

  it('is empty for an untouched open set with no suggestion', () => {
    expect(resolveSetRir({ completed: false })).toBeUndefined()
  })
})
