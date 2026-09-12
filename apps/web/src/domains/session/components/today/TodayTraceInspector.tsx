import { useQuery } from '@tanstack/react-query'
import { useExperienceMode } from '~/domains/account/components'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import { LoadTracePanel } from '~/domains/program/components/inspector/LoadTracePanel'
import {
  buildLoadTrace,
  definingSet,
  projectTrainingMaxBands,
  stateChangeProvenance,
} from '~/domains/program/lib/load-trace'
import { programOverviewQueryOptions } from '~/domains/program/queries'
import type { ProgramInstance } from '~/domains/program'
import type { PlannedSession } from '~/domains/session'
import { Caption, Panel, SectionLabel } from '~/components'

/**
 * The Today trace panel.
 *
 * Input provenance ("set 12 Jul · training_max_standard · +5.0") needs *accepted* progression
 * decisions, which the Today payload doesn't carry — only the programme overview does. Rather than
 * widen Today's payload for a Full-only panel, this fetches the overview lazily and only once a
 * set is actually selected, so Guided users pay nothing and Plan already has it warm.
 */
export function TodayTraceInspector({
  session,
  program,
  selectedSlotId,
}: {
  session: PlannedSession
  program: ProgramInstance | null
  selectedSlotId: string | null
}) {
  const userId = useRequiredAccountId()
  const { isFull, showFormulas } = useExperienceMode()
  const overviewQuery = useQuery({
    ...programOverviewQueryOptions(userId),
    enabled: isFull && Boolean(selectedSlotId),
  })

  if (!isFull) return null

  const movement = session.movements.find((slot) => (slot.slotId ?? slot.id) === selectedSlotId)
  if (!movement) {
    return (
      <Panel p="md">
        <SectionLabel>Trace</SectionLabel>
        <Caption mt={2} lh={1.45}>
          Pick a movement to see where its numbers come from.
        </Caption>
      </Panel>
    )
  }

  const set = definingSet(movement)
  const trace = set ? buildLoadTrace({ set, movement, session, program }) : null

  if (!trace) {
    return (
      <Panel p="md">
        <SectionLabel>Trace</SectionLabel>
        <Caption mt={2} lh={1.45}>
          {movement.performedMovementName ?? movement.movementName} has no computed load — this one
          is yours to choose.
        </Caption>
      </Panel>
    )
  }

  // Attach the state's own history to its input row, when the overview has arrived.
  const stateKey = set?.sourceBinding?.stateKey
  const state = overviewQuery.data?.stateValues.find((value) => value.stateKey === stateKey)
  const provenance = stateChangeProvenance(state, session.units)
  const inputs = provenance
    ? trace.inputs.map((input, index) => (index === 0 ? { ...input, provenance } : input))
    : trace.inputs

  // Only a training max has bands to project; a working load progresses by a different rule.
  const bands =
    set?.sourceBinding?.stateType === 'training_max' && state
      ? projectTrainingMaxBands({
          currentTm: state.value,
          rounding: session.rounding,
          movementId: movement.movementId,
          stateKey: state.stateKey,
          targetReps: set.targetReps ?? 1,
        })
      : undefined

  return (
    <LoadTracePanel trace={{ ...trace, inputs }} bands={bands} showFormulas={showFormulas} />
  )
}
