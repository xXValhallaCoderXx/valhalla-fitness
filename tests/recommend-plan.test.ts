import { describe, expect, it } from 'vitest'
import { templateCatalog } from '../src/domains/program/lib/templates'
import { recommendPlan, recommendPlans } from '../src/domains/program/lib/recommend-plan'

describe('recommendPlan', () => {
  it('recommends the beginner linear plan for a new lifter keeping it simple', () => {
    const result = recommendPlan(templateCatalog, { experience: 'Beginner', days: 3, goal: 'simple' })
    expect(result?.template.id).toBe('generic_alternating_5x5_lp')
    expect(result?.reason).toContain('beginner')
  })

  it('recommends the training-max wave for an intermediate chasing strength', () => {
    const result = recommendPlan(templateCatalog, { experience: 'Intermediate', days: 4, goal: 'strength' })
    expect(result?.template.id).toBe('healthy-531-fsl')
  })

  it('recommends the powerbuilding plan for an advanced muscle-and-strength goal', () => {
    const result = recommendPlan(templateCatalog, { experience: 'Advanced', days: 4, goal: 'muscle' })
    expect(result?.template.id).toBe('bromley-bullmastiff')
  })

  it('recommends the four-day beginner split when a beginner wants four days', () => {
    const result = recommendPlan(templateCatalog, { experience: 'Beginner', days: 4, goal: 'simple' })
    expect(result?.template.id).toBe('beginner_upper_lower_lp')
  })

  it('recommends ramping 5x5 for an intermediate at three days keeping it simple', () => {
    const result = recommendPlan(templateCatalog, { experience: 'Intermediate', days: 3, goal: 'simple' })
    expect(result?.template.id).toBe('ramping_5x5_3day')
  })

  it('recommends power + hypertrophy for an intermediate at four days chasing muscle', () => {
    const result = recommendPlan(templateCatalog, { experience: 'Intermediate', days: 4, goal: 'muscle' })
    expect(result?.template.id).toBe('power_hypertrophy_ul')
  })

  it('recommends the advanced three-day plan for an advanced lifter chasing strength', () => {
    const result = recommendPlan(templateCatalog, { experience: 'Advanced', days: 3, goal: 'strength' })
    expect(result?.template.id).toBe('weekly_intensity_3day')
  })

  it('respects the training-days preference', () => {
    const result = recommendPlan(templateCatalog, { experience: 'Intermediate', days: 3, goal: 'strength' })
    expect(result?.template.daysPerWeek).toBe(3)
  })

  it('returns null when nothing is available', () => {
    const unavailable = templateCatalog.map((template) => ({ ...template, available: false }))
    expect(recommendPlan(unavailable, { experience: 'Beginner', days: 3, goal: 'simple' })).toBeNull()
  })

  it('ranks several distinct plans, best fit first, led by the top pick', () => {
    const answers = { experience: 'Beginner', days: 4, goal: 'simple' } as const
    const results = recommendPlans(templateCatalog, answers, 3)
    expect(results).toHaveLength(3)
    expect(results[0]?.template.id).toBe('beginner_upper_lower_lp')
    expect(results[0]?.template.id).toBe(recommendPlan(templateCatalog, answers)?.template.id)
    expect(new Set(results.map((result) => result.template.id)).size).toBe(3)
  })

  it('respects the requested limit and never exceeds the catalogue', () => {
    expect(recommendPlans(templateCatalog, { experience: 'Beginner', days: 3, goal: 'simple' }, 2)).toHaveLength(2)
    expect(recommendPlans([], { experience: 'Beginner', days: 3, goal: 'simple' })).toEqual([])
  })
})
