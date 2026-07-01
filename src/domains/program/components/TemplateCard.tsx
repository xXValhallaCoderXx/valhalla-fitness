import { Badge, Button, Card } from '@mantine/core'
import { Check, Eye, Layers, Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import type { ProgramTemplateSummary } from '~/shared/types'
import { scheduleRangeLabel, type ProgramTemplateFamily } from '~/domains/program/lib/template-families'

/**
 * A card renders either a single template or a programme *family* (collapsed variants). In family
 * mode the header/schedule show the family's day-count range and a "Choose your schedule" hint; the
 * CTA opens the family's default variant, where the schedule can still be switched.
 */
export function TemplateCard({
  template,
  family,
  members,
  isActive = false,
  onStart,
}: {
  template: ProgramTemplateSummary
  family?: ProgramTemplateFamily
  members?: ProgramTemplateSummary[]
  isActive?: boolean
  onStart: () => void
}) {
  const familyMembers = members ?? []
  const isFamily = Boolean(family) && familyMembers.length > 1
  const title = isFamily ? family!.name : template.name
  const description = isFamily ? family!.tagline ?? family!.description : template.description
  const complexity = isFamily ? family!.complexity : template.complexity
  const scheduleLabel = isFamily ? scheduleRangeLabel(familyMembers) : `${template.daysPerWeek}/wk`
  const scheduleCaption = isFamily ? scheduleRangeLabel(familyMembers) : `${template.daysPerWeek} days/wk`
  const tags = isFamily
    ? [...new Set(familyMembers.flatMap((member) => member.tags))]
    : template.tags
  return (
    <Card
      className="group flex h-full min-h-[12rem] flex-col gap-3 overflow-hidden vf-card-hover"
      p="sm"
      radius="md"
      style={{
        borderColor: isActive ? 'var(--vf-action-border)' : undefined,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          height: 3,
          margin: '-0.625rem -0.625rem 0',
          backgroundColor: complexityColor(complexity),
        }}
      />

      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge color={template.origin === 'user_created' ? 'accent' : 'neutral'}>{template.sourceLabel}</Badge>
            <Caption fw={600}>{scheduleCaption}</Caption>
          </div>
          {isActive ? <Badge color="action" variant="filled">Active</Badge> : null}
        </div>

        <div>
          <Heading order={2} size="h3" lh={1.15}>
            {title}
          </Heading>
          <Text mt="xs" size="sm" tone="dimmed" lineClamp={2}>
            {description}
          </Text>
        </div>

        <Panel surface="inset" p="xs">
          <div className="grid grid-cols-3 gap-2">
            <TemplateMetric label="Schedule" value={scheduleLabel} />
            <TemplateMetric label="Level" value={complexity} valueColor={complexityColor(complexity)} />
            <TemplateMetric label="Progression" value={isFamily ? `${familyMembers.length} variants` : template.progressionLabel} />
          </div>
        </Panel>

        {isFamily ? (
          <div className="flex items-center gap-1.5">
            <Layers size={13} color="var(--vf-action-text)" />
            <Caption fw={700} tone="action">
              Choose your schedule · {familyMembers.length} options
            </Caption>
          </div>
        ) : null}

        <div className="mt-auto hidden flex-wrap gap-1 sm:flex">
          {tags.slice(0, 3).map((tag) => (
            <Panel key={tag} surface="inset" px={6} py={1}>
              <Caption size="0.625rem" fw={700}>
                {tag}
              </Caption>
            </Panel>
          ))}
        </div>
      </div>

      {isActive ? (
        <Button color="action" variant="light" disabled>
          <Check size={16} />
          Active Program
        </Button>
      ) : template.available ? (
        <Button className="w-full" onClick={onStart}>
          <Eye size={16} />
          View programme
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

/** Accent token per experience level, shared with the catalogue + marketing showcase feel. */
export function complexityColor(complexity: string) {
  if (complexity === 'Beginner') return 'var(--vf-success-text)'
  if (complexity === 'Advanced') return 'var(--vf-warning-text)'
  if (complexity === 'Intermediate') return 'var(--vf-action-text)'
  return 'var(--mantine-color-dimmed)'
}

function TemplateMetric({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string | number
  valueColor?: string
}) {
  return (
    <div className="min-w-0">
      <SectionLabel component="p" size="0.5625rem" truncate>
        {label}
      </SectionLabel>
      <Text mt={2} size="xs" fw={900} truncate c={valueColor}>
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
