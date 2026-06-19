import { describe, expect, it } from 'vitest'
import { activeGuardrails, readinessScore } from '../guardrails'

describe('active guardrails', () => {
  it('scores readiness conservatively when stress and soreness are high', () => {
    expect(
      readinessScore({
        sleepQuality: 2,
        motivation: 2,
        soreness: 5,
        stress: 5,
        restingHrElevated: true,
      }),
    ).toBe(1)
  })

  it('stops pressing when shoulder pain exceeds the plan limit', () => {
    const guardrails = activeGuardrails({ benchPain: 7 })
    expect(guardrails.some((guardrail) => guardrail.action === 'stop_pressing')).toBe(true)
  })

  it('suggests low-fatigue accessories when bar speed slows', () => {
    const guardrails = activeGuardrails({ barSpeedFast: false })
    expect(guardrails.some((guardrail) => guardrail.action === 'swap_low_fatigue')).toBe(true)
  })
})
