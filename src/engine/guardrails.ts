export interface ReadinessInput {
  sleepQuality: number
  motivation: number
  soreness: number
  stress: number
  restingHrElevated?: boolean
}

export type GuardrailSeverity = 'info' | 'warning' | 'danger'

export interface Guardrail {
  severity: GuardrailSeverity
  title: string
  message: string
  action: 'proceed' | 'reduce_load' | 'swap_low_fatigue' | 'early_deload' | 'stop_pressing'
}

export function readinessScore(input: ReadinessInput): number {
  const positive = input.sleepQuality + input.motivation
  const negative = input.soreness + input.stress + (input.restingHrElevated ? 2 : 0)
  return Math.max(1, Math.min(5, Math.round((positive + (10 - negative)) / 4)))
}

export function activeGuardrails(args: {
  readiness?: ReadinessInput
  benchPain?: number
  barSpeedFast?: boolean
  missedTopSet?: boolean
  fslStruggled?: boolean
}): Guardrail[] {
  const guardrails: Guardrail[] = []
  const score = args.readiness ? readinessScore(args.readiness) : 5

  if ((args.benchPain ?? 0) > 5) {
    guardrails.push({
      severity: 'danger',
      title: 'Shoulder stop',
      message: 'Pain is above the plan limit. Stop pressing and log the flare.',
      action: 'stop_pressing',
    })
  } else if ((args.benchPain ?? 0) > 0) {
    guardrails.push({
      severity: 'warning',
      title: 'Bench hold',
      message: 'Any shoulder pain blocks bench progression this cycle.',
      action: 'proceed',
    })
  }

  if (args.missedTopSet) {
    guardrails.push({
      severity: 'danger',
      title: 'Missed top set',
      message: 'Drop the next same-pattern work by about 10% and avoid a second failed set.',
      action: 'reduce_load',
    })
  }

  if (args.barSpeedFast === false || args.fslStruggled) {
    guardrails.push({
      severity: 'warning',
      title: 'Fatigue signal',
      message: 'Keep accessories low fatigue today and consider cutting the final back-off work.',
      action: 'swap_low_fatigue',
    })
  }

  if (score <= 2) {
    guardrails.push({
      severity: 'warning',
      title: 'Readiness low',
      message: 'Treat today like a minimum-effective-dose session. No grinders.',
      action: 'swap_low_fatigue',
    })
  }

  if (score <= 1 && (args.missedTopSet || args.fslStruggled)) {
    guardrails.push({
      severity: 'danger',
      title: 'Early deload check',
      message: 'Readiness and performance are both down. Ending early is consistent with the plan.',
      action: 'early_deload',
    })
  }

  if (guardrails.length === 0) {
    guardrails.push({
      severity: 'info',
      title: 'Green light',
      message: 'Everything points to running the plan as written.',
      action: 'proceed',
    })
  }

  return guardrails
}
