import { useState } from 'react'
import { View } from 'react-native'
import { previewCompactPrescription, previewMainMovement, previewPrescriptionLines, previewPrescriptionText } from '@sheetless/domain/program/template-preview-presentation'
import type { ProgramSetupPreviewWeek } from '@sheetless/domain/program/types'
import { Button, Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function TemplatePrescriptionTable({ weeks }: { weeks: ProgramSetupPreviewWeek[] }) {
  const { theme } = useTokens()
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? weeks : weeks.slice(0, 4)
  const rows = visible.map((week) => {
    const main = previewMainMovement(week)
    return { week, main, compact: previewCompactPrescription(main?.sets?.filter((set) => !set.isBackoff)),
      lines: previewPrescriptionLines(main?.sets),
      backoff: previewPrescriptionLines(main?.sets?.filter((set) => set.isBackoff)).map(previewPrescriptionText).join('; ') }
  })
  const reference = rows[0]?.compact?.reference
  const commonReference = reference && rows.every((row) => row.compact?.reference === reference) ? reference : ''
  const mainName = rows[0]?.main?.defaultMovementName
  const commonMain = mainName && rows.every((row) => row.main?.defaultMovementName === mainName) ? mainName : ''
  const notes = new Map<string, number[]>()
  for (const row of rows) {
    for (const note of [row.compact?.effort, row.backoff ? `Back-off: ${row.backoff}` : null]) {
      if (note) notes.set(note, [...(notes.get(note) ?? []), row.week.index + 1])
    }
  }
  return <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'space-between' }}>
      <SectionLabel>Main lift, by week</SectionLabel>
      {commonReference ? <SectionLabel>{commonReference}</SectionLabel> : null}
    </View>
    {rows.map(({ week, main, compact, lines }) => <View key={week.index}
      style={{ borderBottomWidth: 1, borderColor: theme.border, paddingBottom: spacing.sm, gap: 4 }}>
      {compact ? <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
        <Text size="xs" weight={800} tone="dimmed" style={{ minWidth: 27 }}>W{week.index + 1}</Text>
        <View style={{ flex: 1, gap: 2 }}>
          <Text size="sm">{compact.load}</Text>
          {!commonReference && compact.reference ? <Caption>{compact.reference}</Caption> : null}
        </View>
        <Text size="sm" weight={800} align="right" style={{ flexShrink: 1 }}>{compact.reps}</Text>
      </View> : <>
        <Text size="sm" weight={800}>Week {week.index + 1} · {week.phaseLabel}</Text>
        {lines.length ? lines.map((line, index) => <Text key={index} size="sm">
          {line.kind ? `${line.kind}: ` : ''}{previewPrescriptionText(line)}
        </Text>) : <Caption>{main?.targetSummary ?? 'Prescription details unavailable.'}</Caption>}
      </>}
      {!commonMain ? <Caption>{main?.defaultMovementName ?? 'Main lift unavailable'}</Caption> : null}
    </View>)}
    {[...notes.entries()].map(([note, weekNumbers]) => <Caption key={note}>
      {weekNumbers.length === rows.length ? '' : `Weeks ${weekNumbers.join(', ')}: `}{note}
    </Caption>)}
    {!weeks.length ? <Caption>Prescription details unavailable.</Caption> : null}
    {weeks.length > 4 ? <Button label={expanded ? 'Show fewer weeks' : `Show all ${weeks.length} weeks`}
      variant="subtle" fullWidth onPress={() => setExpanded((value) => !value)} /> : null}
    <Caption>{commonMain ? `${commonMain} example. ` : ''}Other lifts can differ. + means extra reps with the prescribed effort; RIR is reps left.</Caption>
  </Panel>
}
