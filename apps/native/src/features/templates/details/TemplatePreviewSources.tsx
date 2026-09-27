import { useState } from 'react'
import { View } from 'react-native'
import { getMovementName } from '@sheetless/domain/movement/movements'
import type { ProgramSetupSuggestionSnapshot } from '@sheetless/domain/program/setup-suggestions'
import { Button, Caption, Panel, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function TemplatePreviewSources({ snapshot }: { snapshot: ProgramSetupSuggestionSnapshot }) {
  const [open, setOpen] = useState(false)
  if (!snapshot.stateValues.length) return null
  return <View style={{ gap: spacing.sm }}>
    <Button label={open ? 'Hide starting-weight explanation' : 'Where these weights come from'} variant="subtle"
      onPress={() => setOpen(value => !value)} />
    {open ? <Panel surface="inset" style={{ padding: spacing.md, gap: spacing.md }}>
      {snapshot.stateValues.map(state => {
        const source = snapshot.sourceRows.find(row => row.key === state.key)
        const percent = state.type === 'training_max' ? snapshot.trainingMaxPercent
          : state.type === 'working_load' ? snapshot.workingLoadPercent : null
        return <View key={state.key} style={{ gap: 3 }}>
          <Text size="sm" weight={700}>{state.label ?? getMovementName(state.movementId)} · {state.type.replaceAll('_', ' ')}</Text>
          <Caption>{source?.source === 'history' && source.bestSet
            ? `Logged ${source.bestSet.load} ${snapshot.units} × ${source.bestSet.reps} on ${source.bestSet.date}`
            : source?.source === 'estimate' ? 'Saved starting-strength estimate'
              : source?.source === 'saved' ? 'Saved starting value' : 'Enter a starting value during setup'}</Caption>
          {source?.reference != null && percent != null ? <Caption>
            {source.reference} {snapshot.units} × {percent}% → {state.value ?? 'unavailable'} {snapshot.units}, rounded to {snapshot.rounding} {snapshot.units}.
          </Caption> : state.value != null ? <Caption>Starting reference: {state.value} {snapshot.units}</Caption> : null}
        </View>
      })}
      <Caption>The plan’s prescriptions turn these references into set weights. Fixed and choose-your-own loads follow the plan as written.</Caption>
    </Panel> : null}
  </View>
}
