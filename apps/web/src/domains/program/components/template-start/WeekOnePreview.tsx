import { Badge } from '@mantine/core'
import type { ProgramSetupPreviewWeek } from '~/domains/program'
import { setupLabel } from '~/domains/program/lib/setup-labels'
import { useExperienceMode } from '~/domains/account/components'
import { Caption, Panel, SectionLabel, Text } from '~/components'

/**
 * What the first week asks for, beside the numbers that feed it.
 *
 * The prescriptions are shown as the template states them — percentages in Full, the day and its
 * main lift in Guided. Resolving those to actual kilos needs the `TemplateDefinition`, and
 * `ProgramSetupOptions` deliberately ships summaries rather than the DSL; printing a load here
 * would mean guessing at one. The full week-by-week view is a step away.
 */
export function WeekOnePreview({
  week,
  showAccessoryNote = false,
}: {
  week: ProgramSetupPreviewWeek | undefined
  /** Only true on step 1, where step 2 is still ahead — on Review it would be stale advice. */
  showAccessoryNote?: boolean
}) {
  const { mode, isFull } = useExperienceMode()
  if (!week) return null

  return (
    <Panel p="md">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SectionLabel>{setupLabel('weekOnePreview', mode)}</SectionLabel>
        <Badge color="neutral" variant="light">{week.hardness}</Badge>
      </div>
      <Text mt={4} size="sm" fw={800}>{week.label}</Text>
      {week.summary ? <Caption mt={1}>{week.summary}</Caption> : null}

      <div className="mt-3 flex flex-col">
        {week.sessions.map((session) => {
          const main = session.movements.find((movement) => movement.role === 'main') ?? session.movements[0]
          return (
            <div
              key={session.id}
              className="border-t py-2.5 first:border-t-0 first:pt-0"
              style={{ borderColor: 'var(--mantine-color-default-border)' }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Text size="sm" fw={700}>
                  {session.label} · {main?.defaultMovementName ?? session.title}
                </Text>
                <Caption>{session.estimatedMinutes} min</Caption>
              </div>
              <Caption mt={1} lh={1.4}>
                {isFull ? (main?.targetSummary ?? session.keyPrescription) : session.movementSummary}
              </Caption>
            </div>
          )
        })}
      </div>

      {showAccessoryNote ? (
        <Caption component="p" mt="sm">Accessories are set in step 2.</Caption>
      ) : null}
    </Panel>
  )
}
