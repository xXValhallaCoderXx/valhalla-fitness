import type { HistorySubstitutionSummary } from '~/domains/history'
import { formatCompactDate } from '~/shared/lib/dates'
import { Caption, Panel, SectionLabel, Text } from '~/components'

/**
 * Lifts that were swapped out, and why.
 *
 * Lives beside the movement table because that is the only other place the app talks about which
 * exercise actually got done — it used to sit on Overview, which the v3 design reserves for the
 * five headline signals.
 */
export function MovementSubstitutions({ substitutions }: { substitutions: HistorySubstitutionSummary[] }) {
  if (!substitutions.length) return null
  return (
    <Panel p="md">
      <SectionLabel>Substitutions</SectionLabel>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {substitutions.slice(0, 6).map((substitution) => (
          <Panel key={substitution.id} surface="inset" p="sm">
            <Text size="xs" fw={900}>
              {substitution.plannedMovementName}{' '}
              <Text component="span" size="xs" tone="dimmed">to</Text>{' '}
              {substitution.performedMovementName}
            </Text>
            <Caption mt={4} fw={700}>
              {substitution.reason.replaceAll('_', ' ')} · {formatCompactDate(substitution.performedAt)}
            </Caption>
          </Panel>
        ))}
      </div>
    </Panel>
  )
}
