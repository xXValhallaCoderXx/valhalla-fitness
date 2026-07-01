import { describe, expect, it } from 'vitest'
import { templateCatalog } from '../src/domains/program/lib/templates'
import { templateFamilies } from '../src/domains/program/lib/template-families'
import { recommendFamilies } from '../src/domains/program/lib/recommend-plan'
import type { FindMyPlanAnswers } from '../src/domains/program/lib/recommend-plan'

const top = (answers: FindMyPlanAnswers) => recommendFamilies(templateCatalog, templateFamilies, answers)[0]

describe('recommendFamilies', () => {
  it('recommends the beginner linear family (3-day 5x5) for a new lifter keeping it simple', () => {
    const result = top({ experience: 'Beginner', days: 3, goal: 'simple' })
    expect(result?.family.id).toBe('beginner_linear_strength')
    expect(result?.template.id).toBe('generic_alternating_5x5_lp')
    expect(result?.reason).toContain('beginner')
  })

  it('recommends the training-max wave for an intermediate chasing strength', () => {
    const result = top({ experience: 'Intermediate', days: 4, goal: 'strength' })
    expect(result?.family.id).toBe('training_max_wave')
    expect(result?.template.id).toBe('healthy-531-fsl')
  })

  it('recommends the powerbuilding family (old-school wave) for an advanced muscle-and-strength goal', () => {
    const result = top({ experience: 'Advanced', days: 4, goal: 'muscle' })
    expect(result?.family.id).toBe('powerbuilding')
    expect(result?.template.id).toBe('bromley-bullmastiff')
  })

  it('recommends the four-day beginner split when a beginner wants four days', () => {
    const result = top({ experience: 'Beginner', days: 4, goal: 'simple' })
    expect(result?.family.id).toBe('beginner_linear_strength')
    expect(result?.template.id).toBe('beginner_upper_lower_lp')
  })

  it('recommends ramping 5x5 for an intermediate at three days keeping it simple', () => {
    const result = top({ experience: 'Intermediate', days: 3, goal: 'simple' })
    expect(result?.family.id).toBe('intermediate_strength')
    expect(result?.template.id).toBe('ramping_5x5_3day')
  })

  it('recommends power + hypertrophy for an intermediate at four days chasing muscle', () => {
    const result = top({ experience: 'Intermediate', days: 4, goal: 'muscle' })
    expect(result?.family.id).toBe('powerbuilding')
    expect(result?.template.id).toBe('power_hypertrophy_ul')
  })

  it('recommends the advanced three-day intensity plan for an advanced lifter chasing strength', () => {
    const result = top({ experience: 'Advanced', days: 3, goal: 'strength' })
    expect(result?.family.id).toBe('intermediate_strength')
    expect(result?.template.id).toBe('weekly_intensity_3day')
  })

  it('respects the training-days preference', () => {
    const result = top({ experience: 'Intermediate', days: 3, goal: 'strength' })
    expect(result?.template.daysPerWeek).toBe(3)
  })

  it('recommends the five-day training-max wave for an intermediate at five days chasing strength', () => {
    const result = top({ experience: 'Intermediate', days: 5, goal: 'strength' })
    expect(result?.family.id).toBe('training_max_wave')
    expect(result?.template.id).toBe('training_max_wave_pump_5day')
    expect(result?.template.daysPerWeek).toBe(5)
  })

  it('recommends the five-day powerbuilding PPL for an intermediate at five days chasing muscle', () => {
    const result = top({ experience: 'Intermediate', days: 5, goal: 'muscle' })
    expect(result?.family.id).toBe('powerbuilding')
    expect(result?.template.id).toBe('power_hypertrophy_ppl_5day')
  })

  it('recommends a beginner five-day split for a new lifter who wants five days', () => {
    const result = top({ experience: 'Beginner', days: 5, goal: 'simple' })
    expect(result?.family.id).toBe('beginner_linear_strength')
    expect(result?.template.id).toBe('beginner_ppl_upper_lower_5day_lp')
    expect(result?.template.daysPerWeek).toBe(5)
  })

  it('returns nothing when no variants are available', () => {
    const unavailable = templateCatalog.map((template) => ({ ...template, available: false }))
    expect(recommendFamilies(unavailable, templateFamilies, { experience: 'Beginner', days: 3, goal: 'simple' })).toEqual([])
  })

  it('ranks several distinct families, best fit first, led by the top pick', () => {
    const answers = { experience: 'Beginner', days: 4, goal: 'simple' } as const
    const results = recommendFamilies(templateCatalog, templateFamilies, answers, 3)
    expect(results).toHaveLength(3)
    expect(results[0]?.family.id).toBe('beginner_linear_strength')
    expect(results[0]?.template.id).toBe('beginner_upper_lower_lp')
    expect(new Set(results.map((result) => result.family.id)).size).toBe(3)
  })

  it('respects the requested limit and never exceeds the catalogue', () => {
    expect(recommendFamilies(templateCatalog, templateFamilies, { experience: 'Beginner', days: 3, goal: 'simple' }, 2)).toHaveLength(2)
    expect(recommendFamilies([], templateFamilies, { experience: 'Beginner', days: 3, goal: 'simple' })).toEqual([])
  })
})
