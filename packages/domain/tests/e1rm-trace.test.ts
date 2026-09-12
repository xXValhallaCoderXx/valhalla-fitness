import { describe, expect, it } from 'vitest'
import { buildE1rmTrace } from '../src/history/e1rm-trace'
import { e1rm } from '../src/shared/math'
import type { E1rmPoint } from '../src/history/types'

const point = (overrides: Partial<E1rmPoint> = {}): E1rmPoint => ({
  date: '2026-07-22',
  sessionId: 'session-1',
  e1rm: 206.5,
  load: 167.5,
  reps: 5,
  rir: 2,
  outlier: false,
  ...overrides,
})

describe('buildE1rmTrace', () => {
  it('shows Epley with reps in reserve, substituted from the logged set', () => {
    const trace = buildE1rmTrace({ point: point(), movementName: 'Deadlift', units: 'kg' })
    expect(trace.expression).toBe('e1RM = load × (1 + (reps + RIR) ÷ 30)')
    expect(trace.substituted).toBe('= 167.5 × (1 + (5 + 2) ÷ 30)')
    expect(trace.evaluated).toBe('= 167.5 × 1.2333')
    expect(trace.result).toBe('206.6 kg')
  })

  it('agrees with the function it is explaining', () => {
    const p = point()
    const trace = buildE1rmTrace({ point: p, movementName: 'Deadlift', units: 'kg' })
    const exact = Math.round(e1rm(p.load, p.reps, p.rir ?? 0) * 10) / 10
    expect(trace.result).toBe(`${exact} kg`)
    // The stored point is rounded to 0.5 by the series builder, so 206.5 vs 206.6 still agrees.
    expect(trace.matchesPlannedLoad).toBe(true)
  })

  it('lists the three logged inputs', () => {
    const trace = buildE1rmTrace({ point: point(), movementName: 'Deadlift', units: 'kg' })
    expect(trace.inputs.map((input) => input.label)).toEqual(['load', 'reps', 'RIR'])
    expect(trace.inputs[2].value).toBe('2')
    expect(trace.inputs[2].provenance).toBe('logged')
  })

  // A set with no effort rating is estimated as if taken to failure. That understates it, and the
  // panel must not imply a rating the lifter never gave.
  it('says when RIR was never logged rather than presenting the clamped 0 as a reading', () => {
    const trace = buildE1rmTrace({ point: point({ rir: null }), movementName: 'Deadlift', units: 'kg' })
    expect(trace.substituted).toBe('= 167.5 × (1 + (5 + 0) ÷ 30)')
    expect(trace.inputs[2].value).toBe('0')
    expect(trace.inputs[2].provenance).toBe('no effort logged — counted as 0')
  })

  it('clamps a negative RIR the same way the maths does', () => {
    const trace = buildE1rmTrace({ point: point({ rir: -3 }), movementName: 'Deadlift', units: 'kg' })
    expect(trace.substituted).toContain('(5 + 0)')
  })

  it('flags a point whose stored value the formula cannot reproduce', () => {
    const stale = point({ e1rm: 150 })
    expect(buildE1rmTrace({ point: stale, movementName: 'Deadlift', units: 'kg' }).matchesPlannedLoad).toBe(false)
  })
})
