import { useState } from 'react'
import { Pressable, View } from 'react-native'
import type { ExperienceMode } from '@sheetless/domain/account/types'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import type { PlannedSession } from '@sheetless/domain/session/types'
import { todayMovementPreview } from '@sheetless/domain/session/today-prescription'
import { Text } from '@/components'
import { useTokens } from '@/lib/tokens'
import { WorkoutPrescriptionSheet } from './WorkoutPrescriptionSheet'
import { WorkoutMainLift } from './WorkoutMainLift'
import { WorkoutPreviewTable } from './WorkoutPreviewTable'

export function WorkoutPreview({ session, program, mode = 'guided' }: {
  session: PlannedSession
  program?: ProgramInstance | null
  mode?: ExperienceMode
}) {
  const { theme } = useTokens()
  const [expanded, setExpanded] = useState(false)
  const [details, setDetails] = useState<string | null>(null)
  const movement = session.movements.find(item => item.id === details)
  const advanced = mode === 'full'
  return <>
    {advanced ? <WorkoutPreviewTable session={session} program={program} onOpen={setDetails} />
      : <WorkoutMainLift session={session} onOpen={setDetails} />}
    {!advanced ? <>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)} testID="today-expand-preview" style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text size="sm" weight={700} tone="action">{expanded ? 'Hide full workout' : 'See all sets and targets'}</Text>
      </Pressable>
      {expanded ? <View>{session.movements.map(slot => {
        const row = todayMovementPreview(slot, session, mode)
        return <Pressable key={slot.id} accessibilityRole="button" accessibilityLabel={`How ${row.name} is worked out`}
          accessibilityHint={`${row.prescription}. Opens set targets and calculations.`} onPress={() => setDetails(slot.id)}
          style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingVertical: 9, gap: 3, minHeight: 44 }}>
          <Text weight={700}>{row.name}</Text><Text size="sm" tone="dimmed">{row.prescription}</Text>
        </Pressable>
      })}</View> : null}
    </> : null}
    {movement ? <WorkoutPrescriptionSheet movement={movement} session={session} program={program} onClose={() => setDetails(null)} /> : null}
  </>
}
