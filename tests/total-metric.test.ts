import { describe, expect, it } from 'vitest'
import {
  formatTotalMetricValue,
  totalMetricFor,
  totalMetricLabel,
  totalMetricValue,
} from '../src/domains/history/lib/total-metric'
import type { TotalPoint } from '../src/shared/types'

const point: TotalPoint = {
  date: '2026-07-01',
  total: 410,
  totalKg: 410,
  bodyweightKg: 63,
  dots: 351.2,
  bwMultiple: 6.5,
}

describe('totalMetricFor', () => {
  it('maps score kind to the matching TotalPoint series', () => {
    expect(totalMetricFor('dots')).toBe('dots')
    expect(totalMetricFor('bw_multiple')).toBe('bwMultiple')
    expect(totalMetricFor('total')).toBe('total')
    // insufficient has no chartable series of its own; fall back to raw total.
    expect(totalMetricFor('insufficient')).toBe('total')
  })
})

describe('totalMetricValue', () => {
  it('reads the requested series off a point', () => {
    expect(totalMetricValue(point, 'dots')).toBe(351.2)
    expect(totalMetricValue(point, 'bwMultiple')).toBe(6.5)
    expect(totalMetricValue(point, 'total')).toBe(410)
  })

  it('passes through null series (gated points) so callers can filter them', () => {
    const partial: TotalPoint = { ...point, dots: null, bwMultiple: null }
    expect(totalMetricValue(partial, 'dots')).toBeNull()
    expect(totalMetricValue(partial, 'bwMultiple')).toBeNull()
    expect(totalMetricValue(partial, 'total')).toBe(410)
  })
})

describe('totalMetricLabel', () => {
  it('labels each metric, folding units into the raw total', () => {
    expect(totalMetricLabel('dots', 'kg')).toBe('DOTS')
    expect(totalMetricLabel('bwMultiple', 'kg')).toBe('x bodyweight')
    expect(totalMetricLabel('total', 'kg')).toBe('Total kg')
    expect(totalMetricLabel('total', 'lb')).toBe('Total lb')
    expect(totalMetricLabel('total', null)).toBe('Total')
  })
})

describe('formatTotalMetricValue', () => {
  it('formats DOTS as a plain number', () => {
    expect(formatTotalMetricValue(351.2, 'dots', 'kg')).toBe('351.2')
  })

  it('formats bodyweight multiple with an x suffix', () => {
    expect(formatTotalMetricValue(6.5, 'bwMultiple', 'kg')).toBe('6.5x')
  })

  it('formats the raw total with its units', () => {
    expect(formatTotalMetricValue(410, 'total', 'kg')).toBe('410 kg')
    expect(formatTotalMetricValue(410, 'total', null)).toBe('410')
  })
})
