import { View } from 'react-native'
import { previewPrescriptionLines, previewPrescriptionText } from '@sheetless/domain/program/template-preview-presentation'
import { personalTemplatePreviewLines } from '@sheetless/domain/program/personal-template-preview'
import type { ProgramSetupOptions } from '@sheetless/domain/program/types'
import type { ProgramSetupSuggestionSnapshot } from '@sheetless/domain/program/setup-suggestions'
import { Badge, Button, Caption, Panel, SheetModal, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import { TemplatePreviewSources } from './TemplatePreviewSources'

export function TemplateSessionPreview({ setup, scheduleLabel, onClose, onSetup, suggestions,
  suggestionsLoading, suggestionsError, retrying, onRetry }: {
  setup: ProgramSetupOptions; scheduleLabel: string; onClose: () => void; onSetup: () => void
  suggestions?: ProgramSetupSuggestionSnapshot
  suggestionsLoading: boolean; suggestionsError: string | null; retrying: boolean; onRetry: () => void
}) {
  const { theme } = useTokens()
  const session = setup.previewWeeks[0]?.sessions[0]
  return <SheetModal open title="Week 1, day 1" showHandle
    subtitle={session ? `${session.title} · about ${session.estimatedMinutes} min` : 'Session preview unavailable'}
    onClose={onClose} footer={<Button label="Set this plan up" fullWidth onPress={onSetup} />}>
    <Panel surface="inset" style={{ padding: spacing.md, gap: spacing.xs,
      backgroundColor: theme.tones.action.soft, borderColor: theme.tones.action.border }}>
      <Text size="sm">Personal starting references use logged lifts or saved estimates. You can edit them during setup. Nothing is saved here.</Text>
      <Caption>{scheduleLabel}</Caption>
      <Caption>All equipment · the plan as written. Choose equipment during setup.</Caption>
    </Panel>
    {suggestionsError ? <Panel surface="inset" style={{ padding: spacing.sm, gap: spacing.xs }}>
      <Text size="sm" tone="warning">{suggestionsError} The plan’s prescriptions are still shown below.</Text>
      <Button label="Retry starting suggestions" variant="default" loading={retrying} onPress={onRetry} />
    </Panel> : suggestionsLoading ? <Caption>Loading your starting suggestions…</Caption>
      : suggestions?.historyStatus === 'unavailable' ? <Panel surface="inset" style={{ padding: spacing.sm, gap: spacing.xs }}>
        <Text size="sm" tone="warning">Workout history could not load. These suggestions use saved estimates where available.</Text>
        <Button label="Retry workout history" variant="default" loading={retrying} onPress={onRetry} />
      </Panel> : null}
    {suggestions && suggestions.unknownUnitSessions > 0 ? <Caption>
      {suggestions.unknownUnitSessions} older {suggestions.unknownUnitSessions === 1 ? 'workout has' : 'workouts have'} unknown weight units and could not inform these suggestions.
    </Caption> : null}
    {session?.movements.map((movement) => {
      const lines = previewPrescriptionLines(movement.sets)
      const personal = suggestions && !suggestionsError ? personalTemplatePreviewLines(movement, suggestions) : null
      return <View key={movement.slotId} style={{ gap: spacing.xs, borderBottomWidth: 1, borderColor: theme.border, paddingBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
          <Text size="sm" weight={800}>{movement.defaultMovementName}</Text>
          {movement.role === 'main' ? <Badge tone="accent">Main</Badge> : null}
        </View>
        {personal?.length ? personal.map((line, index) => <Text key={index} size="sm">
          {line.kind ? `${line.kind}: ` : ''}{line.count} × {line.reps} · {line.load === null ? line.loadLabel : `${line.load} ${suggestions!.units}`}{line.effort ? ` · ${line.effort}` : ''}
        </Text>) : lines.length ? lines.map((line, index) => <Text key={index} size="sm" tone="dimmed">
          {line.kind ? `${line.kind}: ` : ''}{previewPrescriptionText(line)}
        </Text>) : <Caption>{movement.targetSummary || 'Prescription details unavailable.'}</Caption>}
      </View>
    })}
    {!session?.movements.length ? <Caption>No movements are available for this session.</Caption> : null}
    {suggestions && !suggestionsError ? <TemplatePreviewSources snapshot={suggestions} /> : null}
    {session?.movements.some((movement) => movement.sets?.some((set) => set.isAmrap))
      ? <Caption>+ means extra reps while keeping the prescribed effort.</Caption> : null}
  </SheetModal>
}
