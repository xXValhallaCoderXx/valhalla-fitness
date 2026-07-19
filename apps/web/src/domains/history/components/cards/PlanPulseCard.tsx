import type { InsightGating, ProgramOverview } from '~/shared/types'
import { Caption, Panel, SectionLabel, Text } from '~/components'

export type PlanPulseSignal = 'week_one' | 'deload' | 'completed' | 'paused' | 'active'

/** Pure so the copy is testable and never judged inline in JSX. */
export function resolvePlanPulse(gating: InsightGating): PlanPulseSignal {
  if (gating.planState === 'active_week1') return 'week_one'
  if (gating.planState === 'active_deload') return 'deload'
  if (gating.planState === 'completed') return 'completed'
  if (gating.planState === 'paused') return 'paused'
  return 'active'
}

/** Plan-relative pulse. Never uses "behind" language — the worst read is a neutral count. */
export function PlanPulseCard({
  programOverview,
  gating,
}: {
  programOverview: ProgramOverview
  gating: InsightGating
}) {
  const program = programOverview.activeProgram
  const position = programOverview.position
  if (!program || !position) return null

  const signal = resolvePlanPulse(gating)

  return (
    <Panel p="md">
      <SectionLabel>Plan pulse</SectionLabel>
      <Text mt={3} size="sm" fw={800}>
        {program.title}
      </Text>
      <Text mt={2} size="sm" tone={signal === 'deload' ? 'accent' : undefined}>
        {pulseCopy(signal, position)}
      </Text>
      {signal === 'completed' ? (
        <Caption mt={3}>Block complete — a good moment to review what changed and pick your next plan.</Caption>
      ) : null}
    </Panel>
  )
}

function pulseCopy(signal: PlanPulseSignal, position: NonNullable<ProgramOverview['position']>) {
  const { weekNumber, totalWeeks, sessionNumber, progressPercent } = position
  if (signal === 'week_one') {
    return `Week 1 of ${totalWeeks} — building your baseline. Every set you log becomes your comparison line.`
  }
  if (signal === 'deload') {
    return 'Deload week — lighter on purpose. Recovery is where the strength you built shows up.'
  }
  if (signal === 'completed') return 'You finished this block.'
  if (signal === 'paused') return 'This plan is paused — resume it any time to pick up where you left off.'
  return `Week ${weekNumber} of ${totalWeeks} · session ${sessionNumber} · ${progressPercent}% through the block.`
}
