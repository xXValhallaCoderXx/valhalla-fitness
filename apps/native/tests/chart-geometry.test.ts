import { describe, expect, it } from 'vitest'
import {
  adjacentPointIndex,
  isolatedPointIndices,
  nearestPointIndex,
  areaPath,
  domainFor,
  finiteCount,
  niceTicks,
  polylinePath,
  projectPoints,
  sampleAxisLabels,
  type ChartBox,
} from '../src/components/charts/chart-geometry'

const box: ChartBox = { width: 300, height: 100, padLeft: 0, padRight: 0, padTop: 0, padBottom: 0 }

describe('finiteCount', () => {
  it('counts only drawable values', () => {
    expect(finiteCount([1, null, 3, Number.NaN, Number.POSITIVE_INFINITY])).toBe(2)
    expect(finiteCount([])).toBe(0)
  })
})

describe('domainFor', () => {
  it('spans the data', () => {
    expect(domainFor([10, 30, 20])).toEqual([10, 30])
  })

  it('pads a flat series so it cannot collapse onto an edge', () => {
    const [min, max] = domainFor([100, 100, 100])
    expect(min).toBeLessThan(100)
    expect(max).toBeGreaterThan(100)
  })

  it('pads a single point', () => {
    const [min, max] = domainFor([140])
    expect(min).toBeLessThan(140)
    expect(max).toBeGreaterThan(140)
  })

  it('pads a flat series of zeroes without producing a zero-width range', () => {
    expect(domainFor([0, 0])).toEqual([-1, 1])
  })

  it('falls back to a unit range when there is no data at all', () => {
    expect(domainFor([])).toEqual([0, 1])
    expect(domainFor([null, null])).toEqual([0, 1])
  })

  it('anchors to zero on request, for volume-style charts', () => {
    expect(domainFor([120, 180], { includeZero: true })).toEqual([0, 180])
  })

  it('never lets includeZero invert a negative series', () => {
    const [min, max] = domainFor([-40, -10], { includeZero: true })
    expect(min).toBe(-40)
    expect(max).toBe(0)
  })

  it('applies proportional padding', () => {
    expect(domainFor([0, 100], { padPercent: 0.1 })).toEqual([-10, 110])
  })

  it('ignores non-finite values', () => {
    expect(domainFor([Number.NaN, 5, Number.POSITIVE_INFINITY, 15])).toEqual([5, 15])
  })
})

describe('niceTicks', () => {
  it('lands on human-readable increments inside the range', () => {
    const ticks = niceTicks(0, 100)
    expect(ticks).toEqual([0, 25, 50, 75, 100])
  })

  it('never leaves the range', () => {
    for (const tick of niceTicks(7, 93)) {
      expect(tick).toBeGreaterThanOrEqual(7)
      expect(tick).toBeLessThanOrEqual(93)
    }
  })

  it('returns the single value for a flat range instead of inventing an axis', () => {
    expect(niceTicks(50, 50)).toEqual([50])
  })

  it('tolerates a reversed range', () => {
    expect(niceTicks(100, 0)).toEqual([0, 25, 50, 75, 100])
  })

  it('keeps fractional steps clean of float dust', () => {
    for (const tick of niceTicks(0, 1)) {
      expect(String(tick)).not.toMatch(/00000|99999/)
    }
  })

  it('returns nothing for a non-finite range', () => {
    expect(niceTicks(Number.NaN, 10)).toEqual([])
  })
})

describe('projectPoints', () => {
  it('spreads points evenly and inverts the y axis', () => {
    const points = projectPoints([0, 50, 100], box, [0, 100])
    expect(points.map((point) => point.x)).toEqual([0, 150, 300])
    // Highest value sits at the top of the box.
    expect(points[0].y).toBe(100)
    expect(points[1].y).toBe(50)
    expect(points[2].y).toBe(0)
  })

  it('centres a lone point rather than pinning it left', () => {
    expect(projectPoints([42], box, [0, 100])[0].x).toBe(150)
  })

  it('centres vertically when the domain has no span', () => {
    expect(projectPoints([5, 5], box, [5, 5])[0].y).toBe(50)
  })

  it('carries nulls through as gaps, keeping their x slot', () => {
    const points = projectPoints([1, null, 3], box, [1, 3])
    expect(points[1]).toEqual({ x: 150, y: null })
  })

  it('respects padding when placing points', () => {
    const padded: ChartBox = { ...box, padLeft: 20, padRight: 10, padTop: 5, padBottom: 5 }
    const points = projectPoints([0, 100], padded, [0, 100])
    expect(points[0].x).toBe(20)
    expect(points[1].x).toBe(290)
    expect(points[1].y).toBe(5)
  })

  it('does not produce negative geometry when the box is smaller than its padding', () => {
    const tiny: ChartBox = { ...box, width: 10, height: 10, padLeft: 20, padRight: 20, padTop: 20, padBottom: 20 }
    for (const point of projectPoints([1, 2], tiny, [1, 2])) {
      expect(Number.isFinite(point.x)).toBe(true)
      expect(point.y).not.toBeNull()
    }
  })
})

describe('polylinePath', () => {
  it('draws one run as a move plus lines', () => {
    expect(polylinePath(projectPoints([0, 100], box, [0, 100]))).toBe('M0 100 L300 0')
  })

  it('breaks into separate subpaths across a gap', () => {
    const path = polylinePath(projectPoints([0, null, 100], box, [0, 100]))
    expect(path.match(/M/g)).toHaveLength(2)
  })

  it('is empty when there is nothing to draw', () => {
    expect(polylinePath([])).toBe('')
    expect(polylinePath(projectPoints([null, null], box, [0, 1]))).toBe('')
  })

  it('emits a bare move for a lone reading, which the caller draws as a dot', () => {
    expect(polylinePath(projectPoints([50], box, [0, 100]))).toBe('M150 50')
  })
})

describe('areaPath', () => {
  it('closes the run down to the baseline', () => {
    const path = areaPath(projectPoints([0, 100], box, [0, 100]), 100)
    expect(path.startsWith('M0 100')).toBe(true)
    expect(path.endsWith('Z')).toBe(true)
  })

  it('skips a lone point, which has no area', () => {
    expect(areaPath(projectPoints([50], box, [0, 100]), 100)).toBe('')
  })

  it('produces one closed shape per contiguous stretch', () => {
    const path = areaPath(projectPoints([0, 50, null, 80, 100], box, [0, 100]), 100)
    expect(path.match(/Z/g)).toHaveLength(2)
  })
})

describe('sampleAxisLabels', () => {
  it('labels everything when it fits', () => {
    expect(sampleAxisLabels(3, 4)).toEqual([0, 1, 2])
  })

  it('always keeps the first and last', () => {
    const indices = sampleAxisLabels(52, 4)
    expect(indices[0]).toBe(0)
    expect(indices[indices.length - 1]).toBe(51)
    expect(indices.length).toBeLessThanOrEqual(4)
  })

  it('never repeats an index', () => {
    const indices = sampleAxisLabels(5, 4)
    expect(new Set(indices).size).toBe(indices.length)
  })

  it('handles degenerate inputs', () => {
    expect(sampleAxisLabels(0, 4)).toEqual([])
    expect(sampleAxisLabels(1, 4)).toEqual([0])
    expect(sampleAxisLabels(10, 0)).toEqual([])
    expect(sampleAxisLabels(10, 1)).toEqual([9])
  })
})


describe('date coordinates and inspection', () => {
  const box = { width: 120, height: 100, padLeft: 10, padRight: 10, padTop: 0, padBottom: 0 }
  it('spaces irregular readings proportionally while preserving the index default', () => {
    expect(projectPoints([1, 2, 3], box, [0, 4], [0, 1, 10]).map((p) => p.x)).toEqual([10, 20, 110])
    expect(projectPoints([1, 2, 3], box, [0, 4]).map((p) => p.x)).toEqual([10, 60, 110])
    expect(projectPoints([1], box, [0, 4], [100])[0].x).toBe(60)
  })
  it('marks every isolated reading and skips gaps in hit testing and controls', () => {
    const values = [10, null, 20, null, 30, 40]
    const points = projectPoints(values, box, [0, 40])
    expect(isolatedPointIndices(points)).toEqual([0, 2])
    expect(nearestPointIndex(points, 31)).toBe(2)
    expect(adjacentPointIndex(values, 2, -1)).toBe(0)
    expect(adjacentPointIndex(values, 2, 1)).toBe(4)
    expect(adjacentPointIndex(values, null, 1)).toBe(5)
    expect(adjacentPointIndex(values, 5, 1)).toBe(5)
    expect(nearestPointIndex(projectPoints([null], box, [0, 1]), 20)).toBeNull()
  })
})
