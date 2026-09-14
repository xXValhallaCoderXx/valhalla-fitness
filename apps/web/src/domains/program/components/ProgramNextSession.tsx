import { Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Caption, Heading, Panel, SectionLabel } from '~/components'
import type { ProgramOverview } from '~/domains/program'

/**
 * The "what's next" band.
 *
 * Read-only on purpose: starting a workout lives on Today, behind the pending-review gate. A second
 * start button here would mean a second place for that gate to drift out of step.
 */
export function ProgramNextSession({
  nextSession,
  meta,
}: {
  nextSession: NonNullable<ProgramOverview['nextSession']>
  meta: string
}) {
  const inProgress = nextSession.status === 'in_progress'

  return (
    <Panel
      p="md"
      data-testid="program-next-session"
      style={{ backgroundColor: 'var(--vf-bg-elevated)' }}
    >
      {/* Layout lives on a plain div: Paper's unlayered `display` reset beats a layered Tailwind
          flex utility, which silently stacks the CTA under the meta line. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <SectionLabel tone="action">{inProgress ? 'In progress' : 'Next session'}</SectionLabel>
          <Heading mt={4} order={2} size="h3" lh={1.15} className="truncate">
            {nextSession.title}
          </Heading>
          <Caption mt={4}>{meta}</Caption>
        </div>

        <Button component={Link} to="/today" className="shrink-0">
          {inProgress ? 'Resume workout' : 'Start workout'}
          <ArrowRight size={15} />
        </Button>
      </div>
    </Panel>
  )
}
