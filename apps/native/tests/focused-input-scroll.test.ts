import { describe, expect, it } from 'vitest'
import { focusedInputScrollOffset } from '../src/features/settings/focused-input-scroll'

describe('settings focused input scroll geometry', () => {
  it('reveals a lower input above the measured viewport, including space taken by the Save footer', () => {
    expect(focusedInputScrollOffset({ inputTop: 540, inputHeight: 40, viewportHeight: 360, scrollOffset: 0, padding: 16 }))
      .toBe(236)
  })

  it('accounts for existing scroll and a later footer or viewport resize', () => {
    expect(focusedInputScrollOffset({ inputTop: 540, inputHeight: 40, viewportHeight: 440, scrollOffset: 160, padding: 16 }))
      .toBeNull()
    expect(focusedInputScrollOffset({ inputTop: 540, inputHeight: 40, viewportHeight: 340, scrollOffset: 160, padding: 16 }))
      .toBe(256)
  })

  it('reveals an input above the viewport without allowing a negative offset', () => {
    expect(focusedInputScrollOffset({ inputTop: 100, inputHeight: 40, viewportHeight: 300, scrollOffset: 180, padding: 16 }))
      .toBe(84)
    expect(focusedInputScrollOffset({ inputTop: 8, inputHeight: 40, viewportHeight: 300, scrollOffset: 180, padding: 16 }))
      .toBe(0)
  })

  it('aligns the top of an input that is taller than the available viewport', () => {
    expect(focusedInputScrollOffset({ inputTop: 540, inputHeight: 100, viewportHeight: 90, scrollOffset: 0, padding: 16 }))
      .toBe(524)
  })

  it('ignores unavailable measurements and avoids repeating an already aligned scroll', () => {
    expect(focusedInputScrollOffset({ inputTop: 540, inputHeight: 40, viewportHeight: 0, scrollOffset: 0, padding: 16 }))
      .toBeNull()
    expect(focusedInputScrollOffset({ inputTop: Number.NaN, inputHeight: 40, viewportHeight: 300, scrollOffset: 0, padding: 16 }))
      .toBeNull()
    expect(focusedInputScrollOffset({ inputTop: 540, inputHeight: 40, viewportHeight: 340, scrollOffset: 256, padding: 16 }))
      .toBeNull()
  })
})
