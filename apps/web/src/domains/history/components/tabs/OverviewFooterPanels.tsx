import { Badge } from '@mantine/core'
import { Trophy } from 'lucide-react'
import { describeWorkoutDate, formatCompactDate } from '~/shared/lib/dates'
import { useAccountClock } from '~/domains/account/components/AccountIdentityProvider'
import { intensityColor } from '~/domains/history/lib/insights'
import type {
  HistoryBestSet,
  HistoryDashboardWithInsights,
  HistorySubstitutionSummary,
  RecentHistoryEntry,
} from '~/domains/history'
import { Caption, EquipmentModeBadge, Panel, SectionLabel, Text } from '~/components'
import { ACCENT_TEXT, formatBestSetPrimary, formatE1rm, type HistoryTab } from '../insight-format'

type NavigateToTab = (tab: HistoryTab) => void

/** The five most recent sessions, with a link through to the full Sessions tab. */
export function RecentSessionsPanel({
  data,
  onOpenSession,
  onNavigate,
}: {
  data: HistoryDashboardWithInsights
  onOpenSession: (sessionId: string) => void
  onNavigate: NavigateToTab
}) {
  return (
    <Panel p="md">
      <div className="mb-1 flex items-center justify-between gap-3">
        <SectionLabel>Recent sessions</SectionLabel>
        <NavLink label="View all" onClick={() => onNavigate('sessions')} />
      </div>
      <div className="flex flex-col">
        {data.recentSessions.slice(0, 5).map((session) => (
          <RecentMiniRow key={session.id} session={session} onOpen={() => onOpenSession(session.id)} />
        ))}
      </div>
    </Panel>
  )
}

/** Recent sessions beside the records / substitutions rail — the bottom of the Overview tab. */
export function OverviewFooterPanels({
  data,
  onOpenSession,
  onNavigate,
}: {
  data: HistoryDashboardWithInsights
  onOpenSession: (sessionId: string) => void
  onNavigate: NavigateToTab
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <RecentSessionsPanel data={data} onOpenSession={onOpenSession} onNavigate={onNavigate} />
      <div className="space-y-4">
        <Panel p="md">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>Latest records</SectionLabel>
            <NavLink label="All" onClick={() => onNavigate('records')} />
          </div>
          <div className="mt-1 flex flex-col">
            {data.bestSets.slice(0, 3).map((set) => (
              <LatestRecordRow key={`${set.movementId}-${set.id}`} set={set} />
            ))}
            {!data.bestSets.length ? (
              <Text size="sm" tone="dimmed" mt="sm">
                No completed sets yet.
              </Text>
            ) : null}
          </div>
        </Panel>

        {data.substitutions.length ? (
          <Panel p="md">
            <SectionLabel>Substitutions</SectionLabel>
            <div className="mt-3 space-y-2">
              {data.substitutions.slice(0, 3).map((substitution) => (
                <SubstitutionRow key={substitution.id} substitution={substitution} />
              ))}
            </div>
          </Panel>
        ) : null}
      </div>
    </div>
  )
}

function NavLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1">
      <Text component="span" size="xs" fw={700} c="var(--vf-action-text)">
        {label}
      </Text>
    </button>
  )
}

function RecentMiniRow({ session, onOpen }: { session: RecentHistoryEntry; onOpen: () => void }) {
  const color = intensityColor(session.hardness)
  const clock = useAccountClock()
  const date = describeWorkoutDate({
    scheduledDate: session.scheduledDate,
    completedAt: session.completedAt,
    timeZone: session.timeZone ?? clock.timeZone,
    today: clock.today,
  })
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center gap-3 border-t py-2.5 text-left first:border-t-0"
      style={{ borderColor: 'var(--mantine-color-default-border)' }}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ACCENT_TEXT[color] }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Text size="sm" fw={700} truncate>
            {session.title}
          </Text>
          <EquipmentModeBadge equipmentMode={session.equipmentMode} className="shrink-0" />
        </div>
        <Caption truncate>{session.weekLabel ?? session.programTitle ?? 'Session'}</Caption>
        {date.completionLabel ? <Caption truncate>{date.completionLabel}</Caption> : null}
      </div>
      <Badge color="success" style={{ flexShrink: 0 }}>
        {session.completedSetCount}/{session.plannedSetCount}
      </Badge>
      <Caption className="w-14 shrink-0" ta="right">
        {date.compactDate}
      </Caption>
    </button>
  )
}

function LatestRecordRow({ set }: { set: HistoryBestSet }) {
  return (
    <div
      className="flex items-center gap-3 border-t py-2.5 first:border-t-0"
      style={{ borderColor: 'var(--mantine-color-default-border)' }}
    >
      <Trophy size={16} color="var(--vf-warning-text)" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <Text size="sm" fw={700} truncate>
          {set.movementName}
        </Text>
        <Caption truncate>{formatBestSetPrimary(set)}</Caption>
      </div>
      <div className="shrink-0 text-right">
        <Text size="sm" fw={800} tone="action">
          {formatE1rm(set)}
        </Text>
        <SectionLabel>e1RM</SectionLabel>
      </div>
    </div>
  )
}

function SubstitutionRow({ substitution }: { substitution: HistorySubstitutionSummary }) {
  return (
    <Panel surface="inset" p="sm">
      <Text size="xs" fw={900}>
        {substitution.plannedMovementName} <Text component="span" size="xs" tone="dimmed">to</Text>{' '}
        {substitution.performedMovementName}
      </Text>
      <Caption mt={4} fw={700}>
        {substitution.reason.replaceAll('_', ' ')} · {formatCompactDate(substitution.performedAt)}
      </Caption>
    </Panel>
  )
}
