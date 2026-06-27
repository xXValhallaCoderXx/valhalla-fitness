import { Button } from '@mantine/core'
import { Check, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Caption, SectionLabel, Text } from '~/components'
import { useSetLogMutation } from '~/domains/session/lib/useSetLogMutation'
import type { MovementSlot, SetLog, WorkoutSession } from '~/shared/types'
import { FocusRirRow } from './FocusRirRow'
import { FocusStepper } from './FocusStepper'
import { formatSetTarget, roundToStep } from './live-session-utils'

/**
 * The current-set logging card: target chip, weight + reps steppers, RIR row, and the
 * primary "Log set" CTA. Remount it (via a key on setIndex) so the draft re-seeds per set.
 */
export function FocusSetCard({
  session,
  movement,
  set,
  setNumber,
  setTotal,
  suggestedRir,
  onLogged,
  onRirSelected,
}: {
  session: WorkoutSession
  movement: MovementSlot
  set: SetLog
  setNumber: number
  setTotal: number
  suggestedRir?: number
  onLogged: (nextSession: WorkoutSession, setIndex: number) => void
  onRirSelected: (setIndex: number, value: number) => void
}) {
  const [draft, setDraft] = useState({
    actualLoad: set.actualLoad ?? set.targetLoad ?? 0,
    actualReps: set.actualReps ?? set.targetReps ?? set.targetRepMin ?? 0,
    actualRir: set.actualRir ?? undefined,
  })
  const mutation = useSetLogMutation(session, movement, set.setIndex)
  const isSaving = mutation.isPending || set.syncState === 'saving'
  const saveFailed = set.syncState === 'syncFailed'
  const effectiveActualRir =
    draft.actualRir ?? (!set.completed && typeof set.actualRir !== 'number' ? suggestedRir : undefined)

  const adjustLoad = (delta: number) =>
    setDraft((current) => ({ ...current, actualLoad: roundToStep(Number(current.actualLoad) + delta, session.rounding) }))
  const adjustReps = (delta: number) =>
    setDraft((current) => ({ ...current, actualReps: Math.max(0, Number(current.actualReps) + delta) }))

  const logSet = () => {
    if (isSaving) return
    const completed = saveFailed ? set.completed : true
    mutation.mutate(
      {
        movementSlotId: movement.id,
        setIndex: set.setIndex,
        actualLoad: Number(draft.actualLoad),
        actualReps: Number(draft.actualReps),
        actualRir: effectiveActualRir,
        completed,
        clientMutationId: crypto.randomUUID(),
      },
      { onSuccess: (nextSession) => onLogged(nextSession, set.setIndex) },
    )
  }

  const ctaLabel = saveFailed ? 'Retry save' : set.completed ? 'Update set' : 'Log set'

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: 'var(--vf-action-border)',
        backgroundColor: 'var(--mantine-color-default)',
        boxShadow: 'var(--vf-shadow-card)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <SectionLabel>
          Current · Set {setNumber} of {setTotal}
        </SectionLabel>
        <Caption>Target {formatSetTarget(set, session.units)}</Caption>
      </div>

      <div className="mt-3 space-y-3">
        <FocusStepper
          label="Weight"
          unitSuffix={session.units}
          value={Number(draft.actualLoad)}
          step={session.rounding}
          onAdjust={adjustLoad}
          onType={(value) => setDraft((current) => ({ ...current, actualLoad: value }))}
          disabled={isSaving}
          dataTour="focus-weight"
        />
        <FocusStepper
          label="Reps"
          value={Number(draft.actualReps)}
          step={1}
          onAdjust={adjustReps}
          onType={(value) => setDraft((current) => ({ ...current, actualReps: Math.max(0, value) }))}
          disabled={isSaving}
          dataTour="focus-reps"
        />
        <FocusRirRow
          value={effectiveActualRir}
          disabled={isSaving}
          onChange={(value) => {
            setDraft((current) => ({ ...current, actualRir: value }))
            onRirSelected(set.setIndex, value)
          }}
        />

        {saveFailed ? (
          <Text component="p" size="xs" c="var(--vf-danger-text)">
            Last save failed — tap Retry to try again.
          </Text>
        ) : null}

        <Button
          fullWidth
          size="lg"
          radius="md"
          disabled={isSaving}
          onClick={logSet}
          data-testid="focus-log-set"
          data-tour="focus-log"
        >
          {saveFailed ? <RefreshCw size={18} /> : <Check size={18} />}
          {ctaLabel}
        </Button>
      </div>
    </div>
  )
}
