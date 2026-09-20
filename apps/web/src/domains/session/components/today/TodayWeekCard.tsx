import { Check } from 'lucide-react'
import { Caption, Panel, Text } from '~/components'
import { useExperienceMode } from '~/domains/account/components'
import type { TodayWeek } from '@sheetless/domain/session/today-week'

const statusTone: Record<TodayWeek['sessions'][number]['status'], string> = {
  done: 'var(--vf-success-text)',
  next: 'var(--vf-action-text)',
  upcoming: 'var(--mantine-color-dimmed)',
}

/**
 * "This week".
 *
 * The comp draws a Mon–Sun calendar strip, but the programme model has no weekday schedule at all
 * — `TemplateDefinition` carries `daysPerWeek` and nothing else — so this lists the week's sessions
 * in order instead. Same counter, honest source.
 */
export function TodayWeekCard({ week }: { week: TodayWeek }) {
  const { isFull } = useExperienceMode()
  // The counter is scoped to the *programme* week, not the calendar week — it comes from the
  // completed-session counter, the same source as the "Session 3 of 5" badge. Full names the week
  // outright so the number is unambiguous; Guided keeps the comp's plainer heading.
  const title = isFull
    ? [`Week ${week.weekNumber}`, week.phaseLabel].filter(Boolean).join(' · ')
    : 'This week'

  return (
    <Panel p="md" data-testid="today-week">
      <div className="flex items-baseline justify-between gap-3">
        <Text size="md" fw={700}>
          {title}
        </Text>
        <Caption style={{ fontVariantNumeric: 'tabular-nums' }}>
          {week.sessionsDone} of {week.daysPerWeek} sessions done
        </Caption>
      </div>

      <div className="mt-3">
        {week.sessions.map((session, index) => (
          <div
            key={session.id}
            className="flex items-center gap-3 py-2"
            style={index ? { borderTop: '1px solid var(--vf-surface-3)' } : undefined}
          >
            <span
              aria-hidden="true"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
              style={{
                border: `1px solid ${session.status === 'upcoming' ? 'var(--mantine-color-default-border)' : statusTone[session.status]}`,
                backgroundColor: session.status === 'next' ? 'var(--vf-action-soft)' : 'transparent',
              }}
            >
              {session.status === 'done' ? <Check size={12} color={statusTone.done} /> : null}
            </span>

            <Text
              size="sm"
              fw={session.status === 'next' ? 700 : 500}
              tone={session.status === 'upcoming' ? 'dimmed' : 'default'}
              className="min-w-0 flex-1"
              truncate
            >
              {session.title}
            </Text>

            <Caption
              className="shrink-0"
              tone={session.status === 'next' ? 'action' : 'dimmed'}
              fw={session.status === 'next' ? 800 : 600}
            >
              {session.status === 'done' ? 'Done' : session.status === 'next' ? 'Next' : `${session.estimatedMinutes} min`}
            </Caption>
          </div>
        ))}
      </div>
    </Panel>
  )
}
