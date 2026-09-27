import { useState } from 'react'
import { View, useWindowDimensions } from 'react-native'
import { previewMainMovement, previewPrescriptionLines } from '@sheetless/domain/program/template-preview-presentation'
import type { ProgramSetupPreviewWeek } from '@sheetless/domain/program/types'
import { Button, Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function TemplateWeekStructure({ weeks }: { weeks: ProgramSetupPreviewWeek[] }) {
  const [expanded, setExpanded] = useState(false)
  const [availableWidth, setAvailableWidth] = useState(0)
  const { fontScale } = useWindowDimensions()
  const visible = expanded ? weeks : weeks.slice(0, 4)
  const minimumTileWidth = 72 * Math.max(1, fontScale)
  const fittingColumns = availableWidth >= minimumTileWidth * 4 + spacing.xs * 3 ? 4
    : availableWidth >= minimumTileWidth * 2 + spacing.xs ? 2 : 1
  const columns = Math.max(1, Math.min(visible.length, fittingColumns))
  const rows = Array.from({ length: Math.ceil(visible.length / columns) }, (_, index) => visible.slice(index * columns, (index + 1) * columns))
  return <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
    <SectionLabel>{weeks.length === 1 ? 'How the week goes' : 'How the weeks go'}</SectionLabel>
    {!weeks.length ? <Caption>The week structure is unavailable.</Caption> : <>
      <View onLayout={(event) => setAvailableWidth(event.nativeEvent.layout.width)}
        style={{ gap: spacing.xs }}>
        {rows.map((row) => <View key={row[0]!.index} style={{ flexDirection: 'row', gap: spacing.xs }}>
          {row.map((week) => {
            const main = previewMainMovement(week)
            const lines = previewPrescriptionLines(main?.sets).filter((line) => line.kind !== 'Back-off')
            const reps = [...new Set(lines.map((line) => line.reps))].join(' · ')
            return <Panel key={week.index} surface="inset" style={{ flex: 1, minWidth: 0,
              padding: spacing.sm, gap: 4 }}>
              <SectionLabel>Week {week.index + 1}</SectionLabel>
              <Text size="sm" weight={800}>{reps || week.phaseLabel}</Text>
              <Caption>{week.hardness === 'Medium' ? 'Moderate' : week.hardness}</Caption>
            </Panel>
          })}
          {Array.from({ length: columns - row.length }, (_, index) => <View key={`empty-${index}`} style={{ flex: 1 }} />)}
        </View>)}
      </View>
      {weeks.length > 4 ? <Button label={expanded ? 'Show fewer weeks' : `Show all ${weeks.length} weeks`}
        variant="subtle" fullWidth onPress={() => setExpanded((value) => !value)} /> : null}
      <Text size="sm">{weeks.length === 1 ? 'Repeat this weekly schedule.' : `Follow this ${weeks.length}-week sequence.`} The session preview shows the movements and set targets for day one.</Text>
      <Caption>Rep examples use each week’s first main lift. Other movements can differ.</Caption>
    </>}
  </Panel>
}
