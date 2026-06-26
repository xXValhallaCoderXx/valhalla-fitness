import { describe, expect, it } from 'vitest'
import type { SetLog } from '../src/shared/types'
import { describeLift, describeSet, repsLeftLabel } from '../src/shared/lib/set-notation'

function set(partial: Partial<SetLog>): SetLog {
  return { id: 's1', setIndex: 1, completed: true, ...partial }
}

describe('set notation', () => {
  it('renders plain language with a technical companion', () => {
    const notation = describeLift({ load: 147.5, reps: 7, rir: 3, units: 'kg' })
    expect(notation.plain).toBe('147.5 kg × 7 reps · ~3 left')
    expect(notation.technical).toContain('RIR 3')
    expect(notation.technical).toContain('e1RM')
    expect(notation.compact).toBe('147.5 kg × 7 · ~3 left (RIR 3)')
  })

  it('describes max effort at RIR 0', () => {
    expect(repsLeftLabel(0)).toBe('max effort')
    expect(describeLift({ load: 100, reps: 5, rir: 0, units: 'kg' }).plain).toBe('100 kg × 5 reps · max effort')
  })

  it('omits the reps-left clause when no RIR is logged', () => {
    const notation = describeLift({ load: 100, reps: 5, units: 'kg' })
    expect(notation.plain).toBe('100 kg × 5 reps')
    expect(notation.technical).not.toContain('RIR')
  })

  it('prefers actual values and falls back to targets', () => {
    const logged = describeSet(set({ actualLoad: 102.5, actualReps: 6, actualRir: 2, targetLoad: 100, targetReps: 5 }), 'kg')
    expect(logged.plain).toBe('102.5 kg × 6 reps · ~2 left')

    const planned = describeSet(set({ targetLoad: 80, targetRepMin: 3, targetRepMax: 5, isAmrap: true, completed: false }), 'kg')
    expect(planned.plain).toBe('80 kg × 3-5+ reps')
  })
})
