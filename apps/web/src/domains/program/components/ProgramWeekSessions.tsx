import { UnstyledButton } from '@mantine/core'
import { ArrowRight, Check } from 'lucide-react'
import { Caption, Heading, Text } from '~/components'
import { useExperienceMode } from '~/domains/account/components'
import type { ProgramSessionStamp } from '~/domains/program'
import type { TodayWeek, TodayWeekSession } from '@sheetless/domain/session/today-week'

const NUMERIC = { fontVariantNumeric: 'tabular-nums' } as const

const statusLabel: Record<TodayWeekSession['status'], string> = {
  done: 'Completed',
  next: 'Next',
  upcoming: 'Upcoming',
}

/** What is left this week — the programme's sessions in order, with where you are among them. */
export function ProgramWeekSessions({
  week,
  sessionStamps = [],
  onOpenSession,
  onBackToCurrent,
}: {
  week: TodayWeek
  /** Every completed workout of the programme, keyed by its global session index. */
  sessionStamps?: ProgramSessionStamp[]
  onOpenSession?: (sessionId: string) => void
  /** Offered only while a past or future week is on screen. */
  onBackToCurrent?: () => void
}) {
  const { isFull } = useExperienceMode()

  // `buildTodayWeek` is built from the template, so its rows carry template ids, not workout ids.
  // The stamp's `weekIndex` is the global session index the workout was planned at, which places
  // it exactly — no title matching, and it reaches every week of the cycle rather than the last
  // handful of workouts.
  const completedIdByGlobalIndex = new Map<number, string>()
  for (const stamp of sessionStamps) {
    if (stamp.id && !completedIdByGlobalIndex.has(stamp.weekIndex)) {
      completedIdByGlobalIndex.set(stamp.weekIndex, stamp.id)
    }
  }

  return (
    <section data-testid="program-week-sessions">
      <div className="mb-2 flex items-baseline gap-3">
        <Heading order={2} size="h4" lh={1.2}>
          {week.isCurrent && !isFull ? 'This week' : `Week ${week.weekNumber}`}
        </Heading>
        <Caption style={NUMERIC}>
          {isFull
            ? `${week.sessionsDone} / ${week.daysPerWeek} sessions`
            : `${week.sessionsDone} of ${week.daysPerWeek} sessions done`}
        </Caption>
        {/* Browsing another week needs a way back that is not "find the highlighted cell again". */}
        {!week.isCurrent && onBackToCurrent ? (
          <UnstyledButton onClick={onBackToCurrent} className="ml-auto">
            <Caption component="span" tone="action" fw={700}>
              Back to this week
            </Caption>
          </UnstyledButton>
        ) : null}
      </div>

      <div>
        {week.sessions.map((session, index) => {
          const completedId =
            session.status === 'done' ? completedIdByGlobalIndex.get(session.globalIndex) : undefined
          const openable = Boolean(completedId && onOpenSession)

          return (
          // A plain div, not UnstyledButton: its unlayered `padding: 0` reset beats the layered
          // Tailwind utilities this grid depends on.
          <div
            key={session.id}
            role={openable ? 'button' : undefined}
            tabIndex={openable ? 0 : undefined}
            aria-label={openable ? `View ${session.title}` : undefined}
            onClick={openable && completedId ? () => onOpenSession?.(completedId) : undefined}
            onKeyDown={
              openable && completedId
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onOpenSession?.(completedId)
                    }
                  }
                : undefined
            }
            className={`grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2.5 ${
              isFull
                ? 'md:grid-cols-[1.25rem_minmax(0,1fr)_8rem_5.5rem]'
                : 'md:grid-cols-[1.5rem_minmax(0,1.3fr)_minmax(0,1fr)_7.5rem]'
            } ${openable ? 'cursor-pointer' : ''}`}
            style={{
              borderTop: index ? '1px solid var(--mantine-color-default-border)' : undefined,
              backgroundColor: session.status === 'next' ? 'var(--vf-action-soft)' : undefined,
              borderRadius: session.status === 'next' ? 'var(--mantine-radius-sm)' : undefined,
              paddingInline: session.status === 'next' ? '0.5rem' : undefined,
            }}
          >
            <Caption fw={700} style={NUMERIC}>
              {index + 1}
            </Caption>

            <Text size="sm" fw={600} truncate>
              {session.title}
            </Text>

            {/* The meta column is desktop-only; a phone row is just number, name and status. */}
            <Caption className="hidden md:block" style={isFull ? NUMERIC : undefined} truncate>
              {isFull
                ? `${session.setCount} sets · ~${session.estimatedMinutes} min`
                : `${session.movementCount} movements · about ${session.estimatedMinutes} min`}
            </Caption>

            <div className="flex items-center justify-end gap-2">
              <Text
                component="span"
                size="sm"
                fw={700}
                tone={session.status === 'upcoming' ? 'dimmed' : 'action'}
              >
                {statusLabel[session.status]}
              </Text>
              {/* 04b states the status in words only; the dot is Guided's at-a-glance marker and
                  the space it costs is what truncates the session name in the narrower Full column. */}
              {!isFull ? <SessionStatusDot status={session.status} /> : null}
            </div>
          </div>
          )
        })}
      </div>
    </section>
  )
}

function SessionStatusDot({ status }: { status: TodayWeekSession['status'] }) {
  if (status === 'done') {
    return (
      <span
        aria-hidden="true"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: 'var(--vf-action-text)' }}
      >
        <Check size={11} color="var(--mantine-color-white)" strokeWidth={3.2} />
      </span>
    )
  }
  if (status === 'next') {
    return (
      <span
        aria-hidden="true"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: 'var(--mantine-primary-color-filled)' }}
      >
        <ArrowRight size={11} color="var(--mantine-color-white)" strokeWidth={3} />
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      className="h-5 w-5 shrink-0 rounded-full"
      style={{ border: '2px solid var(--mantine-color-default-border)' }}
    />
  )
}
