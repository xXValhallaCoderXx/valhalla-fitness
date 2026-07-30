import { Badge } from '@mantine/core'
import {
  Caption,
  EquipmentModeBadge,
  Heading,
  SectionLabel,
} from '~/components'
import type { WorkoutSession } from '~/domains/session'

export function SessionSummaryHeader({
  session,
  headline,
  completedSets,
  plannedSets,
  durationMinutes,
}: {
  session: WorkoutSession
  headline: string
  completedSets: number
  plannedSets: number
  durationMinutes: number
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <SectionLabel>{session.title} · Session summary</SectionLabel>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Heading order={1} size="h2" lh={1.1}>{headline}</Heading>
          <EquipmentModeBadge equipmentMode={session.equipmentMode} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Caption fw={600}>
          {completedSets} of {plannedSets} sets · {durationMinutes} min
        </Caption>
        <Badge color="success">Completed</Badge>
      </div>
    </div>
  )
}
