import { Box, Button } from '@mantine/core'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Text } from '~/components'
import { sessionCompletion } from '~/domains/session/lib/session-cache'
import { useAddExerciseSet } from '~/domains/session/lib/useAddExerciseSet'
import type { WorkoutSession } from '~/shared/types'
import { AddAdHocExerciseModal } from './AddAdHocExerciseModal'
import { FocusComingUp } from './FocusComingUp'
import { FocusExerciseHeader } from './FocusExerciseHeader'
import { FocusSessionOnboarding } from './FocusSessionOnboarding'
import { FocusSetCard } from './FocusSetCard'
import { FocusSetProgressBar } from './FocusSetProgressBar'
import { FocusTopBar } from './FocusTopBar'
import { advanceAfterLog, exerciseNeighbors, firstActionableSetIndex, upcomingMovements } from './live-focus-utils'
import { MovementHistoryModal } from './MovementHistoryModal'

type LiveFocusViewProps = {
  session: WorkoutSession
  activeMovementId: string
  onSelectMovement: (movementId: string) => void
  onExitToOverview: () => void
  onFinish: () => void
  finishLabel: string
  finishDisabled: boolean
}

/** Mobile-only single-exercise/single-set logger. Desktop and the list "Overview" are unaffected. */
export function LiveFocusView({
  session,
  activeMovementId,
  onSelectMovement,
  onExitToOverview,
  onFinish,
  finishLabel,
  finishDisabled,
}: LiveFocusViewProps) {
  const activeMovement = session.movements.find((movement) => movement.id === activeMovementId) ?? session.movements[0]
  const [selectedSetIndex, setSelectedSetIndex] = useState(() =>
    activeMovement ? firstActionableSetIndex(activeMovement) : 1,
  )
  const [suggestedRirBySetIndex, setSuggestedRirBySetIndex] = useState<Record<number, number | undefined>>({})
  const [historyOpen, setHistoryOpen] = useState(false)
  const [addExerciseOpen, setAddExerciseOpen] = useState(false)
  const addSet = useAddExerciseSet(session, activeMovement ?? session.movements[0] ?? ({} as never))
  const isAdHoc = Boolean(session.isAdHoc)
  const addExerciseButton = isAdHoc ? (
    <Button
      type="button"
      fullWidth
      variant="default"
      className="border-dashed"
      onClick={() => setAddExerciseOpen(true)}
    >
      <Plus size={16} />
      Add exercise
    </Button>
  ) : null
  const addExerciseModal = isAdHoc ? (
    <AddAdHocExerciseModal
      open={addExerciseOpen}
      session={session}
      onClose={() => setAddExerciseOpen(false)}
      onAdded={(movementId) => {
        setAddExerciseOpen(false)
        onSelectMovement(movementId)
      }}
    />
  ) : null

  // Jump to the first actionable set whenever the active exercise changes.
  useEffect(() => {
    if (activeMovement) setSelectedSetIndex(firstActionableSetIndex(activeMovement))
    setHistoryOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMovementId])

  if (!activeMovement) {
    return (
      <FocusShell>
        <FocusTopBar
          onBack={onExitToOverview}
          centerPrimary={session.title}
          centerSecondary=""
          finishLabel={finishLabel}
          finishDisabled={finishDisabled}
          onFinish={onFinish}
        />
        <div className="space-y-4 p-8 text-center">
          <Text tone="dimmed">
            {isAdHoc ? 'No exercises yet — add anything from the catalog.' : 'This session has no movements yet.'}
          </Text>
          {addExerciseButton}
        </div>
        {addExerciseModal}
      </FocusShell>
    )
  }

  const selectedSet =
    activeMovement.sets.find((set) => set.setIndex === selectedSetIndex) ?? activeMovement.sets[0]
  const setTotal = activeMovement.sets.length
  const setNumber = selectedSet
    ? activeMovement.sets.findIndex((set) => set.setIndex === selectedSet.setIndex) + 1
    : 1
  const { hasPrev, hasNext, prevId, nextId } = exerciseNeighbors(session, activeMovement.id)
  const overall = sessionCompletion(session)
  const coming = upcomingMovements(session, activeMovement.id, 2)

  const carryRirToNextSet = (setIndex: number, value: number) => {
    const nextSet = activeMovement.sets.find((set) => set.setIndex > setIndex && !set.completed)
    if (!nextSet || typeof nextSet.actualRir === 'number') return
    setSuggestedRirBySetIndex((current) => ({ ...current, [nextSet.setIndex]: value }))
  }

  const handleLogged = (nextSession: WorkoutSession, loggedSetIndex: number) => {
    const result = advanceAfterLog(nextSession, activeMovement.id, loggedSetIndex)
    if (result.kind === 'sessionComplete') {
      onFinish()
      return
    }
    if (result.movementId !== activeMovement.id) onSelectMovement(result.movementId)
    setSelectedSetIndex(result.setIndex)
  }

  return (
    <FocusShell>
      <FocusTopBar
        onBack={onExitToOverview}
        centerPrimary={activeMovement.movementName}
        centerSecondary={`${session.title} · Set ${setNumber} of ${setTotal}`}
        finishLabel={finishLabel}
        finishDisabled={finishDisabled}
        onFinish={onFinish}
      />

      <Box className="h-1" bg="var(--vf-surface-2)" aria-hidden="true">
        <div
          className="h-full transition-all"
          style={{ width: `${overall.percent}%`, backgroundColor: 'var(--mantine-primary-color-filled)' }}
        />
      </Box>

      <div className="flex-1 space-y-4 px-4 py-4">
        <FocusSessionOnboarding />
        <FocusExerciseHeader
          movement={activeMovement}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onPrev={() => prevId && onSelectMovement(prevId)}
          onNext={() => nextId && onSelectMovement(nextId)}
          onOpenHistory={() => setHistoryOpen(true)}
        />

        <FocusSetProgressBar
          movement={activeMovement}
          selectedSetIndex={selectedSetIndex}
          onSelectSet={setSelectedSetIndex}
        />

        {selectedSet ? (
          <FocusSetCard
            key={`${activeMovement.id}-${selectedSet.setIndex}`}
            session={session}
            movement={activeMovement}
            set={selectedSet}
            setNumber={setNumber}
            setTotal={setTotal}
            suggestedRir={suggestedRirBySetIndex[selectedSet.setIndex]}
            onLogged={handleLogged}
            onRirSelected={carryRirToNextSet}
          />
        ) : null}

        {activeMovement.role === 'accessory' || isAdHoc ? (
          <Button
            type="button"
            fullWidth
            variant="default"
            className="border-dashed"
            disabled={addSet.isPending}
            onClick={() =>
              addSet.mutate(undefined, {
                onSuccess: (nextSession) => {
                  const nextMovement = nextSession.movements.find((movement) => movement.id === activeMovement.id)
                  const newSetIndex = nextMovement?.sets.at(-1)?.setIndex
                  if (newSetIndex) setSelectedSetIndex(newSetIndex)
                },
              })
            }
          >
            <Plus size={16} />
            Add set
          </Button>
        ) : null}

        {addExerciseButton}

        <FocusComingUp movements={coming} onJumpTo={onSelectMovement} />
      </div>

      <MovementHistoryModal open={historyOpen} movement={activeMovement} onClose={() => setHistoryOpen(false)} />
      {addExerciseModal}
    </FocusShell>
  )
}

/** Full-bleed mobile shell (cancels the Page padding) matching the live-session frame's mobile layout. */
function FocusShell({ children }: { children: React.ReactNode }) {
  return (
    <Box
      data-testid="focus-view"
      bg="var(--mantine-color-body)"
      c="var(--mantine-color-text)"
      className="-mx-3 -my-4 flex min-h-[calc(100dvh-3.5rem)] flex-col"
    >
      {children}
    </Box>
  )
}
