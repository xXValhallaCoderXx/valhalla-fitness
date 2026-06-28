import { afterEach, describe, expect, it, vi } from 'vitest'
import { setAnalyticsSink, track } from '../src/shared/lib/analytics'

afterEach(() => {
  setAnalyticsSink(null)
  vi.unstubAllGlobals()
})

describe('track', () => {
  it('routes events to a registered sink', () => {
    const sink = vi.fn()
    setAnalyticsSink(sink)
    track('onboarding_tour_start', { tour: 'app' })
    expect(sink).toHaveBeenCalledWith('onboarding_tour_start', { tour: 'app' })
  })

  it('does not throw without a sink', () => {
    expect(() => track('noop_event')).not.toThrow()
  })

  it('no-ops during SSR (no window)', () => {
    const sink = vi.fn()
    setAnalyticsSink(sink)
    vi.stubGlobal('window', undefined)
    track('should_not_emit')
    expect(sink).not.toHaveBeenCalled()
  })
})
