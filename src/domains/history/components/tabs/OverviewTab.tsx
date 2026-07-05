import { Badge, Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '~/shared/lib/cn'
import { formatCompactDate, formatRelativeTime } from '~/shared/lib/dates'
import { buildVolumeSeries, intensityColor, type VolumeSeries } from '~/domains/history/lib/insights'
import type {
  BodyLoadRegion,
  HistoryBestSet,
  HistoryDashboard,
  HistorySubstitutionSummary,
  RecentHistoryEntry,
} from '~/shared/types'
import { Caption, EmptyState, Panel, SectionLabel, StatValue, Text } from '~/components'
import {
  ACCENT_TEXT,
  bodyLoadColor,
  formatBestSetPrimary,
  formatE1rm,
  formatLoad,
  formatNumber,
  toneForTier,
  type HistoryTab,
} from '../insight-format'

export function OverviewTab({
  data,
  activeProgramTitle,
  onOpenSession,
  onNavigate,
}: {
  data: HistoryDashboard
  activeProgramTitle?: string | null
  onOpenSession: (sessionId: string) => void
  onNavigate: (tab: HistoryTab) => void
}) {
  const latestSession = data.recentSessions[0]
  const volumeWeeks = data.weeklyVolume.slice(-4)
  const volumeSeries = buildVolumeSeries(volumeWeeks, { width: 640, height: 150, paddingX: 24, paddingY: 16 })

  const kpis: Array<{ label: string; value: ReactNode; desktopOnly?: boolean }> = [
    { label: 'Sessions', value: data.overview.completedSessions },
    { label: 'Logged sets', value: data.overview.loggedSets },
    { label: 'Total volume', value: formatLoad(data.overview.completedVolume, data.overview.units) },
    { label: 'Movements', value: data.overview.uniqueMovements },
    {
      label: 'Latest',
      value: latestSession ? formatRelativeTime(latestSession.completedAt ?? latestSession.scheduledDate) : '—',
      desktopOnly: true,
    },
  ]

  return (
    <div className="space-y-4">
      <Panel p={0} className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-5" style={{ backgroundColor: 'var(--mantine-color-default-border)' }}>
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className={cn('p-4', kpi.desktopOnly && 'hidden lg:block')}
              style={{ backgroundColor: 'var(--mantine-color-default)' }}
            >
              <SectionLabel>{kpi.label}</SectionLabel>
              <StatValue size="xl" mt={4} truncate>
                {kpi.value}
              </StatValue>
            </div>
          ))}
        </div>
      </Panel>

      {data.overview.completedSessions ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            <Panel p="md">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <SectionLabel>Weekly volume</SectionLabel>
                  <Text mt={4} size="sm" fw={900}>Last {volumeWeeks.length} training weeks</Text>
                </div>
                <div className="text-right">
                  <Text size="sm" fw={900}>{formatLoad(volumeSeries.total, data.overview.units)}</Text>
                  {volumeSeries.trendPercent != null ? (
                    <Caption fw={700} tone={volumeSeries.trendPercent >= 0 ? 'success' : 'danger'}>
                      {volumeSeries.trendPercent >= 0 ? '+' : ''}{Math.round(volumeSeries.trendPercent)}% vs prev
                    </Caption>
                  ) : null}
                </div>
              </div>
              <div className="mt-3">
                <VolumeLineChart series={volumeSeries} />
              </div>
            </Panel>

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
          </div>

          <div className="space-y-4">
            <Panel p="md">
              <div className="flex items-center justify-between gap-3">
                <SectionLabel>Most worked</SectionLabel>
                <NavLink label="Body map" onClick={() => onNavigate('body-load')} />
              </div>
              <div className="mt-3 space-y-3">
                {data.bodyLoad.topRegions.slice(0, 4).map((region) => (
                  <MostWorkedBar key={region.regionId} region={region} />
                ))}
                {!data.bodyLoad.topRegions.length ? (
                  <Text size="sm" tone="dimmed">No muscle fatigue data yet.</Text>
                ) : null}
              </div>
            </Panel>

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
                  <Text size="sm" tone="dimmed" mt="sm">No completed sets yet.</Text>
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
      ) : (
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
            ? `${activeProgramTitle} is active. Complete your first session to start building your training stats, muscle fatigue, and volume trends.`
            : 'Complete a session to start building your training history, muscle fatigue, and volume trends.'}
        </EmptyState>
      )}
    </div>
  )
}

function VolumeLineChart({ series }: { series: VolumeSeries }) {
  if (!series.points.length) {
    return (
      <Panel surface="inset" p="md">
        <Text size="sm" tone="dimmed">No weekly volume yet.</Text>
      </Panel>
    )
  }
  return (
    <svg viewBox="0 0 640 180" role="img" aria-label="Weekly volume chart" className="block w-full" style={{ height: 'auto' }}>
      {[16, 75, 134].map((y) => (
        <line key={y} x1={24} y1={y} x2={616} y2={y} stroke="var(--mantine-color-default-border)" strokeWidth={1} opacity={0.6} />
      ))}
      <path d={series.areaPath} fill="var(--vf-action-soft)" />
      <path d={series.linePath} fill="none" stroke="var(--mantine-primary-color-filled)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {series.points.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <text x={point.x} y={point.y - 10} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--mantine-color-text)">
            {formatNumber(point.value)}
          </text>
          <circle cx={point.x} cy={point.y} r={4.5} fill="var(--mantine-color-default)" stroke="var(--mantine-primary-color-filled)" strokeWidth={2.5} />
          <text x={point.x} y={166} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--mantine-color-dimmed)">
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

function NavLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1">
      <Text component="span" size="xs" fw={700} c="var(--vf-action-text)">{label}</Text>
      <ArrowRight size={13} color="var(--vf-action-text)" />
    </button>
  )
}

function RecentMiniRow({ session, onOpen }: { session: RecentHistoryEntry; onOpen: () => void }) {
  const color = intensityColor(session.hardness)
  const date = session.completedAt ?? session.scheduledDate
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center gap-3 border-t py-2.5 text-left first:border-t-0"
      style={{ borderColor: 'var(--mantine-color-default-border)' }}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ACCENT_TEXT[color] }} />
      <div className="min-w-0 flex-1">
        <Text size="sm" fw={700} truncate>{session.title}</Text>
        <Caption truncate>{session.weekLabel ?? session.programTitle ?? 'Session'}</Caption>
      </div>
      <Badge color="success" style={{ flexShrink: 0 }}>{session.completedSetCount}/{session.plannedSetCount}</Badge>
      <Caption className="w-14 shrink-0" ta="right">{formatCompactDate(date)}</Caption>
    </button>
  )
}

function MostWorkedBar({ region }: { region: BodyLoadRegion }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Text size="sm" fw={600} truncate>{region.label}</Text>
        <Text size="xs" fw={700} tone={toneForTier(region.tier)}>{region.impactPercent}%</Text>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--vf-surface-inset)' }}>
        <div className="h-full rounded-full" style={{ width: `${region.impactPercent}%`, backgroundColor: bodyLoadColor(region.tier) }} />
      </div>
    </div>
  )
}

function LatestRecordRow({ set }: { set: HistoryBestSet }) {
  return (
    <div className="flex items-center gap-3 border-t py-2.5 first:border-t-0" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
      <Trophy size={16} color="var(--vf-warning-text)" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <Text size="sm" fw={700} truncate>{set.movementName}</Text>
        <Caption truncate>{formatBestSetPrimary(set)}</Caption>
      </div>
      <div className="shrink-0 text-right">
        <Text size="sm" fw={800} tone="action">{formatE1rm(set)}</Text>
        <SectionLabel>e1RM</SectionLabel>
      </div>
    </div>
  )
}

function SubstitutionRow({ substitution }: { substitution: HistorySubstitutionSummary }) {
  return (
    <Panel surface="inset" p="sm">
      <Text size="xs" fw={900}>
        {substitution.plannedMovementName} <Text component="span" size="xs" tone="dimmed">to</Text> {substitution.performedMovementName}
      </Text>
      <Caption mt={4} fw={700}>
        {formatReason(substitution.reason)} · {formatCompactDate(substitution.performedAt)}
      </Caption>
    </Panel>
  )
}

function formatReason(reason: HistorySubstitutionSummary['reason']) {
  return reason.replaceAll('_', ' ')
}
