import { Button } from '@mantine/core'
import { ChevronDown } from 'lucide-react'
import { Caption, SectionLabel, Text } from '~/components'
import type { ProgramSetupOptions } from '~/domains/program'
import { cn } from '~/shared/lib/cn'

export function FindMyPlanWeekPreview({
  weekOpen,
  weekLoading,
  weekError,
  onRetryWeek,
  weekSessions,
  onToggleWeek,
}: {
  weekOpen: boolean
  weekLoading: boolean
  weekError: boolean
  onRetryWeek: () => void
  weekSessions: NonNullable<ProgramSetupOptions['previewWeeks']>[number]['sessions']
  onToggleWeek: () => void
}) {
  return (
    <>
      <div className="mt-5 flex items-center justify-between">
        <SectionLabel className="hidden md:block">A typical week</SectionLabel>
        <button
          type="button"
          onClick={onToggleWeek}
          className="inline-flex items-center gap-1 md:hidden"
        >
          <Caption component="span" fw={700} tone="action">
            {weekOpen ? 'Hide the week' : "See what's inside"}
          </Caption>
          <ChevronDown
            size={16}
            color="var(--vf-action-text)"
            style={{ transform: weekOpen ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }}
          />
        </button>
      </div>
      <div className={cn('mt-3 flex-col gap-2', weekOpen ? 'flex' : 'hidden', 'md:flex')}>
        {weekLoading ? (
          <Caption>Loading the week…</Caption>
        ) : weekError ? (
          <div className="space-y-2" role="alert">
            <Caption>We couldn't load this week's preview.</Caption>
            <Button size="xs" variant="light" onClick={onRetryWeek}>Retry preview</Button>
          </div>
        ) : weekSessions.length ? (
          weekSessions.map((session) => (
            <div
              key={session.id}
              className="flex items-start gap-3 rounded-xl border p-3"
              style={{ borderColor: 'var(--mantine-color-default-border)', backgroundColor: 'var(--mantine-color-default)' }}
            >
              <span className="shrink-0 rounded-md px-2 py-1" style={{ backgroundColor: 'var(--vf-action-soft)' }}>
                <Caption component="span" fw={800} tone="action">
                  {session.label}
                </Caption>
              </span>
              <div className="min-w-0">
                <Text component="p" size="sm" fw={700}>
                  {session.title}
                </Text>
                <Caption component="p" mt={2} lh={1.4}>
                  {session.movementSummary}
                </Caption>
              </div>
            </div>
          ))
        ) : (
          <Caption>Plan preview is unavailable right now.</Caption>
        )}
      </div>
    </>
  )
}
