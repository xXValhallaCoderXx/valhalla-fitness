import { Button } from '@mantine/core'
import { decisionLabel, decisionSubject } from '~/domains/program/lib/decision-labels'
import { decisionUpdate } from '~/domains/session/lib/summary-decisions'
import { useExperienceMode } from '~/domains/account/components'
import type { ProgressionDecision } from '~/domains/program'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import type { Unit } from '~/shared/types'

/**
 * What is waiting on a decision because of these sessions.
 *
 * In the main column and in both modes, unlike the totals: "no silent changes" is the point of this
 * screen, and Guided has no rail to put it in.
 */
export function PendingDecisionsPanel({
  pendingDecisions,
  units,
  onReviewDecisions,
}: {
  pendingDecisions: ProgressionDecision[]
  units: Unit | null
  onReviewDecisions: () => void
}) {
  const { mode, isFull } = useExperienceMode()

  return (
    <Panel p="md">
      <SectionLabel>{decisionLabel('pendingHeading', mode)}</SectionLabel>
      {pendingDecisions.length ? (
        <>
          <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
            {pendingDecisions.slice(0, 4).map((decision) => {
              const update = decisionUpdate(decision, units ?? 'kg')
              return (
                <div
                  key={decision.id}
                  className="border-t py-2 first:border-t-0 sm:first:pt-2"
                  style={{ borderColor: 'var(--mantine-color-default-border)' }}
                >
                  <Text size="xs" fw={700} className={isFull ? 'font-mono' : undefined} truncate>
                    {decisionSubject(decision, mode)}
                    {update.isNumeric ? ` ${update.fromLabel} → ${update.toLabel}` : ''}
                  </Text>
                  <Caption mt={1} truncate className={isFull ? 'font-mono' : undefined}>
                    {isFull ? decision.ruleId : update.recommendation}
                  </Caption>
                </div>
              )
            })}
          </div>
          <Button mt="sm" size="xs" variant="default" onClick={onReviewDecisions}>
            Review {pendingDecisions.length} decision{pendingDecisions.length === 1 ? '' : 's'}
          </Button>
        </>
      ) : (
        <Caption component="p" mt="sm">{decisionLabel('emptyPending', mode)}</Caption>
      )}
    </Panel>
  )
}
