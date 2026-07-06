import { Button, TextInput, Tooltip } from '@mantine/core'
import { PencilLine, Plus } from 'lucide-react'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import type { GuidanceIssue } from '~/domains/program/lib/custom-builder-guidance'
import { loggerMovementOptions } from '~/domains/program/lib/custom-builder-ui'
import { MAX_LOGGER_EXERCISES_PER_DAY, type CustomProgramBuilderInput } from '~/domains/program/lib/custom-program-meta'
import { GuidanceList, issuesForScope } from './CustomBuilderGuidance'
import { BuilderExerciseRow, BuilderNumberField, BuilderSelect, DeleteRowAction } from './CustomBuilderFields'

export function CustomLoggerExercisesStep({
  draft,
  issues,
  onSessionChange,
  onExerciseChange,
  onAddExercise,
  onRemoveExercise,
}: {
  draft: CustomProgramBuilderInput
  issues: GuidanceIssue[]
  onSessionChange: (sessionIndex: number, patch: Partial<CustomProgramBuilderInput['sessions'][number]>) => void
  onExerciseChange: (
    sessionIndex: number,
    exerciseIndex: number,
    patch: Partial<CustomProgramBuilderInput['sessions'][number]['loggerExercises'][number]>,
  ) => void
  onAddExercise: (sessionIndex: number) => void
  onRemoveExercise: (sessionIndex: number, exerciseIndex: number) => void
}) {
  return (
    <div className="grid gap-3">
      <Panel surface="inset" p="sm">
        <div className="flex items-start gap-2.5">
          <PencilLine size={16} color="var(--mantine-color-dimmed)" className="mt-0.5 shrink-0" />
          <div>
            <SectionLabel>Logger-only exercises</SectionLabel>
            <Caption mt={4}>
              Add the exercises you want to repeat each day. Loads stay user-selected while logging and no progression rules are created.
            </Caption>
          </div>
        </div>
      </Panel>

      {draft.sessions.map((session, sessionIndex) => (
        <Panel key={sessionIndex} surface="inset" p="sm">
          <GuidanceList issues={issuesForScope(issues, sessionIndex)} className="mb-3" />
          <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <TextInput
              label={`Day ${sessionIndex + 1} title`}
              value={session.title}
              onChange={(event) => onSessionChange(sessionIndex, { title: event.target.value })}
            />
            <Tooltip
              label={`Up to ${MAX_LOGGER_EXERCISES_PER_DAY} exercises per day`}
              disabled={session.loggerExercises.length < MAX_LOGGER_EXERCISES_PER_DAY}
            >
              <span>
                <Button
                  variant="default"
                  disabled={session.loggerExercises.length >= MAX_LOGGER_EXERCISES_PER_DAY}
                  onClick={() => onAddExercise(sessionIndex)}
                >
                  <Plus size={14} />
                  Add exercise
                </Button>
              </span>
            </Tooltip>
          </div>

          <div className="grid gap-2">
            {session.loggerExercises.map((exercise, exerciseIndex) => (
              <BuilderExerciseRow
                key={exerciseIndex}
                select={
                  <BuilderSelect
                    label="Exercise"
                    value={exercise.movementId}
                    onChange={(value) => {
                      if (!value) return
                      onExerciseChange(sessionIndex, exerciseIndex, { movementId: value })
                    }}
                    options={loggerMovementOptions.map((movement) => ({ value: movement.id, label: movement.name }))}
                  />
                }
                numbers={
                  <>
                    <BuilderNumberField
                      label="Sets"
                      value={exercise.setCount}
                      min={1}
                      max={10}
                      onChange={(value) => onExerciseChange(sessionIndex, exerciseIndex, { setCount: value })}
                    />
                    <BuilderNumberField
                      label="Min"
                      value={exercise.repMin}
                      min={1}
                      max={50}
                      onChange={(value) => onExerciseChange(sessionIndex, exerciseIndex, { repMin: value })}
                    />
                    <BuilderNumberField
                      label="Max"
                      value={exercise.repMax}
                      min={1}
                      max={50}
                      onChange={(value) => onExerciseChange(sessionIndex, exerciseIndex, { repMax: value })}
                    />
                    <BuilderNumberField
                      label="RIR"
                      value={exercise.targetRir ?? 0}
                      min={0}
                      max={10}
                      onChange={(value) => onExerciseChange(sessionIndex, exerciseIndex, { targetRir: value })}
                    />
                  </>
                }
                numberColumns="four"
                action={
                  <DeleteRowAction
                    label="Remove exercise"
                    disabled={session.loggerExercises.length <= 1}
                    onClick={() => onRemoveExercise(sessionIndex, exerciseIndex)}
                  />
                }
              />
            ))}
            {!session.loggerExercises.length ? (
              <Panel surface="panel" p="sm">
                <Text size="sm" tone="dimmed">No exercises yet — add the first one.</Text>
              </Panel>
            ) : null}
          </div>
        </Panel>
      ))}
    </div>
  )
}
