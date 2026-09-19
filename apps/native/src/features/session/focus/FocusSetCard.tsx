/**
 * Local input state is mirrored into session memory by the caller so navigating
 * away never discards an unfinished edit. Mutations stay with onLogSet.
 */
import { useState } from 'react'
import { View } from 'react-native'
import type { MovementSlot, SetLog, WorkoutSession } from '@sheetless/domain/session/types/session'
import {
  formatSetTarget,
  previousSetShort,
  roundToStep,
} from '@sheetless/domain/session/live-session-utils'
import { Button, Caption, SectionLabel, Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'
import { useExperienceMode } from '@/lib/experience-mode'
import { repsLeftLabel } from '@sheetless/domain/shared/set-notation'
import { buildLoadTrace } from '@sheetless/domain/program/load-trace'
import { isSetDraftDirty, seedSetDraft, type SetInputDraft } from './workout-drafts'
import { FocusRirRow } from './FocusRirRow'
import { FocusStepper } from './FocusStepper'

export type SetDraft = { actualLoad: number | null; actualReps: number; actualRir?: number; completed: boolean }

export function FocusSetCard({
  session,
  movement,
  set,
  setNumber,
  setTotal,
  suggestedRir,
  initialDraft,
  onDraftChange,
  onResetDraft,
  isSaving,
  disabled,
  saveFailed,
  onLogSet,
  onRirSelected,
}: {
  session: WorkoutSession
  movement: MovementSlot
  set: SetLog
  setNumber: number
  setTotal: number
  suggestedRir?: number
  initialDraft?: SetInputDraft
  onDraftChange?: (draft: SetInputDraft) => void
  onResetDraft?: () => void
  isSaving: boolean
  disabled?: boolean
  saveFailed: boolean
  onLogSet: (draft: SetDraft) => void
  onRirSelected: (setIndex: number, value: number) => void
}) {
  const { theme } = useTokens()
  const { isFull, showFormulas } = useExperienceMode()
  const swapped = Boolean(movement.performedMovementId && movement.performedMovementId !== movement.movementId)
  const trace = showFormulas && !swapped ? buildLoadTrace({ set, movement, session }) : null
  const [draft, setDraft] = useState<SetInputDraft>(initialDraft ?? seedSetDraft(movement, set))
  const changeDraft = (change: Partial<SetInputDraft>) => {
    const next = { ...draft, ...change }
    setDraft(next)
    onDraftChange?.(next)
  }
  const effectiveActualRir =
    draft.actualRir ?? (!set.completed && typeof set.actualRir !== 'number' ? suggestedRir : undefined)

  const adjustLoad = (delta: number) =>
    changeDraft({ actualLoad: Math.max(0, roundToStep(Number(draft.actualLoad) + delta, session.rounding)) })
  const adjustReps = (delta: number) =>
    changeDraft({ actualReps: Math.max(0, Number(draft.actualReps) + delta) })

  const hasDraftChanges = draft.actualLoad !== (set.actualLoad ?? null)
    || Number(draft.actualReps) !== (set.actualReps ?? null)
    || (effectiveActualRir ?? null) !== (set.actualRir ?? null)
  const ctaLabel = saveFailed
    ? hasDraftChanges ? 'Save changes' : 'Retry save'
    : set.completed ? 'Update set' : 'Log set'
  const previousLine = previousSetShort(movement.previous, set.setIndex)
  const controlsDisabled = isSaving || disabled
  const submit = (completed: boolean) => onLogSet({
    actualLoad: draft.actualLoad,
    actualReps: Number(draft.actualReps),
    actualRir: effectiveActualRir,
    completed,
  })

  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.tones.action.border,
        borderRadius: radii.lg,
        borderWidth: 1,
        padding: spacing.md,
      }}
    >
      <View
        style={{
          alignItems: 'flex-start',
          gap: spacing.xs,
          justifyContent: 'space-between',
        }}
      >
        <SectionLabel>
          {set.completed ? 'Review' : 'Current'} · Set {setNumber} of {setTotal}
        </SectionLabel>
        <Text size="sm" weight={700}>
          Target {formatSetTarget(set, session.units, true, movement).replace('BW', 'Bodyweight')}
          {!isFull ? ' reps' : ''}
          {set.targetRir != null ? ` · ${isFull ? `RIR ${set.targetRir}` : repsLeftLabel(set.targetRir)}` : ''}
        </Text>
        <Caption>
          {previousLine ? `Last time: ${previousLine.replace('previous ', '')}` : 'No comparable set logged yet'}
        </Caption>
        {trace?.matchesPlannedLoad ? <Caption tone="action">{trace.expression} → {trace.result}</Caption> : null}
        {trace && !trace.matchesPlannedLoad ? <Caption>Adjusted target · using your saved prescription.</Caption> : null}
      </View>

      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        <FocusStepper
          label="Weight"
          onClear={() => changeDraft({ actualLoad: null })}
          unitSuffix={session.units}
          value={draft.actualLoad}
          step={session.rounding}
          onAdjust={adjustLoad}
          onType={(value) => changeDraft({ actualLoad: Math.max(0, value) })}
          disabled={controlsDisabled}
        />
        <FocusStepper
          label="Reps"
          value={Number(draft.actualReps)}
          step={1}
          onAdjust={adjustReps}
          onType={(value) => changeDraft({ actualReps: Math.max(0, value) })}
          disabled={controlsDisabled}
        />
        <FocusRirRow
          targetRir={set.targetRir}
          value={effectiveActualRir}
          disabled={controlsDisabled}
          onChange={(value) => {
            changeDraft({ actualRir: value })
            onRirSelected(set.setIndex, value)
          }}
        />

        {draft.actualLoad === null ? <Caption>Enter a load, or 0 for bodyweight.</Caption> : null}
        {saveFailed ? (
          <Text size="xs" tone="danger">
            {hasDraftChanges
              ? 'Last save failed. Save changes to keep these updated values.'
              : 'Last save failed. Retry to save this set.'}
          </Text>
        ) : null}

        <Button
          label={ctaLabel}
          fullWidth
          loading={isSaving}
          disabled={controlsDisabled || (draft.actualLoad === null && (!saveFailed || set.completed))}
          onPress={() => submit(saveFailed ? set.completed : true)}
          testID="focus-log-set"
        />
        {isSetDraftDirty(movement, set, draft) ? <Button
          label="Reset changes" variant="subtle" disabled={controlsDisabled}
          onPress={() => { setDraft(seedSetDraft(movement, set)); onResetDraft?.() }}
        /> : null}
        {set.completed ? (
          <Button
            label="Mark incomplete"
            variant="default"
            fullWidth
            disabled={controlsDisabled}
            onPress={() => submit(false)}
          />
        ) : null}
      </View>
    </View>
  )
}
