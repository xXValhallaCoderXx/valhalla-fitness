import { describe, expect, it } from 'vitest'
import {
  accessoryProgressionRuleId,
  accessoryTargetSummary,
  buildAccessoryInitialSets,
  parseAccessoryRepTarget,
  removeAddedAccessory,
  reorderAddedAccessories,
} from '../src/domains/session/lib/accessories'
import type { MovementSlot } from '../src/shared/types'

function movement(
  id: string,
  orderIndex: number,
  { isAdded = false }: { isAdded?: boolean } = {},
): MovementSlot {
  return {
    id,
    slotId: id,
    movementId: id,
    movementName: id,
    role: 'accessory',
    orderIndex,
    targetSummary: '3 sets',
    sets: [],
    isAdded,
  }
}

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

  it('reorders only added accessories while preserving fixed positions and order indexes', () => {
    const movements = [
      movement('main', 1),
      movement('added-one', 2, { isAdded: true }),
      movement('planned-accessory', 3),
      movement('added-two', 4, { isAdded: true }),
    ]

    const reordered = reorderAddedAccessories(movements, ['added-two', 'added-one'])

    expect(reordered.map((item) => item.id)).toEqual([
      'main',
      'added-two',
      'planned-accessory',
      'added-one',
    ])
    expect(reordered.map((item) => item.orderIndex)).toEqual([1, 2, 3, 4])
    expect(reordered[0]).toBe(movements[0])
    expect(reordered[2]).toBe(movements[2])
  })

  it('requires accessory ordering payloads to be exact and current', () => {
    const movements = [
      movement('planned', 1),
      movement('added-one', 2, { isAdded: true }),
      movement('added-two', 3, { isAdded: true }),
    ]

    expect(() => reorderAddedAccessories(movements, ['added-one', 'added-one'])).toThrow(/duplicate/i)
    expect(() => reorderAddedAccessories(movements, ['added-one'])).toThrow(/every added accessory/i)
    expect(() => reorderAddedAccessories(movements, ['planned', 'added-one'])).toThrow(/only added/i)
    expect(() => reorderAddedAccessories(movements, ['missing', 'added-one'])).toThrow(/stale/i)
  })

  it('removes added accessories without changing planned movement indexes', () => {
    const movements = [
      movement('planned-one', 1),
      movement('added', 2, { isAdded: true }),
      movement('planned-two', 3),
    ]

    expect(removeAddedAccessory(movements, 'added')).toEqual([movements[0], movements[2]])
    expect(() => removeAddedAccessory(movements, 'planned-one')).toThrow(/only added/i)
    expect(() => removeAddedAccessory(movements, 'missing')).toThrow(/no longer/i)
  })

  it('compacts remaining added indexes after removal', () => {
    const movements = [
      movement('planned-one', 1),
      movement('planned-two', 2),
      movement('added-one', 3, { isAdded: true }),
      movement('added-two', 4, { isAdded: true }),
    ]

    const remaining = removeAddedAccessory(movements, 'added-one')

    expect(remaining.map((item) => [item.id, item.orderIndex])).toEqual([
      ['planned-one', 1],
      ['planned-two', 2],
      ['added-two', 3],
    ])
  })
})
