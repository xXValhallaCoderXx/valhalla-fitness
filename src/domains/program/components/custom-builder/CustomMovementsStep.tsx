import { CircleCheck } from 'lucide-react'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import type { GuidanceIssue } from '~/domains/program/lib/custom-builder-guidance'
import {
  customBuilderDayTitle,
  mainMovementOptions,
  mainWorkSummary,
  variationMovementOptions,
} from '~/domains/program/lib/custom-builder-ui'
import { customProgramMethodologies, type CustomProgramBuilderInput } from '~/domains/program/lib/custom-templates'
import { GUIDANCE_SEVERITY_ORDER, GuidanceList } from './CustomBuilderGuidance'
import { BuilderSelect } from './CustomBuilderFields'

function ProgrammingCheckBanner({ issues }: { issues: GuidanceIssue[] }) {
  // `issues` are already filtered to the programming-relevant checks (duplicate_main,
  // weekly_balance, session_count) and may be day-scoped, so surface them all here.
  const ordered = [...issues].sort(
    (left, right) => GUIDANCE_SEVERITY_ORDER[left.severity] - GUIDANCE_SEVERITY_ORDER[right.severity],
  )
  return (
    <div className="grid gap-2">
      <SectionLabel>Programming check</SectionLabel>
      {ordered.length ? (
        <GuidanceList issues={ordered} />
      ) : (
        <div
          className="flex items-center gap-2.5 rounded-xl border p-3"
          style={{ borderColor: 'var(--vf-success-border)', backgroundColor: 'var(--vf-success-soft)', color: 'var(--vf-success-text)' }}
        >
          <CircleCheck size={16} className="shrink-0" />
          <Text size="sm" fw={600} c="inherit">
            Looks balanced — one main lift per day.
          </Text>
        </div>
      )}
    </div>
  )
}

export function CustomMovementsStep({
  draft,
  issues,
  onSessionChange,
}: {
  draft: CustomProgramBuilderInput
  issues: GuidanceIssue[]
  onSessionChange: (sessionIndex: number, patch: Partial<CustomProgramBuilderInput['sessions'][number]>) => void
}) {
  const supportsVariation = draft.methodology === 'plus_set_wave'
  return (
    <div className="grid gap-3">
      <Panel surface="inset" p="sm">
        <SectionLabel>Regulated structure</SectionLabel>
        <Caption mt={4}>{customProgramMethodologies[draft.methodology].regulationSummary}</Caption>
      </Panel>
      <ProgrammingCheckBanner issues={issues} />
      {draft.sessions.map((session, index) => (
        <Panel key={index} surface="inset" p="sm">
          <Text mb="sm" size="sm" fw={800}>{customBuilderDayTitle(index, session.mainMovementId)}</Text>
          <div className="grid gap-3 md:grid-cols-2 md:items-start">
            <div className="grid gap-3">
              <BuilderSelect
                label="Main lift"
                value={session.mainMovementId}
                onChange={(value) => {
                  if (!value) return
                  onSessionChange(index, {
                    mainMovementId: value,
                    title: customBuilderDayTitle(index, value),
                  })
                }}
                options={mainMovementOptions.map((movement) => ({ value: movement.id, label: movement.name }))}
              />
              {supportsVariation ? (
                <BuilderSelect
                  label="Variation"
                  value={session.variationMovementId ?? null}
                  onChange={(value) => onSessionChange(index, { variationMovementId: value || null })}
                  options={variationMovementOptions.map((movement) => ({ value: movement.id, label: movement.name }))}
                  clearable
                  placeholder="None"
                />
              ) : null}
            </div>
            <Panel surface="panel" className="min-w-0" p="sm">
              <SectionLabel>Main prescription</SectionLabel>
              <Text mt={4} size="sm" fw={800}>{mainWorkSummary(draft.methodology, session)}</Text>
              <Caption mt={4}>{customProgramMethodologies[draft.methodology].progressionLabel}</Caption>
            </Panel>
          </div>
        </Panel>
      ))}
    </div>
  )
}
