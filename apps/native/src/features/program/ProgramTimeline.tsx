import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { ChevronDown, ChevronRight } from 'lucide-react-native'
import type { ProgramTrajectory } from '@sheetless/domain/program/program-trajectory'
import { Badge, Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function ProgramTimeline({ trajectory }: { trajectory: ProgramTrajectory }) {
  const { theme } = useTokens()
  const current = trajectory.phases.find((phase) => phase.status === 'current')?.key
  const [open, setOpen] = useState<Set<string>>(() => new Set(current ? [current] : []))

  const toggle = (key: string) => {
    setOpen((value) => {
      const next = new Set(value)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <SectionLabel>Timeline</SectionLabel>
      {trajectory.phases.map((phase) => {
        const expanded = open.has(phase.key)
        return (
          <Panel key={phase.key} surface="inset" style={{ overflow: 'hidden' }}>
            <Pressable
              onPress={() => toggle(phase.key)}
              style={({ pressed }) => ({
                alignItems: 'center',
                flexDirection: 'row',
                gap: spacing.sm,
                opacity: pressed ? 0.7 : 1,
                padding: spacing.sm,
              })}
            >
              {expanded ? <ChevronDown color={theme.textMuted} size={17} /> : <ChevronRight color={theme.textMuted} size={17} />}
              <View style={{ flex: 1 }}>
                <Text size="sm" weight={800}>{phase.label}</Text>
                <Caption>{phase.range} · {phase.subtitle}</Caption>
              </View>
              <Badge tone={phase.status === 'current' ? 'action' : phase.status === 'done' ? 'success' : 'neutral'}>
                {phase.status}
              </Badge>
            </Pressable>
            {expanded ? (
              <View style={{ borderTopColor: theme.border, borderTopWidth: 1, padding: spacing.sm }}>
                {phase.weeks.map((week) => (
                  <View
                    key={week.index}
                    style={{
                      alignItems: 'center',
                      flexDirection: 'row',
                      gap: spacing.sm,
                      paddingVertical: 6,
                    }}
                  >
                    <Badge tone={week.status === 'current' ? 'action' : week.status === 'done' ? 'success' : 'neutral'}>
                      W{week.number}
                    </Badge>
                    <Caption style={{ flex: 1 }}>{week.sessionsDone}/{week.sessionsTotal} sessions</Caption>
                    {week.isProjected ? <Caption>Projected</Caption> : null}
                  </View>
                ))}
              </View>
            ) : null}
          </Panel>
        )
      })}
    </Panel>
  )
}
