import { useState } from 'react'
import { View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router, useIsFocused } from 'expo-router'
import type { User } from '@supabase/supabase-js'
import type { ExperienceMode } from '@sheetless/domain/account/types'
import type { ProgramOverview, ProgramStateOverview } from '@sheetless/domain/program/types'
import { buildProgramPlan, type ProgramPlanSession } from '@sheetless/domain/program/program-plan'
import { createAccountClock } from '@sheetless/domain/shared/dates'
import { isReturnActive, returnProgressLabel } from '@sheetless/domain/program/return-settings'
import { Button, Caption, Heading, Panel, SectionLabel, SegmentedControl, Text } from '@/components'
import { SessionSummarySheet } from '@/features/history/sessions/SessionSummarySheet'
import { useMe } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { spacing, useTokens } from '@/lib/tokens'
import { programOverviewQueryOptions } from './queries'
import { PlanLayout } from './overview/PlanLayout'
import { NoPlan } from './overview/NoPlan'
import { PlanTargetTable } from './overview/PlanTargetTable'
import { PlanWeekSessions } from './overview/PlanWeekSessions'
import { PlanWorkingWeights } from './overview/PlanWorkingWeights'
import { WorkingWeightSheet } from './overview/WorkingWeightSheet'
import { PlanSessionEntrySheet } from './overview/PlanSessionEntrySheet'
import { PlanSettingsSheet } from './settings/PlanSettingsSheet'
import { ReturnGuideSheet } from './return/ReturnGuideSheet'
import { ProgressionReviewAlert } from './progression/ProgressionReviewAlert'
import { ProgressionReviewSheet } from './progression/ProgressionReviewSheet'

export function ProgramScreen() {
  const { user } = useSession()
  const me = useMe()
  const overview = useQuery({ ...programOverviewQueryOptions(user!), enabled: Boolean(user) })
  const failed = me.isError ? me : overview.isError ? overview : null
  if (failed) return <PlanLayout><Heading order={1}>Plan</Heading><Panel style={{ padding: spacing.md, gap: spacing.sm }}>
    <Text tone="danger">{failed.error instanceof Error ? failed.error.message : 'Your plan could not load.'}</Text>
    <Button label="Retry" loading={failed.isFetching} onPress={() => void failed.refetch()} />
  </Panel></PlanLayout>
  if (!user || me.isPending || overview.isPending || !overview.data) return <PlanLayout>
    <Heading order={1}>Plan</Heading><Text tone="dimmed">Loading your plan…</Text>
  </PlanLayout>
  if (!overview.data.activeProgram) return <PlanLayout><NoPlan /></PlanLayout>
  return <ActivePlan key={`${user.id}:${overview.data.activeProgram.id}`} overview={overview.data} user={user}
    mode={me.data?.experienceMode ?? 'guided'} date={createAccountClock({ timeZone: me.data?.timezone }).today} />
}

function ActivePlan({ overview, user, mode, date }: {
  overview: ProgramOverview; user: User; mode: ExperienceMode; date: string
}) {
  const { theme } = useTokens()
  const focused = useIsFocused()
  const program = overview.activeProgram!
  const plan = buildProgramPlan({ program, sessionStamps: overview.sessionStamps, scheduledDate: date })
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [selectedSession, setSelectedSession] = useState<number | null>(null)
  const [selectedState, setSelectedState] = useState<ProgramStateOverview | null>(null)
  const [recapId, setRecapId] = useState<string | null>(null)
  const [settings, setSettings] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [review, setReview] = useState(false)
  const week = plan.weeks[selectedWeek ?? plan.currentWeekIndex] ?? plan.weeks[plan.currentWeekIndex]
  const row = plan.weeks.flatMap(item => item.sessions).find(item => item.globalIndex === selectedSession)
  const state = overview.stateValues.find(item => item.stateKey === selectedState?.stateKey)
  const advanced = mode === 'full'
  const selectSession = (session: ProgramPlanSession) => {
    if (session.saved?.id) setRecapId(session.saved.id)
    else setSelectedSession(session.globalIndex)
  }
  return <PlanLayout>
    <View style={{ gap: 3 }}><SectionLabel>The plan you are running</SectionLabel>
      <Heading order={1} style={{ fontSize: 24 }}>{program.title}</Heading>
      <Text size="sm" tone="dimmed">Week {plan.currentWeekIndex + 1} of {plan.totalWeeks} · {plan.weeks[plan.currentWeekIndex].phaseLabel}{advanced ? ` · ${plan.completedSessions}/${plan.totalSessions} sessions (${Math.round(100 * plan.completedSessions / plan.totalSessions)}%)` : ''}</Text>
    </View>
    {advanced ? <PlanTargetTable plan={plan} units={program.units} compact /> : <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.xs }}>
        <Text weight={800}>{plan.completedSessions} of {plan.totalSessions} sessions done</Text>
        <Text size="sm" weight={700} tone="action">{plan.totalSessions - plan.completedSessions} left</Text>
      </View>
      <View accessible accessibilityRole="progressbar" accessibilityLabel="Current cycle progress"
        accessibilityValue={{ min: 0, max: plan.totalSessions, now: plan.completedSessions }}
        style={{ height: 6, borderRadius: 3, backgroundColor: theme.surfaceInset, overflow: 'hidden' }}>
        <View style={{ height: 6, width: `${100 * plan.completedSessions / plan.totalSessions}%`, backgroundColor: theme.primaryFill }} />
      </View><Caption>Progress through this cycle, one workout at a time.</Caption>
    </Panel>}
    <SegmentedControl accessibilityLabel="Programme week" value={String(week.index)}
      options={plan.weeks.map(item => ({ value: String(item.index), label: `Week ${item.number}` }))}
      variant={plan.totalWeeks <= 4 ? 'segments' : 'pills'} appearance="inset" size="sm" onChange={value => setSelectedWeek(Number(value))} />
    <PlanWeekSessions week={week} advanced={advanced} onSelect={selectSession} />
    <PlanWorkingWeights states={overview.stateValues} onSelect={setSelectedState} />
    <ProgressionReviewAlert decisions={overview.pendingDecisions} onReview={() => setReview(true)} />
    {isReturnActive(program.returnPeriod) && program.returnPeriod ? <Button label={returnProgressLabel(program.returnPeriod)}
      variant="light" tone="warning" onPress={() => setReturnOpen(true)} /> : null}
    <Button fullWidth label="Browse other plans ›" variant="subtle" onPress={() => router.navigate('/templates')} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      <Button label={`All ${plan.totalWeeks} weeks`} variant="default" style={{ flex: 1, minWidth: 135 }} onPress={() => router.push('/(tabs)/program/weeks')} />
      <Button label="Plan settings" variant="default" style={{ flex: 1, minWidth: 135 }} onPress={() => setSettings(true)} />
    </View>
    <Button label="Workout history ›" variant="subtle" onPress={() => router.navigate('/(tabs)/history')} />
    {focused && settings ? <PlanSettingsSheet open overview={overview} onClose={() => setSettings(false)}
      onEquipment={() => router.push('/(tabs)/program/equipment')}
      onReturn={() => { setSettings(false); setReturnOpen(true) }} /> : null}
    {focused && returnOpen ? <ReturnGuideSheet open program={program} onClose={() => setReturnOpen(false)} /> : null}
    {focused && row ? <PlanSessionEntrySheet key={row.globalIndex} row={row} program={program} mode={mode} user={user} onClose={() => setSelectedSession(null)} /> : null}
    {focused && state ? <WorkingWeightSheet state={state} overview={overview} plan={plan} onClose={() => setSelectedState(null)} /> : null}
    {focused && recapId ? <SessionSummarySheet sessionId={recapId} user={user} onClose={() => setRecapId(null)} /> : null}
    {focused && review ? <ProgressionReviewSheet open decisions={overview.pendingDecisions} units={program.units} user={user}
      contextLabel={program.title} onClose={() => setReview(false)} /> : null}
  </PlanLayout>
}
