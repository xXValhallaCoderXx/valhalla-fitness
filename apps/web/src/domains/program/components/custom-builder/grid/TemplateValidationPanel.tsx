import { Badge } from '@mantine/core'
import { Check, X } from 'lucide-react'
import { templateDefinitionChecks } from '~/domains/program/lib/template-grid'
import type { TemplateDefinition } from '~/domains/program'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import { stateKeyLabel } from '~/domains/program/lib/load-trace'

/**
 * The programme state the definition needs, and whether the definition holds together.
 *
 * The badge is `validateTemplateDefinition`'s verdict and nothing else; the three lines beneath it
 * explain which rule a failure broke, since a single zod message cannot.
 */
export function TemplateValidationPanel({
  definition,
  stateValues,
  units,
}: {
  definition: TemplateDefinition
  stateValues: Record<string, number>
  units: string
}) {
  const { valid, message, checks } = templateDefinitionChecks(definition)

  return (
    <Panel p="md" className="space-y-4" data-testid="template-validation">
      <div>
        <SectionLabel className="mb-2">Required state</SectionLabel>
        {definition.requiredState.length ? (
          <div className="flex flex-col">
            {definition.requiredState.map((state) => (
              <div
                key={state.key}
                className="flex items-baseline justify-between gap-3 border-t py-1.5 first:border-t-0 first:pt-0"
                style={{ borderColor: 'var(--mantine-color-default-border)' }}
              >
                <Text component="span" size="xs" fw={700} className="font-mono" tone="dimmed">
                  {stateKeyLabel(state.key, state.type)}
                </Text>
                <Text component="span" size="xs" fw={800} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {stateValues[state.key] === undefined ? '—' : `${stateValues[state.key]} ${units}`}
                </Text>
              </div>
            ))}
            <Caption mt="xs">Resolved from your current numbers.</Caption>
          </div>
        ) : (
          <Caption component="p">This programme prescribes no loads, so it needs no state.</Caption>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <SectionLabel>Validation</SectionLabel>
          <Badge color={valid ? 'success' : 'danger'} variant="light" size="xs">
            {valid ? 'Valid' : 'Invalid'}
          </Badge>
        </div>
        <div className="flex flex-col gap-1.5">
          {checks.map((check) => (
            <div key={check.label} className="flex items-start gap-2">
              {check.ok ? (
                <Check size={13} color="var(--vf-success-text)" className="mt-0.5 shrink-0" />
              ) : (
                <X size={13} color="var(--vf-danger-text)" className="mt-0.5 shrink-0" />
              )}
              <div className="min-w-0">
                <Caption>{check.label}</Caption>
                {!check.ok ? <Caption tone="dimmed">{check.detail}</Caption> : null}
              </div>
            </div>
          ))}
        </div>
        {message ? <Caption component="p" mt="sm" lh={1.5}>{message}</Caption> : null}
      </div>
    </Panel>
  )
}
