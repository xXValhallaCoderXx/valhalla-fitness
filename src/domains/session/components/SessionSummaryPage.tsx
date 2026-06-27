import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Box, Button, Card } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, Dumbbell, ListChecks, NotebookText, Sparkles, Trophy } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { sessionQueryOptions } from '~/domains/session/queries'
import type { MovementSlot, SessionSummary, SetLog, Unit, WorkoutSession } from '~/shared/types'
import { Caption, EmptyState, Page, PageHeader, PageLoadError, PageSkeleton, Panel, SectionLabel, SetSummary, StatValue, Text } from '~/components'
import { describeSet } from '~/shared/lib/set-notation'
import { buildSessionReceipt, summarizeMovementPerformance, type ReceiptEntry, type ReceiptTone } from '~/domains/session/lib/session-receipt'
import { PendingProgressionReviewModal, useResolveProgressionDecision } from '~/domains/program/components/PendingReview'

export function SessionSummaryPage({ sessionId, user }: { sessionId: string; user: unknown }) {
  const sessionQuery = useQuery({
    ...sessionQueryOptions(sessionId),
    enabled: Boolean(user),
  })

  if (!user) {
    return (
      <Page>
        <EmptyState title="Sign in to open this summary">Workout summaries are tied to your account.</EmptyState>
      </Page>
    )
  }

  if (sessionQuery.isPending) return <PageSkeleton />
  if (sessionQuery.isError) return <PageLoadError error={sessionQuery.error} onRetry={() => void sessionQuery.refetch()} />

  return <LoadedSummaryRoute sessionId={sessionId} session={sessionQuery.data} />
}

function LoadedSummaryRoute({
  session,
  sessionId,
}: {
  session: WorkoutSession
  sessionId: string
}) {
  const queryClient = useQueryClient()
  const sets = session.movements.flatMap((movement) => movement.sets)
  const completedSets = sets.filter((set) => set.completed)
  const summary = queryClient.getQueryData<SessionSummary>(['summary', sessionId])
  const [reviewOpen, setReviewOpen] = useState(false)
  const [resolvedDecisionIds, setResolvedDecisionIds] = useState<Set<string>>(() => new Set())
  const pendingDecisions = (summary?.decisions ?? []).filter((decision) => !resolvedDecisionIds.has(decision.id))
  const decisionMutation = useResolveProgressionDecision({
    onResolved: (decisionId) => {
      setResolvedDecisionIds((current) => new Set(current).add(decisionId))
      const remainingDecisions = (summary?.decisions ?? []).filter(
        (decision) => decision.id !== decisionId && !resolvedDecisionIds.has(decision.id),
      )
      if (!remainingDecisions.length) setReviewOpen(false)
      queryClient.setQueryData<SessionSummary>(['summary', sessionId], (current) =>
        current
          ? {
              ...current,
              decisions: current.decisions.filter((decision) => decision.id !== decisionId),
            }
          : current,
      )
    },
  })

  const topSets = summary?.topSets.length ? summary.topSets : sets.filter((set) => set.isTopSet || set.isAmrap)
  const mainLift = session.movements.find((movement) => movement.role === 'main')
  const accessoryHighlights =
    summary?.accessoryOutcomes.length
      ? summary.accessoryOutcomes
      : session.movements
          .filter((movement) => movement.role === 'accessory')
          .map((movement) => `${movement.movementName}: ${movement.sets.filter((set) => set.completed).length}/${movement.sets.length} sets logged`)
  const decisionCount = pendingDecisions.length
  const receipt = buildSessionReceipt(session, summary)

  return (
    <Page>
      <PageHeader
        title="Session summary"
        eyebrow={session.title}
        actions={
          <div className="flex items-center gap-2">
            <Badge>{session.estimatedMinutes} min</Badge>
            <Badge color="success">Completed</Badge>
          </div>
        }
      >
        {completedSets.length} of {sets.length} sets completed.
      </PageHeader>

      <Card
        className="mb-4 p-4"
        style={{
          borderColor: 'var(--vf-success-border)',
          backgroundColor: 'var(--vf-success-soft)',
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 shrink-0" style={{ color: 'var(--vf-success-text)' }} size={20} />
            <div>
              <Text component="h2" size="sm" fw={900}>All logged work saved</Text>
              <Caption component="p" mt={2}>Review your work, then head back to Today.</Caption>
            </div>
          </div>
          <Link to="/today">
            <Button className="w-full sm:w-auto">Done</Button>
          </Link>
        </div>
      </Card>

      <div className="mb-4 vf-stat-strip">
        <SummaryStat icon={<Dumbbell size={15} />} label="Movements" value={session.movements.length} />
        <SummaryStat icon={<ListChecks size={15} />} label="Sets" value={`${completedSets.length}/${sets.length}`} />
        <SummaryStat icon={<Trophy size={15} />} label="Top sets" value={topSets.length} />
        <SummaryStat icon={<ArrowRight size={15} />} label="Decisions" value={decisionCount} tone={decisionCount ? 'warning' : 'neutral'} />
      </div>

      {receipt.length ? (
        <Card className="mb-4 p-4">
          <div className="flex items-center gap-2">
            <Sparkles size={15} style={{ color: 'var(--vf-action-text)' }} />
            <SectionLabel>What changed, and why</SectionLabel>
          </div>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {receipt.map((entry, index) => (
              <ReceiptRow key={`${entry.movementName}-${index}`} entry={entry} />
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          {mainLift ? (
            <Card className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Badge color="action">Main lift</Badge>
                  <Text component="h2" mt="xs" size="lg" fw={900} truncate>{mainLift.movementName}</Text>
                  <Text component="p" mt={4} size="sm" tone="dimmed">{mainLift.targetSummary}</Text>
                </div>
                <Badge color={mainLift.sets.every((set) => set.completed) ? 'success' : 'warning'}>
                  {mainLift.sets.filter((set) => set.completed).length}/{mainLift.sets.length}
                </Badge>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Panel surface="inset" p="sm">
                  <SectionLabel>Best today</SectionLabel>
                  {topSets[0] ? (
                    <SetSummary className="mt-1" {...describeSet(topSets[0], session.units)} />
                  ) : (
                    <Text component="p" mt={4} size="sm" fw={900}>No top set logged</Text>
                  )}
                </Panel>
                <Panel surface="inset" p="sm">
                  <SectionLabel>Previous comparable</SectionLabel>
                  <Text component="p" mt={4} size="sm" fw={900}>{mainLift.previous?.label ?? 'No previous comparable'}</Text>
                </Panel>
              </div>
            </Card>
          ) : null}

          <Card>
            <SectionLabel>Completed work</SectionLabel>
            <div className="mt-3 grid gap-2">
              {session.movements.map((movement) => (
                <MovementSummaryRow key={movement.id} movement={movement} units={session.units} />
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <NotebookText size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
              <SectionLabel>Notes</SectionLabel>
            </div>
            <Text component="p" mt="xs" size="sm" tone="dimmed" lh={1.2}>
              {session.notes?.trim() || 'No session notes recorded.'}
            </Text>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <SectionLabel>Accessory highlights</SectionLabel>
            {accessoryHighlights.length ? (
              <div className="mt-3 space-y-2">
                {accessoryHighlights.map((outcome) => (
                  <Panel key={outcome} surface="inset" p="sm">
                    <Caption component="p" fw={700}>{outcome}</Caption>
                  </Panel>
                ))}
              </div>
            ) : (
              <Text component="p" mt="xs" size="sm" tone="dimmed">No accessory work logged in this session.</Text>
            )}
          </Card>

          <Card>
            <SectionLabel>Progression actions</SectionLabel>
            {pendingDecisions.length ? (
              <>
                <Card
                  className="mt-3 p-3"
                  style={{
                    borderColor: 'var(--vf-danger-border)',
                    backgroundColor: 'var(--vf-danger-soft)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Text component="p" size="sm" fw={900}>{pendingDecisions[0]?.movementName}</Text>
                      <Caption component="p" mt={4}>{pendingDecisions[0]?.recommendation}</Caption>
                    </div>
                    <Badge color="danger">{pendingDecisions.length} pending</Badge>
                  </div>
                </Card>
                <Button className="mt-3 w-full" color="danger" onClick={() => setReviewOpen(true)}>
                  Review progression
                </Button>
              </>
            ) : (
              <Text component="p" mt="xs" size="sm" tone="dimmed">No recommendation was generated yet.</Text>
            )}
          </Card>

          <Link to="/today">
            <Button className="w-full">Finish review</Button>
          </Link>
        </div>
      </div>
      <PendingProgressionReviewModal
        opened={reviewOpen}
        decisions={pendingDecisions}
        isSaving={decisionMutation.isPending}
        onClose={() => setReviewOpen(false)}
        onResolve={(decisionId, action) => decisionMutation.mutate({ decisionId, action })}
      />
    </Page>
  )
}

function SummaryStat({
  icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  tone?: 'neutral' | 'warning'
}) {
  return (
    <Panel surface="inset" p="sm" className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <Box c="dimmed" className="shrink-0">{icon}</Box>
        <StatValue c={tone === 'warning' ? 'var(--vf-warning-text)' : undefined} size="md" ta="right" truncate>
          {value}
        </StatValue>
      </div>
      <Caption component="p" mt={4} fw={800} tt="uppercase">{label}</Caption>
    </Panel>
  )
}

function receiptToneStyle(tone: ReceiptTone) {
  if (tone === 'success') return { borderColor: 'var(--vf-success-border)', backgroundColor: 'var(--vf-success-soft)' }
  if (tone === 'warning') return { borderColor: 'var(--vf-warning-border)', backgroundColor: 'var(--vf-warning-soft)' }
  return { borderColor: 'var(--mantine-color-default-border)', backgroundColor: 'var(--vf-surface-2)' }
}

function receiptChangeColor(tone: ReceiptTone) {
  if (tone === 'success') return 'var(--vf-success-text)'
  if (tone === 'warning') return 'var(--vf-warning-text)'
  return 'var(--mantine-color-text)'
}

// Lead with the actionable change (e.g. "87.5 kg → 90 kg") + a short why; the per-set
// detail lives in the "Completed work" section, so the verbose "learned" line is dropped.
function ReceiptRow({ entry }: { entry: ReceiptEntry }) {
  return (
    <div className="rounded-lg border p-3" style={receiptToneStyle(entry.tone)}>
      <Text size="sm" fw={700} truncate>{entry.movementName}</Text>
      <Text mt={1} size="sm" fw={900} lh={1.25} style={{ color: receiptChangeColor(entry.tone) }}>
        {entry.change}
      </Text>
      {entry.why ? (
        <Text mt={1} size="xs" tone="dimmed" lh={1.3} className="line-clamp-2">
          {entry.why}
        </Text>
      ) : null}
    </div>
  )
}

function MovementSummaryRow({
  movement,
  units,
}: {
  movement: MovementSlot
  units: Unit
}) {
  const performance = summarizeMovementPerformance(movement, units)
  return (
    <Panel surface="inset" p="sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Text component="p" fw={700} truncate>{movement.movementName}</Text>
          <Caption component="p" mt={2}>Goal: {performance.goal}</Caption>
        </div>
        <Badge color={movement.role === 'main' ? 'action' : 'neutral'}>{movement.role}</Badge>
      </div>
      <div className="mt-2 grid gap-0.5">
        {performance.didReps.length ? (
          <Caption fw={700}>You did: {performance.didReps.join(', ')} reps · {performance.result}</Caption>
        ) : (
          <Caption fw={700}>{performance.result}</Caption>
        )}
        {performance.bestSet ? <Caption>Best set: {performance.bestSet.compact}</Caption> : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {movement.sets.map((set: SetLog) => (
          <Badge
            key={set.id}
            color={set.completed ? 'success' : 'neutral'}
            variant="light"
          >
            {set.setIndex}: {describeSet(set, units).compact}
          </Badge>
        ))}
      </div>
    </Panel>
  )
}
