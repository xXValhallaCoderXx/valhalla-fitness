import { Badge } from '@mantine/core'
import type { CycleInspectorModel } from '~/domains/program/lib/cycle-inspector'
import { Caption, Panel, SectionLabel, Text } from '~/components'

/**
 * What is governing this cycle: the rules in play and where each reference number is headed.
 *
 * Full mode only. Rule ids are printed verbatim rather than prettified — this is the technical
 * view, and the id is what appears on the decision the lifter will be asked to accept.
 */
export function CycleInspectorPanel({
  model,
  units,
}: {
  model: CycleInspectorModel
  units: string
}) {
  // Only pair a value with a forward number when there is one. Without a projection this section
  // would just restate the loads card sitting directly below it.
  const projected = model.projections.filter((projection) => projection.projected !== null)

  return (
    <Panel p="md" className="space-y-4" data-testid="cycle-inspector-panel">
      <div>
        <SectionLabel>Cycle</SectionLabel>
        <Text mt={2} size="sm" fw={800} lh={1.3}>
          {model.position}
        </Text>
        <Caption mt={1} lh={1.45}>
          {model.decisionNote}
        </Caption>
      </div>

      {model.rules.length ? (
        <div>
          <SectionLabel className="mb-2">Rules in play</SectionLabel>
          <div className="flex flex-col">
            {model.rules.map((rule) => (
              <div
                key={rule.ruleId}
                className="border-t py-2 first:border-t-0 first:pt-0"
                style={{ borderColor: 'var(--mantine-color-default-border)' }}
              >
                <Text component="span" size="xs" fw={700} className="font-mono">
                  {rule.ruleId}
                </Text>
                <div className="mt-1 flex items-center gap-2">
                  <Caption>{rule.roles}</Caption>
                  {rule.scope ? (
                    <Badge color="neutral" variant="light" size="xs">
                      {rule.scope}
                    </Badge>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {projected.length ? (
        <div>
          <SectionLabel className="mb-1">Reference numbers</SectionLabel>
          {/* Deliberately not "projected training maxes": the forward number is the heaviest
              planned top-set load ahead, which is a different quantity. */}
          <Caption lh={1.4}>Current value, and the heaviest planned top set ahead.</Caption>
          <div className="mt-2 flex flex-col">
            {projected.map((projection) => (
              <div
                key={projection.movementId}
                className="flex items-baseline justify-between gap-2 border-t py-2 first:border-t-0 first:pt-0"
                style={{ borderColor: 'var(--mantine-color-default-border)' }}
              >
                <Text component="span" size="xs" fw={700} tone="dimmed" truncate>
                  {projection.label}
                </Text>
                <div className="flex shrink-0 items-baseline gap-1.5" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  <Text component="span" size="sm" fw={800}>
                    {projection.current}
                  </Text>
                  {projection.projected !== null ? (
                    <>
                      <Text component="span" size="xs" tone="dimmed" aria-hidden="true">
                        →
                      </Text>
                      <Text component="span" size="sm" fw={800} c="var(--vf-action-text)">
                        {projection.projected}
                      </Text>
                    </>
                  ) : null}
                  <Caption component="span">{units}</Caption>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Panel>
  )
}
