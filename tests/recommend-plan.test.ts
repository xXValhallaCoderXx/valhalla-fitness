import { describe, expect, it } from 'vitest'
import { templateCatalog } from '../src/domains/program/lib/templates'
import { recommendPlan } from '../src/domains/program/lib/recommend-plan'

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

  it('respects the training-days preference', () => {
    const result = recommendPlan(templateCatalog, { experience: 'Intermediate', days: 3, goal: 'strength' })
    expect(result?.template.daysPerWeek).toBe(3)
  })

  it('returns null when nothing is available', () => {
    const unavailable = templateCatalog.map((template) => ({ ...template, available: false }))
    expect(recommendPlan(unavailable, { experience: 'Beginner', days: 3, goal: 'simple' })).toBeNull()
  })
})
