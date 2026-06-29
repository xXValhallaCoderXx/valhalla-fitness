import { Button, Modal } from '@mantine/core'
import { Check, ChevronDown, FileText, Star, Trophy, X } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { formatFullDate, formatRelativeTime } from '~/shared/lib/dates'
import { buildWorkoutSummary, type AccentTone, type EffortTone, type SummaryExercise, type WorkoutSummaryModel } from '~/domains/history/lib/workout-summary'
import type { RecentHistoryEntry, WorkoutSession } from '~/shared/types'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'

const TONE_TEXT: Record<AccentTone | EffortTone, string> = {
  action: 'var(--vf-action-text)',
  accent: 'var(--vf-accent-text)',
  warning: 'var(--vf-warning-text)',
  success: 'var(--vf-success-text)',
  danger: 'var(--vf-danger-text)',
  neutral: 'var(--mantine-color-dimmed)',
}
const TONE_SOFT: Record<AccentTone | EffortTone, string> = {
  action: 'var(--vf-action-soft)',
  accent: 'var(--vf-accent-soft)',
  warning: 'var(--vf-warning-soft)',
  success: 'var(--vf-success-soft)',
  danger: 'var(--vf-danger-soft)',
  neutral: 'var(--vf-surface-2)',
}

export function WorkoutSummaryModal({
  open,
  fallback,
  session,
  isLoading,
  error,
  onClose,
}: {
  open: boolean
  fallback: RecentHistoryEntry | null
  session?: WorkoutSession
  isLoading: boolean
  error: unknown
  onClose: () => void
}) {
  const model = session ? buildWorkoutSummary(session) : null

  return (
    <Modal
      opened={open}
      onClose={onClose}
      withCloseButton={false}
      padding={0}
      size="44rem"
      classNames={{
        inner: '!items-end !p-0 sm:!items-center sm:!p-4',
        content: '!mb-0 !flex !max-h-[92dvh] !w-full !flex-col !overflow-hidden !rounded-t-2xl !rounded-b-none sm:!mb-auto sm:!rounded-2xl',
        body: '!flex !min-h-0 !flex-1 !flex-col !overflow-hidden !p-0',
      }}
      styles={{
        content: {
          border: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'var(--mantine-color-default)',
          color: 'var(--mantine-color-text)',
        },
        body: { color: 'var(--mantine-color-text)' },
      }}
    >
      <div className="flex-none">
        <div className="flex justify-center pb-1 pt-2 sm:hidden">
          <span className="h-1 w-9 rounded-full" style={{ backgroundColor: 'var(--mantine-color-default-border)' }} />
        </div>
        <div
          className="flex items-center justify-between px-4 py-3 sm:px-5"
          style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
        >
          <SectionLabel>Workout summary</SectionLabel>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md"
            style={{ color: 'var(--mantine-color-dimmed)' }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <StatusBlock>Loading workout summary…</StatusBlock>
        ) : error ? (
          <StatusBlock tone="danger">{getApiErrorMessage(error, 'Unable to load workout summary')}</StatusBlock>
        ) : session && model ? (
          <>
            <Hero model={model} session={session} />
            <div className="space-y-4 px-4 py-4 sm:px-5">
              {model.sessionBest ? <SessionBest best={model.sessionBest} /> : null}
              <div>
                <SectionLabel className="mb-2">Exercises · {model.exercises.length}</SectionLabel>
                <div className="space-y-2.5">
                  {model.exercises.map((exercise) => (
                    <ExerciseCard key={exercise.id} exercise={exercise} />
                  ))}
                </div>
              </div>
              {model.notes ? <NotesCard notes={model.notes} /> : null}
            </div>
          </>
        ) : fallback ? (
          <StatusBlock>{fallback.title} is ready to review.</StatusBlock>
        ) : null}
      </div>

      <div
        className="flex-none px-4 py-3 sm:px-5"
        style={{ borderTop: '1px solid var(--mantine-color-default-border)', paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
      >
        <Button fullWidth onClick={onClose}>Done</Button>
      </div>
    </Modal>
  )
}

function Hero({ model, session }: { model: WorkoutSummaryModel; session: WorkoutSession }) {
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
            <Chip tone="action">{session.hardness} day</Chip>
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

function SessionBest({ best }: { best: NonNullable<WorkoutSummaryModel['sessionBest']> }) {
  const subtle = 'rgba(255,255,255,0.72)'
  return (
    <div className="flex items-center gap-3.5 rounded-2xl p-4" style={{ backgroundColor: 'var(--mantine-color-action-9)' }}>
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
        <Trophy size={20} color="#fff" />
      </span>
      <div className="min-w-0 flex-1">
        <Text size="0.625rem" fw={700} tt="uppercase" style={{ letterSpacing: '0.07em', color: subtle }}>Session best</Text>
        <Text fw={800} truncate mt={2} style={{ color: '#fff' }}>{best.movementName} · {best.resultLabel}</Text>
      </div>
      <div className="flex-none text-right">
        <Text fw={800} style={{ color: '#fff' }}>{best.e1rmLabel}</Text>
        <Text size="0.625rem" fw={700} tt="uppercase" style={{ letterSpacing: '0.05em', color: subtle }}>
          e1RM{best.rir != null ? ` · RIR ${best.rir}` : ''}
        </Text>
      </div>
    </div>
  )
}

function ExerciseCard({ exercise }: { exercise: SummaryExercise }) {
  const [open, setOpen] = useState(exercise.defaultOpen)
  return (
    <div className="relative overflow-hidden rounded-xl" style={{ border: '1px solid var(--mantine-color-default-border)' }}>
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: TONE_TEXT[exercise.accentTone] }} />
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-3 py-3 pl-4 pr-3.5 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Text fw={800} truncate>{exercise.name}</Text>
            <span style={tagStyle(exercise.accentTone)}>{exercise.tagLabel}</span>
            {exercise.hitEveryTarget ? (
              <span className="inline-flex items-center gap-1" style={hitStyle}>
                <Check size={11} />Hit every target
              </span>
            ) : null}
          </div>
          <Caption mt={2} truncate>{exercise.targetSummary} · {exercise.volumeLabel}</Caption>
        </div>
        <div className="hidden flex-none text-right sm:block">
          <Text size="sm" fw={700}>{exercise.bestSetLabel}</Text>
          <Caption>best set</Caption>
        </div>
        <ChevronDown
          size={18}
          color="var(--mantine-color-dimmed)"
          className="flex-none"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
        />
      </button>
      {open ? (
        <div className="pb-3 pl-4 pr-3.5">
          <div className="grid grid-cols-[2rem_1fr_3rem] gap-3 px-2 pb-1 sm:grid-cols-[2.25rem_1fr_5.5rem]">
            <SectionLabel>Set</SectionLabel>
            <SectionLabel>Result</SectionLabel>
            <SectionLabel ta="center">RIR</SectionLabel>
          </div>
          {exercise.sets.map((set, index) => (
            <div
              key={`${set.index}-${index}`}
              className="grid grid-cols-[2rem_1fr_3rem] items-center gap-3 rounded-lg px-2 py-2 sm:grid-cols-[2.25rem_1fr_5.5rem]"
              style={set.isTop ? { backgroundColor: 'var(--vf-action-soft)' } : undefined}
            >
              <Text size="sm" fw={700} tone="dimmed">{set.index}</Text>
              <span className="flex min-w-0 items-center gap-2">
                <Text size="sm" fw={700} truncate tone={set.isTop ? 'action' : undefined}>{set.resultLabel}</Text>
                {set.isTop ? (
                  <span className="inline-flex items-center gap-1" style={topPillStyle}>
                    <Star size={10} fill="currentColor" stroke="none" />Top set
                  </span>
                ) : null}
              </span>
              <span className="justify-self-center" style={rirPillStyle(set.rirTone)}>{set.rir ?? '—'}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function NotesCard({ notes }: { notes: string }) {
  return (
    <Panel surface="inset" p="sm">
      <div className="flex items-start gap-3">
        <FileText size={16} color="var(--mantine-color-dimmed)" className="mt-0.5 flex-none" />
        <div>
          <SectionLabel>Session notes</SectionLabel>
          <Text size="sm" tone="dimmed" mt={2}>{notes}</Text>
        </div>
      </div>
    </Panel>
  )
}

function StatusBlock({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'danger' }) {
  return (
    <div className="p-4 sm:p-5">
      <Panel
        p="sm"
        style={{
          borderColor: tone === 'danger' ? 'var(--vf-danger-border)' : 'var(--mantine-color-default-border)',
          backgroundColor: tone === 'danger' ? 'var(--vf-danger-soft)' : 'var(--vf-surface-2)',
        }}
      >
        <Text size="sm" tone={tone === 'danger' ? 'danger' : 'dimmed'}>{children}</Text>
      </Panel>
    </div>
  )
}

function tagStyle(tone: AccentTone): CSSProperties {
  return {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    padding: '3px 7px',
    borderRadius: 5,
    whiteSpace: 'nowrap',
    flex: 'none',
    color: TONE_TEXT[tone],
    backgroundColor: TONE_SOFT[tone],
  }
}

const hitStyle: CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  color: 'var(--vf-success-text)',
  backgroundColor: 'var(--vf-success-soft)',
  padding: '3px 8px',
  borderRadius: 99,
  whiteSpace: 'nowrap',
}

const topPillStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--vf-action-text)',
  backgroundColor: 'var(--vf-action-soft)',
  padding: '3px 8px',
  borderRadius: 99,
  whiteSpace: 'nowrap',
  flex: 'none',
}

function rirPillStyle(tone: EffortTone): CSSProperties {
  return {
    fontSize: 12.5,
    fontWeight: 700,
    padding: '4px 0',
    width: 44,
    textAlign: 'center',
    borderRadius: 99,
    color: TONE_TEXT[tone],
    backgroundColor: TONE_SOFT[tone],
  }
}
