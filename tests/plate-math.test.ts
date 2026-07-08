import { describe, expect, it } from 'vitest'
import { computePlateStack, DEFAULT_BAR_WEIGHT, PLATE_INVENTORY, plateVisual } from '../src/domains/session/lib/plate-math'

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

describe('plateVisual (kg → IWF colours)', () => {
  it('maps each IWF denomination to its standard colour', () => {
    expect(plateVisual(25, 'kg').fill).toBe('#D42A2A') // red
    expect(plateVisual(20, 'kg').fill).toBe('#2C6FBB') // blue
    expect(plateVisual(15, 'kg').fill).toBe('#E8B923') // yellow
    expect(plateVisual(10, 'kg').fill).toBe('#1F9B57') // green
    expect(plateVisual(5, 'kg').fill).toBe('#F4F4F5') // white
  })

  it('repeats the colour sequence for the change plates', () => {
    expect(plateVisual(2.5, 'kg').fill).toBe('#D42A2A')
    expect(plateVisual(2, 'kg').fill).toBe('#2C6FBB')
    expect(plateVisual(1.5, 'kg').fill).toBe('#E8B923')
    expect(plateVisual(1, 'kg').fill).toBe('#1F9B57')
    expect(plateVisual(0.5, 'kg').fill).toBe('#F4F4F5')
  })

  it('gives light discs a dark label and a stronger rim', () => {
    const white = plateVisual(5, 'kg')
    const yellow = plateVisual(15, 'kg')
    expect(white.textColor).toBe('#1A1A1A')
    expect(yellow.textColor).toBe('#1A1A1A')
    expect(white.border).toBe('rgba(0, 0, 0, 0.42)')
    // Saturated discs get a white label and a lighter rim.
    const red = plateVisual(25, 'kg')
    expect(red.textColor).toBe('#FFFFFF')
    expect(red.border).toBe('rgba(0, 0, 0, 0.28)')
  })

  it('falls back to neutral grey for 1.25 kg (not an IWF colour) and unknown weights', () => {
    expect(plateVisual(1.25, 'kg').fill).toBe('#B8BCC4')
    expect(plateVisual(3.3, 'kg').fill).toBe('#B8BCC4')
    expect(() => plateVisual(999, 'kg')).not.toThrow()
  })
})

describe('plateVisual (lb → neutral steel)', () => {
  it('renders every lb plate as neutral grey (no Olympic lb colour standard)', () => {
    for (const plate of PLATE_INVENTORY.lb) {
      expect(plateVisual(plate, 'lb').fill).toBe('#B8BCC4')
    }
  })
})

describe('plateVisual (disc sizing)', () => {
  it('grows monotonically with weight and stays within [0.34, 1]', () => {
    const d25 = plateVisual(25, 'kg').relativeDiameter
    const d5 = plateVisual(5, 'kg').relativeDiameter
    const d2 = plateVisual(2.5, 'kg').relativeDiameter
    expect(d25).toBeGreaterThan(d5)
    expect(d5).toBeGreaterThan(d2)
    expect(d25).toBeLessThanOrEqual(1)
    expect(d2).toBeGreaterThanOrEqual(0.34)
  })
})
