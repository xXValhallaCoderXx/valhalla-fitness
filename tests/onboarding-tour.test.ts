import { beforeAll, describe, expect, it, vi } from 'vitest'
import { buildLiveSessionSteps, buildOnboardingSteps } from '../src/domains/onboarding/onboarding-tour'

beforeAll(() => {
  // jsdom doesn't implement matchMedia; navSelector() in buildOnboardingSteps needs it.
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
})

describe('buildLiveSessionSteps', () => {
  it('returns five live-session steps with unique ids and live anchors', () => {
    const steps = buildLiveSessionSteps()
    expect(steps).toHaveLength(5)
    for (const step of steps) {
      expect(String(step.element)).toMatch(/^\[data-tour="live-.+"\]$/)
      expect(step.popover?.title).toBeTruthy()
    }
    expect(new Set(steps.map((step) => step.data?.stepId)).size).toBe(5)
  })
})

describe('buildOnboardingSteps', () => {
  it('still returns the six app-shell steps', () => {
    expect(buildOnboardingSteps()).toHaveLength(6)
  })
})
