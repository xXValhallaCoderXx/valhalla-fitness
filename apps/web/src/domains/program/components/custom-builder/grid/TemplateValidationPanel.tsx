import { Badge } from '@mantine/core'
import { Check, X } from 'lucide-react'
import { templateDefinitionChecks } from '~/domains/program/lib/template-grid'
import type { TemplateDefinition } from '~/domains/program'
import { Caption, Panel, SectionLabel } from '~/components'

/**
 * Whether the definition holds together.
 *
 * The badge is `validateTemplateDefinition`'s verdict and nothing else; the three lines beneath it
 * explain which rule a failure broke, since a single zod message cannot. The state the definition
 * needs lives in `TemplateRequiredStateRow`, under the grid those values feed.
 */
export function TemplateValidationPanel({ definition }: { definition: TemplateDefinition }) {
  const { valid, message, checks } = templateDefinitionChecks(definition)

  return (
    <Panel p="md" data-testid="template-validation">
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
