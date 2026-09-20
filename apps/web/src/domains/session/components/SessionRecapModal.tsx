import { Modal, Skeleton } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Clock, Dumbbell, ListChecks } from 'lucide-react'
import { buildWorkoutSummary, elapsedMinutes } from '@sheetless/domain/history/workout-summary'
import { formatWeekdayShortDate } from '@sheetless/domain/shared/dates'
import { Caption, Text } from '~/components'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import { sessionSummaryQueryOptions } from '~/domains/session/queries'
import { CompletedWorkCard, SummaryStat } from './SessionSummaryDetails'

/**
 * A finished workout, read-only.
 *
 * Deliberately not the summary *page* in a dialog: that screen owns progression mutations,
 * apply-all and the decision hero, and a second place to accept a decision is a second place for
 * it to go wrong. This answers "what did I actually do" and links out for anything actionable.
 */
export function SessionRecapModal({
  sessionId,
  onClose,
}: {
  /** Null keeps the modal closed; the query only runs once a session is picked. */
  sessionId: string | null
  onClose: () => void
}) {
  const userId = useRequiredAccountId()
  const summaryQuery = useQuery({
    ...sessionSummaryQueryOptions(userId, sessionId ?? ''),
    enabled: Boolean(sessionId),
  })

  const summary = summaryQuery.data
  const session = summary?.session
  const recap = session ? buildWorkoutSummary(session) : null
  const minutes = session ? elapsedMinutes(session) : 0

  return (
    <Modal
      opened={Boolean(sessionId)}
      onClose={onClose}
      size="lg"
      title={session?.title ?? 'Workout'}
    >
      {/* The testid sits on the content, not the Modal root — the root has no bounding box, so
          toBeVisible() never passes on it. */}
      <div data-testid="session-recap">
        {summaryQuery.isPending ? (
          <div className="grid gap-3">
            <Skeleton height={64} radius="md" />
            <Skeleton height={120} radius="md" />
          </div>
        ) : !recap || !session ? (
          <Text size="sm" tone="dimmed">
            This workout could not be loaded.
          </Text>
        ) : (
          <>
            <Caption>
              {formatWeekdayShortDate(session.scheduledDate)}
              {minutes ? ` · ${minutes} min` : ''}
            </Caption>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <SummaryStat
                icon={<ListChecks size={15} />}
                label="sets done"
                value={`${recap.completion.completed} of ${recap.completion.planned}`}
              />
              <SummaryStat icon={<Dumbbell size={15} />} label="weight moved" value={recap.stats.volumeLabel} />
              <SummaryStat
                icon={<Clock size={15} />}
                label="movements"
                value={recap.stats.movementCount}
              />
            </div>

            <div className="mt-4 grid gap-3">
              {recap.exercises.map((exercise) => (
                <CompletedWorkCard key={exercise.id} exercise={exercise} />
              ))}
            </div>

            <Link
              to="/sessions/$sessionId/summary"
              params={{ sessionId: session.sessionId }}
              className="mt-4 inline-flex items-center gap-1"
            >
              <Text component="span" size="sm" fw={700} tone="action">
                Open full summary
              </Text>
              <ArrowRight size={14} color="var(--vf-action-text)" />
            </Link>
          </>
        )}
      </div>
    </Modal>
  )
}
