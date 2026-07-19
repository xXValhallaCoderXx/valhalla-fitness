import type { ReactNode } from 'react'
import { Heading, SectionLabel, Text } from '~/components'
import type { WorkoutSummaryModel } from '~/domains/history/lib/workout-summary'
import { AD_HOC_BADGE_LABEL } from '~/domains/session/lib/ad-hoc'
import { formatFullDate, formatRelativeTime } from '~/shared/lib/dates'
import type { WorkoutSession } from '~/shared/types'

export function WorkoutSummaryHero({ model, session }: { model: WorkoutSummaryModel; session: WorkoutSession }) {
  const date = session.completedAt ?? session.scheduledDate
  return (
    <div
      className="px-4 py-4 sm:px-5"
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)', background: 'linear-gradient(180deg, var(--vf-action-soft), transparent)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <SectionLabel tone="action">{session.programTitle}</SectionLabel>
          <Heading order={2} size="h2" mt={4} lh={1.15}>{session.title}</Heading>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {session.weekLabel ? <Chip>{session.weekLabel}</Chip> : null}
            {session.hardness ? (
              <Chip tone="action">{session.hardness} day</Chip>
            ) : session.isAdHoc ? (
              <Chip tone="action">{AD_HOC_BADGE_LABEL}</Chip>
            ) : null}
            <Chip>{formatFullDate(date)} · {formatRelativeTime(date)}</Chip>
          </div>
        </div>
        <CompletionRing percent={model.completion.percent} completed={model.completion.completed} planned={model.completion.planned} />
      </div>
      <StatStrip stats={model.stats} />
    </div>
  )
}

function Chip({ children, tone }: { children: ReactNode; tone?: 'action' }) {
  const isAction = tone === 'action'
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: isAction ? 700 : 600,
        padding: '4px 10px',
        borderRadius: 99,
        whiteSpace: 'nowrap',
        backgroundColor: isAction ? 'var(--vf-action-soft)' : 'var(--mantine-color-default)',
        border: `1px solid ${isAction ? 'var(--vf-action-border)' : 'var(--mantine-color-default-border)'}`,
        color: isAction ? 'var(--vf-action-text)' : 'var(--mantine-color-text)',
      }}
    >
      {children}
    </span>
  )
}

function CompletionRing({ percent, completed, planned }: { percent: number; completed: number; planned: number }) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(100, Math.max(0, percent)) / 100)
  return (
    <div className="relative flex-none" style={{ width: 84, height: 84 }}>
      <svg width="84" height="84" viewBox="0 0 96 96" aria-hidden>
        <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--mantine-color-default-border)" strokeWidth="8" />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="var(--mantine-primary-color-filled)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 48 48)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Text fw={800} size="md" lh={1}>{completed}/{planned}</Text>
        <SectionLabel tone="action" mt={2}>Sets done</SectionLabel>
      </div>
    </div>
  )
}

function StatStrip({ stats }: { stats: WorkoutSummaryModel['stats'] }) {
  const cells = [
    { label: 'Volume', value: stats.volumeLabel },
    { label: 'Movements', value: String(stats.movementCount) },
    { label: 'Top sets', value: String(stats.topSetCount) },
    { label: 'Duration', value: `${stats.durationMinutes} min` },
  ]
  return (
    <div
      className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl sm:grid-cols-4"
      style={{ backgroundColor: 'var(--mantine-color-default-border)', border: '1px solid var(--mantine-color-default-border)' }}
    >
      {cells.map((cell) => (
        <div key={cell.label} className="p-3" style={{ backgroundColor: 'var(--mantine-color-default)' }}>
          <SectionLabel>{cell.label}</SectionLabel>
          <Text fw={800} size="md" mt={2} truncate>{cell.value}</Text>
        </div>
      ))}
    </div>
  )
}
