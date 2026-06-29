import { describe, expect, it } from 'vitest'
import type { PreviousComparable } from '../src/shared/types'
import { formatPreviousShort } from '../src/domains/session/components/live-session-utils'

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
