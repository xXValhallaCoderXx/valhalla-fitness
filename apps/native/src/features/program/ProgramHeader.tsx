import { View } from 'react-native'
import type { ProgramOverview } from '@sheetless/domain/program/types'
import type { ProgramPhaseMap } from '@sheetless/domain/program/program-phase-map'
import { Badge, PageHeader, StatCard } from '@/components'
import { spacing } from '@/lib/tokens'

export function ProgramHeader({ overview, phaseMap }: { overview: ProgramOverview; phaseMap: ProgramPhaseMap }) {
  const program = overview.activeProgram!
  const position = overview.position
  return (
    <>
      <PageHeader
        title={program.title}
        eyebrow="Your plan"
        subtitle={position?.weekSummary ?? 'Your active program, week by week.'}
        actions={<Badge tone={program.status === 'active' ? 'success' : 'warning'}>{program.status}</Badge>}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <StatCard label="Week" value={`${phaseMap.currentWeekNumber}/${phaseMap.totalWeeks}`} tone="action" />
        <StatCard label="Phase" value={phaseMap.currentPhaseLabel ?? 'Current'} />
        <StatCard label="Sessions/week" value={String(position?.daysPerWeek ?? 0)} />
      </View>
    </>
  )
}
