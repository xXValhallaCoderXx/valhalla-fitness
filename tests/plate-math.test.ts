import { describe, expect, it } from 'vitest'
import { computePlateStack, DEFAULT_BAR_WEIGHT, PLATE_INVENTORY } from '../src/domains/session/lib/plate-math'

describe('computePlateStack (kg)', () => {
  it('breaks a clean target into a heaviest-first per-side stack', () => {
    const stack = computePlateStack({ target: 100, barWeight: 20, units: 'kg' })
    expect(stack.perSide).toEqual([25, 15]) // 40 per side
    expect(stack.nearestLoadable).toBe(100)
    expect(stack.leftoverPerSide).toBe(0)
  })

  it('handles a single small plate per side', () => {
    const stack = computePlateStack({ target: 22.5, barWeight: 20, units: 'kg' })
    expect(stack.perSide).toEqual([1.25])
    expect(stack.nearestLoadable).toBe(22.5)
  })

  it('rounds down to the nearest loadable weight and reports the shortfall', () => {
    const stack = computePlateStack({ target: 61, barWeight: 20, units: 'kg' })
    expect(stack.perSide).toEqual([20]) // 20.5 wanted per side; 0.5 unmatched
    expect(stack.nearestLoadable).toBe(60)
    expect(stack.leftoverPerSide).toBe(0.5)
  })

  it('returns just the bar when the target is at or below bar weight', () => {
    expect(computePlateStack({ target: 20, barWeight: 20, units: 'kg' })).toMatchObject({
      perSide: [],
      nearestLoadable: 20,
      leftoverPerSide: 0,
    })
    expect(computePlateStack({ target: 15, barWeight: 20, units: 'kg' })).toMatchObject({
      perSide: [],
      nearestLoadable: 20,
    })
  })

  it('never leaves floating-point crumbs in the stack sum', () => {
    const stack = computePlateStack({ target: 47.5, barWeight: 20, units: 'kg' })
    expect(stack.perSide.reduce((a, b) => a + b, 0)).toBeCloseTo(13.75)
    expect(stack.nearestLoadable).toBe(47.5)
    expect(stack.leftoverPerSide).toBe(0)
  })
})

describe('computePlateStack (lb)', () => {
  it('solves a classic 225 lb bar', () => {
    const stack = computePlateStack({ target: 225, barWeight: 45, units: 'lb' })
    expect(stack.perSide).toEqual([45, 45]) // 90 per side
    expect(stack.nearestLoadable).toBe(225)
  })
})

describe('computePlateStack (custom inventory)', () => {
  it('respects a restricted plate set', () => {
    const stack = computePlateStack({ target: 100, barWeight: 20, units: 'kg', inventory: [10, 5] })
    expect(stack.perSide).toEqual([10, 10, 10, 10]) // only 10s available → 40 per side
    expect(stack.nearestLoadable).toBe(100)
    expect(stack.leftoverPerSide).toBe(0)
  })
})

describe('defaults', () => {
  it('exposes standard bars and inventories', () => {
    expect(DEFAULT_BAR_WEIGHT).toEqual({ kg: 20, lb: 45 })
    expect(PLATE_INVENTORY.kg[0]).toBe(25)
    expect(PLATE_INVENTORY.lb[0]).toBe(45)
  })
})
