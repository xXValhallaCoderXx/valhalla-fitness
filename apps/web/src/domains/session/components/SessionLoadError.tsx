import { Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { isWorkoutUnavailable } from '@sheetless/domain/session/session-errors'
import { EmptyState, Page, PageLoadError } from '~/components'

export function WorkoutUnavailable() {
  return (
    <Page>
      <EmptyState
        title="Workout unavailable"
        action={<Button component={Link} to="/today">Back to Today</Button>}
      >
        This workout could not be found in your account. Return to Today to open an available workout.
      </EmptyState>
    </Page>
  )
}

export function SessionLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return isWorkoutUnavailable(error)
    ? <WorkoutUnavailable />
    : <PageLoadError error={error} onRetry={onRetry} />
}
