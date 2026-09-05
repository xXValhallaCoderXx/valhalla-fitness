import { View } from 'react-native'
import type { ProgramPhaseMap as ProgramPhaseMapModel } from '@sheetless/domain/program/program-phase-map'
import { Badge, Caption, Panel, SectionLabel } from '@/components'
import { spacing } from '@/lib/tokens'

export function ProgramPhaseMap({ phaseMap }: { phaseMap: ProgramPhaseMapModel }) {
  return (
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <SectionLabel>Program map</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {phaseMap.phases.map((phase) => (
          <Panel key={phase.key} surface="inset" style={{ flexGrow: 1, gap: 6, minWidth: 130, padding: spacing.sm }}>
            <Caption>{phase.label} · {phase.range}</Caption>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {phase.weeks.map((week) => (
                <Badge
                  key={week.index}
                  tone={week.status === 'current' ? 'action' : week.status === 'done' ? 'success' : 'neutral'}
                  variant={week.status === 'current' ? 'filled' : 'light'}
                >
                  {week.number}
                </Badge>
              ))}
            </View>
          </Panel>
        ))}
      </View>
    </Panel>
  )
}
