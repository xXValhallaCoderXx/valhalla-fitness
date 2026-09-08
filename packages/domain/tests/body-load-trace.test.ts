import { describe, expect, it } from 'vitest'
import { calculateBodyLoad, BODY_LOAD_CONTRIBUTION_LIMIT } from '../src/history/body-load'
import { buildBodyLoadTrace } from '../src/history/body-load-trace'
import type { BodyLoadRegion } from '../src/history/types'

const NOW = new Date('2026-06-22T12:00:00.000Z')

const work = (over: Partial<Parameters<typeof calculateBodyLoad>[0][number]> = {}) => ({
  movementId: 'bench_press',
  movementName: 'Bench Press',
  role: 'main' as const,
  completedSets: 3,
  performedAt: '2026-06-22T10:00:00.000Z',
  ...over,
})

const chestOf = (regions: BodyLoadRegion[]) =>
  regions.find((region) => region.regionId === 'chest') as BodyLoadRegion

describe('calculateBodyLoad contributions', () => {
  it('keeps the parts of the score, one row per occurrence', () => {
    const chest = chestOf(calculateBodyLoad([work()], { now: NOW }).regions)
    expect(chest.contributions).toEqual([
      {
        movementId: 'bench_press',
        movementName: 'Bench Press',
        role: 'main',
        sets: 3,
        roleWeight: 3,
        recencyWeight: 1,
        regionWeight: 0.5,
        score: 4.5,
        performedAt: '2026-06-22T10:00:00.000Z',
      },
    ])
    expect(chest.score).toBe(4.5)
  })

  // The same lift twice in the window carries two different recency weights, so collapsing it to
  // one row would have to invent a single weight that never applied.
  it('does not merge two sessions of the same movement', () => {
    const chest = chestOf(
      calculateBodyLoad([work(), work({ performedAt: '2026-06-20T10:00:00.000Z' })], { now: NOW }).regions,
    )
    expect(chest.contributionCount).toBe(2)
    expect(chest.contributions.map((entry) => entry.recencyWeight)).toEqual([1, 0.65])
  })

  it('caps the list but reports the true count, so a partial sum can be explained', () => {
    const six = Array.from({ length: 6 }, (_, index) =>
      work({ completedSets: index + 1, performedAt: '2026-06-22T10:00:00.000Z' }),
    )
    const chest = chestOf(calculateBodyLoad(six, { now: NOW }).regions)
    expect(chest.contributions).toHaveLength(BODY_LOAD_CONTRIBUTION_LIMIT)
    expect(chest.contributionCount).toBe(6)
    // Highest score first, so the capped list keeps what matters most.
    expect(chest.contributions.map((entry) => entry.sets)).toEqual([6, 5, 4, 3])
  })
})

describe('buildBodyLoadTrace', () => {
  it('states the divisor the percentage is a percentage of', () => {
    const chest = chestOf(calculateBodyLoad([work()], { now: NOW }).regions)
    const trace = buildBodyLoadTrace({ region: chest, windowDays: 7 })
    expect(trace.expression).toBe('impact = Σ(sets × role × recency × muscle share) ÷ 12')
    expect(trace.substituted).toBe('= (4.5) ÷ 12')
    expect(trace.evaluated).toBe('= 4.5 ÷ 12')
    expect(trace.result).toBe('38%')
    expect(trace.matchesPlannedLoad).toBe(true)
  })

  it('shows each session with the multiplication that produced it', () => {
    const chest = chestOf(calculateBodyLoad([work()], { now: NOW }).regions)
    const [input] = buildBodyLoadTrace({ region: chest, windowDays: 7 }).inputs
    expect(input.label).toContain('Bench Press')
    expect(input.value).toBe('4.5')
    expect(input.provenance).toBe('3 sets × main 3 × recency 1 × chest 0.5')
  })

  it('adds the untold remainder as its own term rather than showing a sum that falls short', () => {
    const six = Array.from({ length: 6 }, (_, index) => work({ completedSets: index + 1 }))
    const chest = chestOf(calculateBodyLoad(six, { now: NOW }).regions)
    const trace = buildBodyLoadTrace({ region: chest, windowDays: 7 })

    const remainderRow = trace.inputs[trace.inputs.length - 1]
    expect(remainderRow.label).toBe('+2 more sessions')

    // The visible terms must actually reach the score the division uses.
    const terms = (trace.substituted.match(/[\d.]+/g) ?? []).slice(0, -1).map(Number)
    expect(Math.round(terms.reduce((sum, term) => sum + term, 0) * 10) / 10).toBe(chest.score)
  })

  it('says nothing was logged instead of dressing an absence up as a calculation', () => {
    const calves = calculateBodyLoad([work()], { now: NOW }).regions.find(
      (region) => region.regionId === 'calves',
    ) as BodyLoadRegion
    const trace = buildBodyLoadTrace({ region: calves, windowDays: 7 })
    expect(trace.substituted).toBe('no completed sets in the window')
    expect(trace.evaluated).toBeNull()
    expect(trace.result).toBe('0%')
    expect(trace.inputs[0].provenance).toBe('nothing logged for this muscle yet')
  })
})
