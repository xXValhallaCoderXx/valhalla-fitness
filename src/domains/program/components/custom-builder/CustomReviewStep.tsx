import { Badge } from '@mantine/core'
import { PencilLine } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import { getMovementName } from '~/domains/movement/lib/movements'
import { ProgramInfoHint } from '~/domains/program/components/ProgramInfoHint'
import type { GuidanceIssue } from '~/domains/program/lib/custom-builder-guidance'
import { buildProgressionPreviews, type ProgressionPreview } from '~/domains/program/lib/custom-builder-preview'
import { customBuilderDayTitle } from '~/domains/program/lib/custom-builder-ui'
import { customProgramMethodologies, type CustomProgramBuilderInput } from '~/domains/program/lib/custom-templates'
import type { UserProfile } from '~/shared/types'
import { GUIDANCE_SEVERITY_ORDER, GuidanceList } from './CustomBuilderGuidance'

export function CustomReviewStep({
  draft,
  issues,
  profile,
}: {
  draft: CustomProgramBuilderInput
  issues: GuidanceIssue[]
  profile: UserProfile | null
}) {
  const methodology = customProgramMethodologies[draft.methodology]
  const previews = useMemo(() => buildProgressionPreviews(draft, profile), [draft, profile])
  const orderedIssues = [...issues].sort(
    (left, right) => GUIDANCE_SEVERITY_ORDER[left.severity] - GUIDANCE_SEVERITY_ORDER[right.severity],
  )
  const accessoryCount = draft.sessions.reduce((total, session) => total + session.accessories.length, 0)
  const loggerExerciseCount = draft.sessions.reduce((total, session) => total + session.loggerExercises.length, 0)
  return (
    <div className="grid gap-4">
      <GuidanceList issues={orderedIssues} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ReviewMetric label="Method" value={methodology.shortLabel} />
        <ReviewMetric label="Schedule" value={`${draft.daysPerWeek} days/wk`} />
        <ReviewMetric label="Sessions" value={draft.sessions.length} />
        <ReviewMetric label={draft.methodology === 'none' ? 'Exercises' : 'Accessories'} value={draft.methodology === 'none' ? loggerExerciseCount : accessoryCount} />
      </div>
      {previews.length ? (
        <div className="grid gap-2">
          <span className="inline-flex items-center gap-1">
            <SectionLabel>Progression preview</SectionLabel>
            <ProgramInfoHint label="About this preview">
              Example loads per main lift so you can picture the plan. They assume average progress — your real numbers depend on what you log.
            </ProgramInfoHint>
          </span>
          <div className="grid gap-3">
            {previews.map((preview) => (
              <ProgressionPreviewPanel key={preview.movementId} preview={preview} />
            ))}
          </div>
        </div>
      ) : draft.methodology === 'none' ? (
        <div className="flex items-start gap-2.5 rounded-xl border p-3" style={{ borderColor: 'var(--mantine-color-default-border)', backgroundColor: 'var(--vf-surface-2)' }}>
          <PencilLine size={16} color="var(--mantine-color-dimmed)" className="mt-0.5 shrink-0" />
          <Text size="sm" tone="dimmed">
            <Text component="span" fw={800} tone="default">No auto-regulation.</Text> This is a pure logger — every set uses a load you pick while training.
          </Text>
        </div>
      ) : null}
      <Panel surface="inset" p="sm">
        <Text size="sm" fw={800}>{draft.name}</Text>
        {draft.goal ? <Caption mt={4}>{draft.goal}</Caption> : null}
        <Panel surface="panel" mt="sm" px="sm" py="xs">
          <Caption fw={600}>{methodology.regulationSummary}</Caption>
        </Panel>
        <div className="mt-3 grid gap-2">
          {draft.sessions.map((session, index) => (
            <Panel key={index} surface="panel" px="sm" py="xs">
              {draft.methodology === 'none' ? (
                <>
                  <Text fw={700}>{session.title || `Day ${index + 1}`}</Text>
                  <Caption mt={4}>
                    {session.loggerExercises.map((exercise) => getMovementName(exercise.movementId)).join(', ')}
                  </Caption>
                </>
              ) : (
                <>
                  <Text component="span" fw={700}>{customBuilderDayTitle(index, session.mainMovementId)}</Text>
                  <Caption component="span"> - {getMovementName(session.mainMovementId)}</Caption>
                  {session.variationMovementId ? (
                    <Caption component="span"> - {getMovementName(session.variationMovementId)}</Caption>
                  ) : null}
                  <Caption mt={4}>
                    {session.accessories.length} accessory {session.accessories.length === 1 ? 'slot' : 'slots'}
                  </Caption>
                </>
              )}
            </Panel>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function ReviewMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Panel surface="inset" p="sm">
      <SectionLabel>{label}</SectionLabel>
      <Text mt={4} size="sm" fw={800}>{value}</Text>
    </Panel>
  )
}

function ProgressionPreviewPanel({ preview }: { preview: ProgressionPreview }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--vf-success-border)', backgroundColor: 'var(--vf-success-soft)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Text fw={800} tone="success">{preview.movementName}</Text>
        <Badge color={preview.isEstimated ? 'neutral' : 'success'}>
          {preview.isEstimated ? 'Example numbers' : 'From your 1RM'}
        </Badge>
      </div>
      <Caption mt={4} tone="success">
        {preview.anchorLabel} {preview.anchorValue} {preview.units}
        {preview.isEstimated ? ' (example — set yours when you start)' : ''}
      </Caption>
      <div className="mt-3 grid gap-1">
        {preview.rows.map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-[minmax(6rem,auto)_1fr_auto] items-center gap-2 border-t py-1.5 first:border-t-0 first:pt-0"
            style={{ borderColor: 'var(--vf-success-border)' }}
          >
            <Caption fw={800} tone="success">{row.label}</Caption>
            <Caption tone="success" style={{ opacity: 0.85 }}>{row.scheme}</Caption>
            <Text size="sm" fw={800} tone="success">{row.load} {preview.units}</Text>
          </div>
        ))}
      </div>
      <Caption mt={3} tone="success" style={{ opacity: 0.85 }}>{preview.note}</Caption>
    </div>
  )
}
