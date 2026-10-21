import { describe, expect, it } from 'vitest'
import { parseSettingsEntrySection, settingsEntryDestination } from '../src/features/settings/settings-section'

describe('legacy Settings links', () => {
  it('preserves the Today and onboarding starting-number destination', () => {
    expect(settingsEntryDestination(parseSettingsEntrySection('starting-numbers'))).toBe('/you/starting-numbers')
  })
  it.each([undefined, '', 'account', ['starting-numbers'], '/auth'])('opens You for unsupported section %s', value => {
    expect(settingsEntryDestination(parseSettingsEntrySection(value))).toBe('/you')
  })
})
