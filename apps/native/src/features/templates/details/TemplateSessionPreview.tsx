import { View } from 'react-native'
import { previewPrescriptionLines, previewPrescriptionText } from '@sheetless/domain/program/template-preview-presentation'
import type { ProgramSetupOptions } from '@sheetless/domain/program/types'
import { Badge, Button, Caption, Panel, SheetModal, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function TemplateSessionPreview({ setup, scheduleLabel, onClose, onSetup }: {
  setup: ProgramSetupOptions; scheduleLabel: string; onClose: () => void; onSetup: () => void
}) {
  const { theme } = useTokens()
  const session = setup.previewWeeks[0]?.sessions[0]
  return <SheetModal open title="Week 1, day 1" showHandle
    subtitle={session ? `${session.title} · about ${session.estimatedMinutes} min` : 'Session preview unavailable'}
    onClose={onClose} footer={<Button label="Set this plan up" fullWidth onPress={onSetup} />}>
    <Panel surface="inset" style={{ padding: spacing.md, gap: spacing.xs,
      backgroundColor: theme.tones.action.soft, borderColor: theme.tones.action.border }}>
      <Text size="sm">These are the plan’s movements and prescribed work. You will choose your starting weights during setup.</Text>
      <Caption>{scheduleLabel}</Caption>
    </Panel>
    {session?.movements.map((movement) => {
      const lines = previewPrescriptionLines(movement.sets)
      return <View key={movement.slotId} style={{ gap: spacing.xs, borderBottomWidth: 1, borderColor: theme.border, paddingBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
          <Text size="sm" weight={800}>{movement.defaultMovementName}</Text>
          {movement.role === 'main' ? <Badge tone="accent">Main</Badge> : null}
        </View>
        {lines.length ? lines.map((line, index) => <Text key={index} size="sm" tone="dimmed">
          {line.kind ? `${line.kind}: ` : ''}{previewPrescriptionText(line)}
        </Text>) : <Caption>{movement.targetSummary || 'Prescription details unavailable.'}</Caption>}
      </View>
    })}
    {!session?.movements.length ? <Caption>No movements are available for this session.</Caption> : null}
    {session?.movements.some((movement) => movement.sets?.some((set) => set.isAmrap))
      ? <Caption>+ means extra reps while keeping the prescribed effort.</Caption> : null}
  </SheetModal>
}
