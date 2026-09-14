import { Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { formatCalendarRelativeDate } from '~/shared/lib/dates'
import { useAccountClock } from '~/domains/account/components/AccountIdentityProvider'
import { lockedInsightSteps, type InsightGate, type InsightGateId } from '~/domains/history/lib/insight-gates'
import { Caption, EmptyState, Heading, Panel, Text } from '~/components'

/** Nothing logged yet — the screen says so and points at the one thing that changes it. */
export function OverviewEmpty({ activeProgramTitle }: { activeProgramTitle?: string | null }) {
  return (
    <EmptyState
      centered
      title="No completed sessions yet"
      action={
        <Link to="/templates">
          <Button>Browse plans</Button>
        </Link>
      }
    >
      {activeProgramTitle
        ? `${activeProgramTitle} is active. Complete your first session to start building your strength trends, consistency, and volume.`
        : 'Complete a session to start building your strength trends, consistency, and volume.'}
    </EmptyState>
  )
}

/** One session in: what exists is not yet worth charting, so list what opens next instead. */
export function OverviewColdStart({ gates }: { gates: Record<InsightGateId, InsightGate> }) {
  return (
    <Panel p="md">
      <Heading order={3} size="h4">First session logged 🎉</Heading>
      <Caption mt={4}>Insights unlock as you train:</Caption>
      <div className="mt-3 flex flex-col gap-1.5">
        {lockedInsightSteps(gates).map((step) => (
          <Text key={step} size="sm" tone="dimmed">• {step}</Text>
        ))}
      </div>
    </Panel>
  )
}

/** A long gap: frame the numbers as history rather than current form. */
export function OverviewWelcomeBack({ latestTrainingDate }: { latestTrainingDate: string | null }) {
  const clock = useAccountClock()
  return (
    <Panel p="md">
      <Heading order={3} size="h4">Welcome back</Heading>
      <Caption mt={4}>
        It&apos;s been a while — the numbers below are from{' '}
        {formatCalendarRelativeDate(latestTrainingDate, clock.today).toLowerCase()}. Ease back in;
        strength returns fast.
      </Caption>
    </Panel>
  )
}
