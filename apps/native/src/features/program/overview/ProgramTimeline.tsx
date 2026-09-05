import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { ChevronDown, ChevronRight } from 'lucide-react-native'
import type { ProgramTrajectory } from '@sheetless/domain/program/program-trajectory'
import { Badge, Caption, Panel, SectionLabel, Text } from '@/components'
import { formatNumber } from '@sheetless/domain/shared/set-notation'
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
                      flexWrap: 'wrap',
                      gap: spacing.sm,
                      paddingVertical: 6,
                    }}
                  >
                    <Badge tone={week.status === 'current' ? 'action' : week.status === 'done' ? 'success' : 'neutral'}>
                      W{week.number}
                    </Badge>
                    <Caption style={{ flex: 1 }}>{week.sessionsDone}/{week.sessionsTotal} sessions</Caption>
                    {week.isProjected ? <Caption>Projected</Caption> : null}
                    {week.targets.length ? (
                      <View style={{ flexBasis: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                        {week.targets.map((target) => (
                          <Badge key={target.movementId} tone={week.isProjected ? 'action' : 'neutral'}>
                            {target.label} {formatNumber(target.load)}
                          </Badge>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ))}
                {phase.banked ? (
                  <TargetValues
                    label={`Banked by week ${phase.banked.atWeekNumber}`}
                    tone="success"
                    values={phase.banked.values}
                  />
                ) : null}
                {phase.projected ? (
                  <TargetValues
                    label={`If targets hit · week ${phase.projected.byWeekNumber}`}
                    tone="action"
                    values={phase.projected.values}
                  />
                ) : null}
              </View>
            ) : null}
          </Panel>
        )
      })}
    </Panel>
  )
}

function TargetValues({
  label,
  tone,
  values,
}: {
  label: string
  tone: 'action' | 'success'
  values: Array<{ movementId: string; label: string; value: number }>
}) {
  return (
    <Panel surface="inset" style={{ gap: 5, marginTop: spacing.xs, padding: spacing.sm }}>
      <Caption tone={tone}>{label}</Caption>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
        {values.map((value) => (
          <Badge key={value.movementId} tone={tone}>{value.label} {formatNumber(value.value)}</Badge>
        ))}
      </View>
    </Panel>
  )
}
