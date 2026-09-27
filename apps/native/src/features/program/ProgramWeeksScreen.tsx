import { View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { buildProgramPlan } from '@sheetless/domain/program/program-plan'
import { createAccountClock } from '@sheetless/domain/shared/dates'
import { Button, Caption, Heading, Panel, SectionLabel, Text } from '@/components'
import { useMe } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { spacing, useTokens } from '@/lib/tokens'
import { programOverviewQueryOptions } from './queries'
import { PlanLayout } from './overview/PlanLayout'
import { PlanTargetTable } from './overview/PlanTargetTable'

export function ProgramWeeksScreen() {
  const { user } = useSession()
  const me = useMe()
  const { theme } = useTokens()
  const overview = useQuery({ ...programOverviewQueryOptions(user!), enabled: Boolean(user) })
  const back = () => router.back()
  const failed = me.isError ? me : overview.isError ? overview : null
  if (failed) return <PlanLayout onBack={back}>
    <Heading order={1}>All weeks</Heading><Text tone="danger">{failed.error?.message}</Text>
    <Button label="Retry" loading={failed.isFetching} onPress={() => void failed.refetch()} />
  </PlanLayout>
  if (me.isPending || overview.isPending || !overview.data) return <PlanLayout onBack={back}><Text>Loading your plan…</Text></PlanLayout>
  const program = overview.data.activeProgram
  if (!program) return <PlanLayout onBack={back}><Heading order={1}>No active plan</Heading>
    <Button label="Browse programmes" onPress={() => router.navigate('/templates')} /></PlanLayout>
  const plan = buildProgramPlan({ program, sessionStamps: overview.data.sessionStamps,
    scheduledDate: createAccountClock({ timeZone: me.data?.timezone }).today })
  return <PlanLayout onBack={back}>
    <View style={{ gap: 4 }}><Heading order={1}>All {plan.totalWeeks} weeks</Heading><Caption>{program.title} · current cycle</Caption></View>
    <PlanTargetTable plan={plan} units={program.units} />
    <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
      <SectionLabel>What each week asks of you</SectionLabel>
      {plan.weeks.map(week => <View key={week.index} style={{ gap: 4, paddingVertical: spacing.sm, borderTopWidth: 1, borderColor: theme.border }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 4 }}>
          <Text weight={800}>Week {week.number} · {week.phaseLabel}</Text><Caption>{week.sessionsDone}/{week.sessionsTotal} sessions</Caption>
        </View><Text size="sm">{week.summary}</Text>
      </View>)}
    </Panel>
    <Caption>Future weeks preview your current weights and adjustments. Accepted progression can change their targets before you reach them.</Caption>
  </PlanLayout>
}
