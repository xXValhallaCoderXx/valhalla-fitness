import { CircleCheck, Plus } from 'lucide-react'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import type { GuidanceIssue } from '~/domains/program/lib/custom-builder-guidance'
import {
  customBuilderDayTitle,
  mainMovementOptions,
  mainWorkSentence,
  mainWorkSummary,
  variationMovementOptions,
} from '~/domains/program/lib/custom-builder-ui'
import {
  customProgramMethodologies,
  type CustomProgramBuilderInput,
  type CustomProgramMethodology,
} from '~/domains/program/lib/custom-program-meta'
import { useExperienceMode } from '~/domains/account/components'
import { GUIDANCE_SEVERITY_ORDER, GuidanceList } from './CustomBuilderGuidance'
import { BuilderDayCountTiles } from './BuilderDayCountTiles'
import { BuilderSelect } from './CustomBuilderFields'

function ProgrammingCheckBanner({ issues }: { issues: GuidanceIssue[] }) {
  // `issues` are already filtered to the programming-relevant checks (duplicate_main,
  // weekly_balance, session_count, schedule_fit) and may be day-scoped, so surface them all here.
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

/**
 * One card per training day: the lift, and what Sheetless will do with it.
 *
 * Guided reads the rule as a sentence and Full as the notation the grid will carry — the same fact
 * in the register each mode expects, rather than showing everyone "3x5 @ current working load".
 */
function BuilderDayCard({
  index,
  session,
  methodology,
  supportsVariation,
  onSessionChange,
}: {
  index: number
  session: CustomProgramBuilderInput['sessions'][number]
  methodology: CustomProgramMethodology
  supportsVariation: boolean
  onSessionChange: (sessionIndex: number, patch: Partial<CustomProgramBuilderInput['sessions'][number]>) => void
}) {
  const { isFull } = useExperienceMode()
  const variationId = session.variationMovementId ?? null

  return (
    <Panel surface="inset" p="sm">
      <SectionLabel>Day {index + 1}</SectionLabel>

      <div className="mt-2 grid gap-3 md:grid-cols-2 md:items-center">
        <BuilderSelect
          label="Main lift"
          value={session.mainMovementId}
          onChange={(value) => {
            if (!value) return
            onSessionChange(index, { mainMovementId: value, title: customBuilderDayTitle(index, value) })
          }}
          options={mainMovementOptions.map((movement) => ({ value: movement.id, label: movement.name }))}
        />
        <div className="min-w-0">
          <Text size="sm" fw={700} lh={1.4}>
            {isFull ? mainWorkSummary(methodology, session) : mainWorkSentence(methodology, session)}
          </Text>
          {/* The rule's name is a machine label — it belongs beside the grid, not in Guided. */}
          {isFull ? (
            <Caption component="p" mt={2}>{customProgramMethodologies[methodology].progressionLabel}</Caption>
          ) : null}
        </div>
      </div>

      {supportsVariation ? (
        variationId ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2 md:items-center">
            <BuilderSelect
              label="Second lift"
              value={variationId}
              onChange={(value) => onSessionChange(index, { variationMovementId: value || null })}
              options={variationMovementOptions.map((movement) => ({ value: movement.id, label: movement.name }))}
              clearable
              placeholder="None"
            />
            <Caption component="p">Lighter work after the main lift. Clear it to drop the day back to one lift.</Caption>
          </div>
        ) : (
          // The comp's dashed "add" row. It seeds the first option rather than opening an empty
          // select, so one click produces a valid draft.
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-2 py-2.5"
            style={{
              border: '1px dashed var(--mantine-color-default-border)',
              borderRadius: 'var(--mantine-radius-md)',
              background: 'transparent',
              cursor: 'pointer',
              appearance: 'none',
            }}
            onClick={() =>
              onSessionChange(index, { variationMovementId: variationMovementOptions[0]?.id ?? null })
            }
          >
            <Plus size={14} color="var(--mantine-color-dimmed)" />
            <Caption fw={700}>Add a second lift · optional</Caption>
          </button>
        )
      ) : null}
    </Panel>
  )
}

export function CustomMovementsStep({
  draft,
  issues,
  onSessionChange,
  onDaysChange,
}: {
  draft: CustomProgramBuilderInput
  issues: GuidanceIssue[]
  onSessionChange: (sessionIndex: number, patch: Partial<CustomProgramBuilderInput['sessions'][number]>) => void
  onDaysChange: (daysPerWeek: number) => void
}) {
  const supportsVariation = draft.methodology === 'plus_set_wave'
  return (
    <div className="grid gap-3">
      <Panel surface="inset" p="sm">
        <BuilderDayCountTiles
          methodology={draft.methodology}
          daysPerWeek={draft.daysPerWeek}
          onChange={onDaysChange}
        />
        <Caption component="p" mt="sm">
          {customProgramMethodologies[draft.methodology].regulationSummary}
        </Caption>
      </Panel>
      <ProgrammingCheckBanner issues={issues} />
      {draft.sessions.map((session, index) => (
        <BuilderDayCard
          key={index}
          index={index}
          session={session}
          methodology={draft.methodology}
          supportsVariation={supportsVariation}
          onSessionChange={onSessionChange}
        />
      ))}
    </div>
  )
}
