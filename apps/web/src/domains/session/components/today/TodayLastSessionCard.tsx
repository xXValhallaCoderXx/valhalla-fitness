import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Caption, Panel, StatValue, Text } from '~/components'
import { useExperienceMode } from '~/domains/account/components'
import { buildLastSessionCard } from '@sheetless/domain/session/last-session'
import type { ProgressionDecision } from '~/domains/program'
import type { WorkoutSession } from '~/domains/session'

/**
 * "Last session" — the receipt for the workout before this one.
 *
 * Every number comes off the session snapshot the Today payload already carries, so the card costs
 * no extra read. Hidden on phone: 02c and 02d have no such card.
 */
export function TodayLastSessionCard({
  session,
  pendingDecisions,
}: {
  session: WorkoutSession
  pendingDecisions: ProgressionDecision[]
}) {
  const { mode } = useExperienceMode()
  const card = buildLastSessionCard(session, mode, pendingDecisions)

  return (
    <Panel p="md" data-testid="today-last-session" className="hidden flex-col md:flex">
      <div className="flex items-baseline justify-between gap-3">
        <Text size="md" fw={700}>
          Last session
        </Text>
        <Caption truncate>
          {card.title} · {card.meta}
        </Caption>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {card.tiles.map((tile) => (
          <Panel
            key={tile.label}
            surface="inset"
            p="sm"
            className="min-w-0"
            style={
              tile.highlight
                ? { backgroundColor: 'var(--vf-success-soft)', borderColor: 'var(--vf-success-border)' }
                : undefined
            }
          >
            <StatValue size="md" tone={tile.highlight ? 'success' : undefined} truncate>
              {tile.value}
            </StatValue>
            <Caption mt={2} fw={600} tone={tile.highlight ? 'success' : 'dimmed'} truncate>
              {tile.label}
            </Caption>
          </Panel>
        ))}
      </div>

      {card.lines.length ? (
        <div className="mt-3 flex flex-col gap-1">
          {card.lines.map((line) => (
            <Text key={line} size="sm" lh={1.45} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {line}
            </Text>
          ))}
        </div>
      ) : null}

      <Link
        to="/sessions/$sessionId/summary"
        params={{ sessionId: card.sessionId }}
        className="mt-auto inline-flex items-center gap-1 pt-3"
      >
        <Text component="span" size="sm" fw={700} tone="action">
          {card.linkLabel}
        </Text>
        <ArrowRight size={14} color="var(--vf-action-text)" />
      </Link>
    </Panel>
  )
}
