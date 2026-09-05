import { View } from 'react-native'
import { Trophy } from 'lucide-react-native'
import type { WorkoutSummaryModel } from '@sheetless/domain/history/workout-summary'
import { prBannerTitle, prKindLabels } from '@sheetless/domain/session/session-prs'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import { Badge, Caption, Heading, Panel, SectionLabel, StatCard, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function WorkoutSummaryRecap({
  session,
  recap,
}: {
  session: WorkoutSession
  recap: WorkoutSummaryModel
}) {
  const { theme } = useTokens()
  const notes = session.notes?.trim()
  const reflectionWin = session.reflectionWin?.trim()
  const reflectionImprove = session.reflectionImprove?.trim()
  const hasReflection = session.sessionRpe != null || Boolean(reflectionWin || reflectionImprove || notes)

  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <StatCard label="Movements" value={String(recap.stats.movementCount)} />
        <StatCard label="Sets" value={`${recap.completion.completed}/${recap.completion.planned}`} />
        <StatCard label="Volume" value={recap.stats.volumeLabel} />
      </View>

      {recap.sessionBest ? (
        <Panel
          style={{
            backgroundColor: theme.tones.action.soft,
            borderColor: theme.tones.action.border,
            gap: 3,
            padding: spacing.md,
          }}
        >
          <SectionLabel tone="action">Session best</SectionLabel>
          <Heading order={3}>{recap.sessionBest.movementName}</Heading>
          <Text size="sm" weight={800}>
            {recap.sessionBest.resultLabel} · estimated max {recap.sessionBest.e1rmLabel}
          </Text>
        </Panel>
      ) : null}

      {session.prs?.length ? (
        <Panel
          style={{
            backgroundColor: theme.tones.success.soft,
            borderColor: theme.tones.success.border,
            gap: spacing.sm,
            padding: spacing.md,
          }}
        >
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.xs }}>
            <Trophy color={theme.tones.success.text} size={17} />
            <Heading order={3}>{prBannerTitle}</Heading>
          </View>
          {session.prs.map((pr) => (
            <Panel key={pr.movementId} surface="inset" style={{ gap: 5, padding: spacing.sm }}>
              <Text size="sm" weight={800}>{pr.movementName}</Text>
              <Text size="sm" tone="success" weight={900}>
                {formatWeight(pr.load, session.units)} × {pr.reps}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                {pr.kinds.map((kind) => <Badge key={kind} tone="success">{prKindLabels[kind]}</Badge>)}
              </View>
              {pr.previousLabel ? <Caption>{pr.previousLabel}</Caption> : null}
            </Panel>
          ))}
        </Panel>
      ) : null}

      <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
        <SectionLabel>Completed work</SectionLabel>
        {recap.exercises.map((exercise) => (
          <Panel key={exercise.id} surface="inset" style={{ gap: 6, padding: spacing.sm }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Text size="sm" weight={800} style={{ flexGrow: 1 }}>{exercise.name}</Text>
              <Badge tone={exercise.accentTone}>{exercise.tagLabel}</Badge>
              {exercise.hitEveryTarget ? <Badge tone="success">Hit target</Badge> : null}
            </View>
            <Caption>{exercise.targetSummary} · best {exercise.bestSetLabel}</Caption>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
              {exercise.sets.map((set) => (
                <Badge key={set.index} tone={set.isTop ? 'accent' : 'neutral'}>
                  {set.index}: {set.resultLabel}{set.rir == null ? '' : ` · RIR ${set.rir}`}
                </Badge>
              ))}
            </View>
          </Panel>
        ))}
      </Panel>

      {hasReflection ? (
        <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
          <SectionLabel>Your reflection</SectionLabel>
          {session.sessionRpe != null ? <Reflection label="Effort" value={`${session.sessionRpe}/10`} /> : null}
          {reflectionWin ? <Reflection label="Went well" value={reflectionWin} /> : null}
          {reflectionImprove ? <Reflection label="Work on" value={reflectionImprove} /> : null}
          {notes ? <Reflection label="Notes" value={notes} /> : null}
        </Panel>
      ) : null}
    </>
  )
}

function Reflection({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Caption>{label.toUpperCase()}</Caption>
      <Text size="sm" tone="dimmed">{value}</Text>
    </View>
  )
}
