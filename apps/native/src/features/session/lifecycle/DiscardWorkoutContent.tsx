import { View } from 'react-native'
import { CalendarDays, Check, Trash2, type LucideIcon } from 'lucide-react-native'
import { Caption, Panel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function DiscardWorkoutContent({ isAdHoc, title, loggedSets }: { isAdHoc: boolean; title: string; loggedSets: number }) {
  return <Panel surface="inset" style={{ padding: spacing.md, gap: spacing.lg }}>
    <Consequence icon={Trash2} danger title={loggedSets ? `${loggedSets} logged ${loggedSets === 1 ? 'set will' : 'sets will'} be deleted` : 'This empty attempt will be deleted'}
      detail="There is no undo. This workout and its notes will not appear in your history." />
    <Consequence icon={Check} title="Your completed workouts stay saved"
      detail="Discarding this active attempt does not remove your earlier workouts or their records." />
    <Consequence icon={CalendarDays} title={isAdHoc ? 'Your plan is unchanged' : `${title} stays next`}
      detail={isAdHoc ? 'This workout is separate from your planned training.'
        : 'Today will offer the same planned workout again. Exercise changes and future phase edits made during this attempt are also removed.'} />
  </Panel>
}

function Consequence({ icon: Icon, title, detail, danger }: { icon: LucideIcon; title: string; detail: string; danger?: boolean }) {
  const { theme } = useTokens()
  return <View style={{ flexDirection: 'row', gap: spacing.sm }}>
    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: danger ? theme.tones.danger.soft : theme.surfaceInset,
      alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={18} color={danger ? theme.tones.danger.text : theme.textMuted} />
    </View>
    <View style={{ flex: 1, gap: 4 }}><Text weight={700}>{title}</Text><Caption>{detail}</Caption></View>
  </View>
}
