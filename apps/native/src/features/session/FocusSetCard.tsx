/**
 * Native port of web FocusSetCard, made presentational: the draft lives here,
 * the mutation lives with the caller via onLogSet. Remount it (key on setIndex)
 * so the draft re-seeds per set — same contract as the web card.
 */
import { useState } from 'react'
import { View } from 'react-native'
import type { MovementSlot, SetLog, WorkoutSession } from '@sheetless/domain/session/types/session'
import {
  formatSetTarget,
  previousSetShort,
  roundToStep,
  seedLoadForSet,
  seedRepsForSet,
} from '@sheetless/domain/session/live-session-utils'
import { Button, Caption, SectionLabel, Text } from '@/components'
import { cardShadow, radii, spacing, useTokens } from '@/lib/tokens'
import { FocusRirRow } from '@/features/session/FocusRirRow'
import { FocusStepper } from '@/features/session/FocusStepper'

export type SetDraft = { actualLoad: number; actualReps: number; actualRir?: number }

export function FocusSetCard({
  session,
  movement,
  set,
  setNumber,
  setTotal,
  suggestedRir,
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
  isSaving: boolean
  disabled?: boolean
  saveFailed: boolean
  onLogSet: (draft: SetDraft) => void
  onRirSelected: (setIndex: number, value: number) => void
}) {
  const { theme } = useTokens()
  const [draft, setDraft] = useState({
    actualLoad: seedLoadForSet(movement, set),
    actualReps: seedRepsForSet(movement, set),
    actualRir: set.actualRir ?? undefined,
  })
  const effectiveActualRir =
    draft.actualRir ?? (!set.completed && typeof set.actualRir !== 'number' ? suggestedRir : undefined)

  const adjustLoad = (delta: number) =>
    setDraft((current) => ({
      ...current,
      actualLoad: Math.max(0, roundToStep(Number(current.actualLoad) + delta, session.rounding)),
    }))
  const adjustReps = (delta: number) =>
    setDraft((current) => ({ ...current, actualReps: Math.max(0, Number(current.actualReps) + delta) }))

  const ctaLabel = saveFailed ? 'Retry save' : set.completed ? 'Update set' : 'Log set'
  const previousLine = previousSetShort(movement.previous, set.setIndex)
  const controlsDisabled = isSaving || disabled

  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.tones.action.border,
        borderRadius: radii.lg,
        borderWidth: 1,
        padding: spacing.md,
        ...cardShadow(theme),
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: spacing.xs,
          justifyContent: 'space-between',
        }}
      >
        <SectionLabel>
          Current · Set {setNumber} of {setTotal}
        </SectionLabel>
        <Caption numberOfLines={1} style={{ flexShrink: 1 }}>
          Target {formatSetTarget(set, session.units, true, movement)}
          {previousLine ? ` · ${previousLine}` : ''}
        </Caption>
      </View>

      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        <FocusStepper
          label="Weight"
          unitSuffix={session.units}
          value={Number(draft.actualLoad)}
          step={session.rounding}
          onAdjust={adjustLoad}
          onType={(value) => setDraft((current) => ({ ...current, actualLoad: Math.max(0, value) }))}
          disabled={controlsDisabled}
        />
        <FocusStepper
          label="Reps"
          value={Number(draft.actualReps)}
          step={1}
          onAdjust={adjustReps}
          onType={(value) => setDraft((current) => ({ ...current, actualReps: Math.max(0, value) }))}
          disabled={controlsDisabled}
        />
        <FocusRirRow
          value={effectiveActualRir}
          disabled={controlsDisabled}
          onChange={(value) => {
            setDraft((current) => ({ ...current, actualRir: value }))
            onRirSelected(set.setIndex, value)
          }}
        />

        {saveFailed ? (
          <Text size="xs" tone="danger">
            Last save failed — tap Retry to try again.
          </Text>
        ) : null}

        <Button
          label={ctaLabel}
          fullWidth
          loading={isSaving}
          disabled={controlsDisabled}
          onPress={() =>
            onLogSet({
              actualLoad: Number(draft.actualLoad),
              actualReps: Number(draft.actualReps),
              actualRir: effectiveActualRir,
            })
          }
          testID="focus-log-set"
        />
      </View>
    </View>
  )
}
