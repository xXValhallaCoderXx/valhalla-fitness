import { Badge, Button, Card } from '@mantine/core'
import { Check, Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import type { ProgramTemplateSummary } from '~/shared/types'

export function TemplateCard({
  template,
  isActive = false,
  onStart,
}: {
  template: ProgramTemplateSummary
  isActive?: boolean
  onStart: () => void
}) {
  return (
    <Card
      className="group flex h-full min-h-[13rem] flex-col gap-4 vf-card-hover"
      p="md"
      style={{
        borderColor: isActive ? 'var(--vf-success-border)' : undefined,
        backgroundColor: isActive ? 'var(--vf-success-soft)' : undefined,
      }}
    >
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge color={template.origin === 'licensed_partner' ? 'warning' : 'action'}>{template.sourceLabel}</Badge>
            <Caption fw={600}>{template.daysPerWeek} days/wk</Caption>
          </div>
          {isActive ? <Badge color="success">Active</Badge> : null}
        </div>

        <div>
          <Heading order={2} size="h3" lh={1.15}>
            {template.name}
          </Heading>
          <Text mt="xs" size="sm" tone="dimmed">
            {template.description}
          </Text>
        </div>

        <Panel surface="inset" p="xs">
          <div className="grid grid-cols-3 gap-2">
            <TemplateMetric label="Schedule" value={`${template.daysPerWeek}/wk`} />
            <TemplateMetric label="Level" value={template.complexity} />
            <TemplateMetric label="Progression" value={template.progressionLabel} />
          </div>
        </Panel>

        <div className="mt-auto flex flex-wrap gap-1.5">
          {template.tags.slice(0, 3).map((tag) => (
            <Panel key={tag} surface="inset" px={6} py={2}>
              <Caption size="0.625rem" fw={700}>
                {tag}
              </Caption>
            </Panel>
          ))}
        </div>
      </div>

      {isActive ? (
        <Button color="success" variant="light" disabled>
          <Check size={16} />
          Active Program
        </Button>
      ) : template.available ? (
        <Button className="w-full" onClick={onStart}>
          <Check size={16} />
          Start Program
        </Button>
      ) : (
        <Button variant="default" disabled>
          <Lock size={16} />
          Not yet
        </Button>
      )}
    </Card>
  )
}

function TemplateMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0">
      <SectionLabel component="p" size="0.5625rem" truncate>
        {label}
      </SectionLabel>
      <Text mt={2} size="xs" fw={900} truncate>
        {value}
      </Text>
    </div>
  )
}

export function TemplateGrid({ children }: { children: ReactNode }) {
  return (
    <div
      className="grid items-stretch gap-4 md:gap-5"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))' }}
    >
      {children}
    </div>
  )
}
