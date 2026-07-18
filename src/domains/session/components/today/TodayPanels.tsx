import { Badge, Skeleton, VisuallyHidden } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Caption, CollapsiblePanel, Panel, SectionLabel, Text } from '~/components'
import { bodyLoadTierLabels, recoverySummaryLine, worstBodyLoadTier } from '~/domains/history/lib/body-load'
import { streakBadgeLabel } from '~/domains/history/lib/consistency'
import type { BodyLoadTier, HistoryDashboard, HistoryDashboardWithInsights, ProgramOverview, Unit } from '~/shared/types'
import {
  ProgramProgressSkeleton,
  RecoveryCheckSkeleton,
  UnavailablePanel,
  WeeklyVolumeSkeleton,
} from './TodayPanelFeedback'

type AsyncPanelProps = {
  isPending?: boolean
  isError?: boolean
}

/** Habit-loop chip for the Today heroes; renders nothing until a streak is worth celebrating. */
export function StreakBadge({
  history,
  isPending = false,
  isError = false,
}: {
  history?: HistoryDashboardWithInsights
} & AsyncPanelProps) {
  if (!history && isPending) {
    return (
      <span className="inline-flex" aria-busy="true" data-testid="streak-badge-loading">
        <Skeleton width={86} height={22} radius="xl" aria-hidden="true" />
        <VisuallyHidden>Loading workout streak</VisuallyHidden>
      </span>
    )
  }
  if (!history && isError) return null

  const label = streakBadgeLabel(history?.insights.consistency)
  if (!label) return null
  return (
    <Badge color="warning" variant="light" data-testid="streak-badge">
      {label}
    </Badge>
  )
}

export function ProgramProgressPanel({
  overview,
  fallbackWeekLabel,
  isPending = false,
  isError = false,
}: {
  overview?: ProgramOverview
  fallbackWeekLabel?: string
} & AsyncPanelProps) {
  if (!overview && isPending) return <ProgramProgressSkeleton />
  if (!overview && isError) {
    return (
      <UnavailablePanel
        testId="program-progress-unavailable"
        title="Program progress"
        message="Program progress is unavailable right now."
      />
    )
  }

  const progress = overview?.position?.progressPercent ?? null
  return (
    <Panel p="sm">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Program</SectionLabel>
        <Badge color="action">{overview?.activeProgram?.title ?? 'Active'}</Badge>
      </div>
      <ProgressBar value={progress ?? 0} className="mt-3" />
      <Caption mt="xs">
        {overview?.position
          ? `${overview.position.weekLabel} · ${overview.position.phaseLabel}`
          : fallbackWeekLabel
            ? `Queued from ${fallbackWeekLabel}.`
            : 'Program position loads with your dashboard.'}
      </Caption>
    </Panel>
  )
}

export function WeeklyVolumePanel({
  history,
  isPending = false,
  isError = false,
}: {
  history?: HistoryDashboard
} & AsyncPanelProps) {
  if (!history && isPending) return <WeeklyVolumeSkeleton />
  if (!history && isError) {
    return (
      <UnavailablePanel
        testId="weekly-volume-unavailable"
        title="Weekly volume"
        message="Weekly volume is unavailable right now."
      />
    )
  }

  const weeks = history?.weeklyVolume.slice(-5) ?? []
  return (
    <Panel p="sm">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Weekly volume</SectionLabel>
        <Badge>{weeks.length ? `${weeks.length} wk` : 'No data'}</Badge>
      </div>
      {weeks.length ? (
        <MiniBars
          className="mt-3"
          values={weeks.map((week) => week.volume)}
          labels={weeks.map((week) => week.weekLabel)}
          units={history?.overview.units}
        />
      ) : (
        <Caption mt="xs">Complete sessions to build a volume trend.</Caption>
      )}
    </Panel>
  )
}

const recoveryDotColors: Record<BodyLoadTier, string> = {
  fresh: 'var(--vf-success-text)',
  low: 'var(--vf-success-text)',
  moderate: 'var(--vf-warning-text)',
  high: 'var(--vf-danger-text)',
}

export function RecoveryCheckPanel({
  history,
  isPending = false,
  isError = false,
}: {
  history?: HistoryDashboard
} & AsyncPanelProps) {
  if (!history && isPending) return <RecoveryCheckSkeleton />
  if (!history && isError) {
    return (
      <UnavailablePanel
        testId="recovery-check-unavailable"
        title="Recovery check"
        message="Recovery data is unavailable right now."
      />
    )
  }
  if (!history) return null

  const regions = history.bodyLoad.topRegions
  return (
    <CollapsiblePanel
      data-testid="recovery-check"
      title="Recovery check"
      leading={
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: recoveryDotColors[worstBodyLoadTier(regions)] }}
        />
      }
      summary={recoverySummaryLine(regions)}
    >
      <div className="grid gap-3">
        {regions.length ? (
          regions.slice(0, 3).map((region) => (
            <div key={region.regionId} className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-2">
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <Text size="xs" fw={800} truncate>{region.label}</Text>
                  <Caption>{bodyLoadTierLabels[region.tier]}</Caption>
                </div>
                <ProgressBar value={region.impactPercent} className="mt-1" />
              </div>
              <Text size="xs" fw={900} ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {region.impactPercent}%
              </Text>
            </div>
          ))
        ) : (
          <Caption>No recent muscle fatigue data.</Caption>
        )}
      </div>
      <Link to="/history" search={{ tab: 'body-load' }} className="mt-3 inline-flex items-center gap-1">
        <Text component="span" size="sm" fw={700} tone="action">Body map in Insights</Text>
        <ArrowRight size={14} color="var(--vf-action-text)" />
      </Link>
    </CollapsiblePanel>
  )
}

/** Weekly-volume totals are large; round and group ("12,400 kg") rather than show decimals. */
function formatVolume(value: number, units?: Unit | null) {
  return `${Math.round(value).toLocaleString()} ${units ?? ''}`.trim()
}

function MiniBars({
  values,
  labels,
  units,
  className,
}: {
  values: number[]
  labels: string[]
  units?: Unit | null
  className?: string
}) {
  const maxValue = Math.max(...values, 1)
  return (
    <div
      className={`grid items-end gap-1 ${className ?? ''}`}
      style={{ gridTemplateColumns: `repeat(${values.length || 1}, minmax(0, 1fr))` }}
    >
      {values.map((value, index) => {
        const height = Math.max(12, Math.round((value / maxValue) * 54))
        return (
          <div key={`${labels[index]}-${index}`} className="min-w-0">
            <div className="flex h-16 items-end rounded-md" style={{ backgroundColor: 'var(--vf-surface-inset)' }}>
              <div
                className="w-full rounded-md"
                style={{
                  height,
                  backgroundColor: 'var(--mantine-primary-color-filled)',
                }}
                aria-label={`${labels[index]} ${formatVolume(value, units)}`}
              />
            </div>
            <Caption mt={4} size="0.625rem" ta="center" truncate>{labels[index]}</Caption>
          </div>
        )
      })}
    </div>
  )
}

function ProgressBar({ value, className }: { value: number; className?: string }) {
  const width = `${Math.max(0, Math.min(100, value))}%`
  return (
    <div className={className} style={{ height: 6, overflow: 'hidden', borderRadius: 999, backgroundColor: 'var(--vf-surface-inset)' }}>
      <div style={{ width, height: '100%', borderRadius: 999, backgroundColor: 'var(--mantine-primary-color-filled)' }} />
    </div>
  )
}
