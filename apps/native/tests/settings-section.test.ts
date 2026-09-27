import { describe, expect, it } from 'vitest'
import { createSettingsSectionScroll, parseSettingsEntrySection } from '../src/features/settings/settings-section'

describe('Settings section handoff', () => {
  it('accepts only the supported single starting-numbers destination', () => {
    expect(parseSettingsEntrySection('starting-numbers')).toBe('starting-numbers')
    for (const value of [undefined, '', 'profile', 'STARTING-NUMBERS', ['starting-numbers']]) {
      expect(parseSettingsEntrySection(value)).toBeUndefined()
    }
  })

  // These inputs represent native layout events; this does not assert native measurements.
  it('waits for measured content, viewport and section before consuming the handoff once', () => {
    const controller = createSettingsSectionScroll()
    controller.setSection('starting-numbers')
    controller.setContentHeight(3200)
    controller.setViewportHeight(700)
    expect(controller.takeOffset()).toBeNull()
    controller.setTargetY(1437)
    expect(controller.takeOffset()).toBe(1437)

    controller.setContentHeight(3500)
    controller.setTargetY(1600)
    controller.setViewportHeight(420)
    controller.setSection('starting-numbers')
    expect(controller.takeOffset()).toBeNull()
  })

  it('leaves ordinary Settings entry alone and supports a later explicit section request', () => {
    const controller = createSettingsSectionScroll()
    controller.setTargetY(1450)
    controller.setContentHeight(3200)
    controller.setViewportHeight(700)
    expect(controller.takeOffset()).toBeNull()
    controller.setSection('starting-numbers')
    expect(controller.takeOffset()).toBe(1450)
  })

  it('waits for a full content measurement and respects the measured scrollable extent', () => {
    const controller = createSettingsSectionScroll()
    controller.setSection('starting-numbers')
    controller.setTargetY(1100)
    controller.setViewportHeight(700)
    controller.setContentHeight(400)
    expect(controller.takeOffset()).toBeNull()
    controller.setContentHeight(1600)
    expect(controller.takeOffset()).toBe(900)
    controller.setContentHeight(1800)
    expect(controller.takeOffset()).toBeNull()
  })
})
