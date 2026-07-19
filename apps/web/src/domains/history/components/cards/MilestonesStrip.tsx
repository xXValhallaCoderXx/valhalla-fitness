import { Badge } from '@mantine/core'
import type { MilestoneSummary } from '~/shared/types'
import { Caption, Panel, SectionLabel } from '~/components'

const MAX_BADGES = 6

export function MilestonesStrip({ milestones }: { milestones: MilestoneSummary }) {
  const earned = milestones.earned.slice(-MAX_BADGES)
  if (!earned.length && !milestones.nextUp) return null

  return (
    <Panel p="md">
      <SectionLabel>Milestones</SectionLabel>
      {earned.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {earned.map((milestone) => (
            <Badge key={`${milestone.kind}-${milestone.threshold}`} color="warning" variant="light">
              🏆 {milestone.label}
            </Badge>
          ))}
        </div>
      ) : null}

      {milestones.nextUp ? (
        <div className="mt-3">
          <div className="flex items-center justify-between gap-2">
            <Caption>Next: {milestones.nextUp.label}</Caption>
            <Caption fw={700}>{milestones.nextUp.progressPercent}%</Caption>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--vf-surface-inset)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${milestones.nextUp.progressPercent}%`, backgroundColor: 'var(--vf-warning-text)' }}
            />
          </div>
        </div>
      ) : null}
    </Panel>
  )
}
