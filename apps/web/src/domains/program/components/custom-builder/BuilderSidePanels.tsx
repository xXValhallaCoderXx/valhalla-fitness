import { Caption, Panel, SectionLabel, Text } from '~/components'
import { useExperienceMode } from '~/domains/account/components'
import { builderLabel, estimatedDayLengthLine, progressionPlainRules } from '~/domains/program/lib/builder-labels'
import { customBuilderDayTitle, weekDaySummary } from '~/domains/program/lib/custom-builder-ui'
import { getMovementName } from '~/domains/movement/lib/movements'
import type { CustomProgramBuilderInput } from '~/domains/program/lib/custom-program-meta'
import { useDraftDefinition } from './useDraftDefinition'

/**
 * What the answers add up to, alongside the questions.
 *
 * "Your week" reads the draft directly; the rules come from the progression constants that will
 * actually run, so the sentences cannot drift from the arithmetic they describe.
 */
export function BuilderSidePanels({ draft }: { draft: CustomProgramBuilderInput }) {
  const { mode } = useExperienceMode()
  const { definition } = useDraftDefinition(draft)
  const dayLength = estimatedDayLengthLine(definition?.sessions.map((session) => session.estimatedMinutes) ?? [])

  return (
    <aside className="flex flex-col gap-4">
      <Panel p="md">
        <SectionLabel>{builderLabel('yourWeek', mode)}</SectionLabel>
        <div className="mt-2 flex flex-col">
          {draft.sessions.map((session, index) => (
            // Name on the left, what it asks for on the right — the comp's ledger reading, and the
            // one that lets you scan a week's volume down a single column.
            <div
              key={`${session.mainMovementId}-${index}`}
              className="border-t py-2.5 first:border-t-0 first:pt-0"
              style={{ borderColor: 'var(--mantine-color-default-border)' }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <Text size="sm" fw={700} className="min-w-0" truncate>
                  {session.mainMovementId
                    ? customBuilderDayTitle(index, session.mainMovementId).replace(' day', '')
                    : `Day ${index + 1}`}
                </Text>
                <Caption className="shrink-0">{weekDaySummary(draft.methodology, session)}</Caption>
              </div>
              {/* On its own line: sharing the row squeezed the day name down to an ellipsis. */}
              {session.variationMovementId ? (
                <Caption component="p" mt={1}>then {getMovementName(session.variationMovementId)}</Caption>
              ) : null}
            </div>
          ))}
        </div>
        {dayLength ? <Caption component="p" mt="sm">{dayLength}</Caption> : null}
      </Panel>

      <Panel p="md">
        <SectionLabel>{builderLabel('whatHappens', mode)}</SectionLabel>
        <ul className="mt-2 flex list-disc flex-col gap-2 pl-4">
          {progressionPlainRules(draft.methodology).map((rule) => (
            <li key={rule}>
              <Text size="sm" tone="dimmed" lh={1.5}>{rule}</Text>
            </li>
          ))}
        </ul>
      </Panel>
    </aside>
  )
}
