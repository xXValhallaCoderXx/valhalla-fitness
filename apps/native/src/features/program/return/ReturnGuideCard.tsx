import { useState } from 'react'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import { isReturnActive, returnProgressLabel } from '@sheetless/domain/program/return-settings'
import { Button, Caption, Panel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { useMe } from '@/lib/account'
import { ReturnGuideSheet } from './ReturnGuideSheet'
import { returnLogDaysAgo } from './return-log-recency'

export function ReturnGuideCard({ program, hasActiveSession = false, today = false, lastWorkoutLogged, compact = false }: {
  program: ProgramInstance
  hasActiveSession?: boolean
  today?: boolean
  lastWorkoutLogged?: string | null
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [now] = useState(() => new Date())
  const profile = useMe()
  const active = isReturnActive(program.returnPeriod)
  const days = returnLogDaysAgo(lastWorkoutLogged, profile.data?.timezone, now)
  const prompt = days !== null && days >= 14
  if (today && !active && !prompt) return null
  return <>
    {compact ? <Button label={active ? 'Review return guide' : 'Ease back in'} variant="light" tone="warning"
      style={{ flex: 1, minWidth: 125 }} disabled={hasActiveSession} onPress={() => setOpen(true)} /> :
      <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
        <Text weight={700}>{active && program.returnPeriod ? returnProgressLabel(program.returnPeriod) : 'Return after a break'}</Text>
        <Caption>{active ? 'Your programme advances normally. Review sets before ending the guide.' : 'Choose a gradual return while keeping your programme and its progress.'}</Caption>
        {active && program.returnPeriod ? <Caption>Suggested increases are capped at {program.returnPeriod.settings.defaultCap} {program.units} per programme reference, with individual caps in the guide.</Caption> : null}
        {today && prompt ? <Caption>Last workout logged: {lastWorkoutLogged}. You may have trained without logging it.</Caption> : null}
        <Button label={active ? 'Review return guide' : 'Return after a break'} variant="default" disabled={hasActiveSession} onPress={() => setOpen(true)} />
        {hasActiveSession ? <Caption>Configure the guide between workouts. Resume your saved workout normally.</Caption> : null}
      </Panel>}
    <ReturnGuideSheet open={open} program={program} onClose={() => setOpen(false)} />
  </>
}
