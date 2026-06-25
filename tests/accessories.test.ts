import { describe, expect, it } from 'vitest'
import {
  accessoryProgressionRuleId,
  accessoryTargetSummary,
  buildAccessoryInitialSets,
  parseAccessoryRepTarget,
} from '../src/domains/session/lib/accessories'

describe('accessory prescriptions', () => {
  it('parses rep targets and builds one editable starter set', () => {
    const target = parseAccessoryRepTarget('8-12')

    expect(target).toEqual({
      label: '8-12',
      targetReps: null,
      targetRepMin: 8,
      targetRepMax: 12,
    })
    expect(accessoryTargetSummary(target!, 'history_only')).toBe('8-12 reps · History only')

    const sets = buildAccessoryInitialSets(target!)

    expect(sets).toHaveLength(1)
    expect(sets[0]).toMatchObject({
      id: 'set-1',
      setIndex: 1,
      targetLoad: null,
      targetRepMin: 8,
      targetRepMax: 12,
      targetRir: 2,
      label: '8-12',
    })
  })

  it('maps double progression to the accessory auto-regulation rule', () => {
    expect(accessoryProgressionRuleId('history_only')).toBeNull()
    expect(accessoryProgressionRuleId('double_progression')).toBe('accessory_double_progression')
  })
})
