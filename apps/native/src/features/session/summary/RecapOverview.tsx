import { View } from 'react-native'
import type { WorkoutSession } from '@sheetless/domain/session/types'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import { prKindLabels } from '@sheetless/domain/session/session-prs'
import { Caption, Heading, Panel, SectionLabel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import type { NativeWorkoutRecap } from './native-workout-recap'

export function RecapCompletion({ recap, units, advanced }: { recap: NativeWorkoutRecap; units: string; advanced: boolean }) {
  const { theme } = useTokens()
  const { completed, planned } = recap.completion
  const complete = completed > 0 && completed === planned
  if (advanced && completed > 0) return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
    {[
      [`${completed}/${planned}`, 'Sets'],
      [recap.stats.volumeLabel.replace(` ${units}`, ''), `${units} lifted`],
      [recap.durationLabel.replace(' min', '').replace('Duration unavailable', '—'), 'Minutes'],
    ].map(([value, label]) => <Panel key={label} surface="inset" style={{ flex: 1, minWidth: 90, padding: spacing.sm, gap: 2 }}>
      <Text size="lg" weight={800}>{value}</Text><SectionLabel>{label}</SectionLabel>
    </Panel>)}
  </View>
  return <Panel surface="inset" style={{ padding: spacing.md, gap: spacing.xs,
    backgroundColor: complete ? theme.tones.success.soft : theme.surface2,
    borderColor: complete ? theme.tones.success.border : theme.border }}>
    <Heading order={3} tone={complete ? 'success' : 'default'}>{completed === 0 ? 'Nothing was logged' : complete ? 'You finished every set' : `${completed} of ${planned} sets logged`}</Heading>
    <Text size="sm">{completed === 0 ? 'This saved workout has no completed sets.'
      : `${complete ? `All ${completed}` : `${completed} of ${planned}`} sets · ${recap.stats.movementCount} movements · ${recap.stats.volumeLabel} lifted · ${recap.durationLabel}`}</Text>
    {completed === 0 ? <Caption>This record remains in your history.</Caption> : null}
  </Panel>
}

export function RecapBestSet({ recap, session, advanced }: { recap: NativeWorkoutRecap; session: WorkoutSession; advanced: boolean }) {
  const best = recap.sessionBest
  if (!best && !session.prs?.length) return null
  return <Panel surface="inset" style={{ padding: spacing.md, gap: spacing.xs }}>
    <SectionLabel>Best set</SectionLabel>
    {best ? <>
      <Text weight={800}>{best.movementName} {best.resultLabel}{advanced && best.rir !== null ? ` · RIR ${best.rir}` : ''}</Text>
      {advanced ? <Caption>Estimated max {best.e1rmLabel}.</Caption> : null}
    </> : null}
    {session.prs?.map(pr => <View key={pr.movementId} style={{ gap: 2 }}>
      <Text size="sm" tone="success">{pr.movementName} · {pr.kinds.map(kind => prKindLabels[kind]).join(' · ')} · {formatWeight(pr.load, session.units)} × {pr.reps}</Text>
      {pr.previousLabel ? <Caption>{pr.previousLabel}</Caption> : null}
    </View>)}
  </Panel>
}
