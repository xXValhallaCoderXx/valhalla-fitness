import { describe, it, expect } from 'vitest'
import { generateSessionPlan } from '../cycle'

describe('generateSessionPlan — deadlift @ TM 190 (spec §5.2)', () => {
  it('week 1 (5s) top set is 162.5 and FSL is 4×122.5', () => {
    const p = generateSessionPlan('deadlift', 190, 0)
    expect(p.mainSets.map((s) => s.weight)).toEqual([122.5, 142.5, 162.5])
    const top = p.mainSets[2]
    expect(top.isTopSet).toBe(true)
    expect(top.minReps).toBe(5)
    expect(top.isAmrap).toBe(true) // capped AMRAP for deadlift
    expect(p.fslSets).toHaveLength(4) // deadlift = 4 FSL sets
    expect(p.fslSets.every((s) => s.weight === 122.5)).toBe(true)
  })

  it('week 2 (3s) top set is 170', () => {
    const p = generateSessionPlan('deadlift', 190, 1)
    expect(p.mainSets.map((s) => s.weight)).toEqual([132.5, 152.5, 170])
    expect(p.mainSets[2].minReps).toBe(3)
  })

  it('week 3 (5/3/1) top set is 180', () => {
    const p = generateSessionPlan('deadlift', 190, 2)
    expect(p.mainSets.map((s) => s.weight)).toEqual([142.5, 162.5, 180])
    expect(p.mainSets[2].minReps).toBe(1)
  })

  it('week 4 deload = 75/95/115 with no FSL', () => {
    // NB: 0.40*190 = 76 -> nearest 2.5 = 75 (the spec doc text "77.5" was a typo)
    const p = generateSessionPlan('deadlift', 190, 3)
    expect(p.mainSets.map((s) => s.weight)).toEqual([75, 95, 115])
    expect(p.isDeload).toBe(true)
    expect(p.fslSets).toHaveLength(0)
  })
})

describe('generateSessionPlan — lift-specific rules', () => {
  it('squat uses 5 FSL sets', () => {
    expect(generateSessionPlan('squat', 150, 0).fslSets).toHaveLength(5)
  })

  it('bench top set is NEVER amrap and carries the shoulder note', () => {
    const p = generateSessionPlan('bench', 100, 0)
    const top = p.mainSets[2]
    expect(top.isTopSet).toBe(true)
    expect(top.isAmrap).toBe(false)
    expect(top.note).toMatch(/No AMRAP/i)
  })

  it('throws on an invalid week index', () => {
    expect(() => generateSessionPlan('squat', 150, 9)).toThrow()
  })
})
