import { Box, Button, TextInput } from '@mantine/core'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { EmptyState, SectionLabel, Text } from '~/components'
import { cn } from '~/shared/lib/cn'
import { sessionCompletion } from '~/domains/session/lib/session-cache'
import type { WorkoutSession } from '~/shared/types'
import { AddAccessoryModal } from './AddAccessoryModal'
import { AddAdHocExerciseModal } from './AddAdHocExerciseModal'
import { LiveMovementList } from './LiveMovementList'
import { LiveSessionOnboarding } from './LiveSessionOnboarding'
import {
  MovementNumberBadge,
  StatusPanel,
} from './LiveSessionControls'
import { LiveSessionHeader } from './LiveSessionHeader'
import { RenameSessionModal } from './RenameSessionModal'
import { insetFieldStyles } from './form-styles'
import { isMovementComplete } from './live-session-utils'

type LiveSessionFrameProps = {
  session: WorkoutSession
  activeMovementId: string
  onSelectMovement: (movementId: string) => void
  notes: string
  onNotesChange: (value: string) => void
  onFinish: () => void
  finishLabel: string
  finishDisabled: boolean
  finishBlockedReason?: string | null
  finishError?: string | null
  onEnterFocus?: () => void
  managementPending: boolean
  onDiscard: () => void
  discardDisabled: boolean
}

export function LiveSessionFrame({
  session,
  activeMovementId,
  onSelectMovement,
  notes,
  onNotesChange,
  onFinish,
  finishLabel,
  finishDisabled,
  finishBlockedReason,
  finishError,
  onEnterFocus,
  managementPending,
  onDiscard,
  discardDisabled,
}: LiveSessionFrameProps) {
  const progress = sessionCompletion(session)
  const selectedMovement = session.movements.find((movement) => movement.id === activeMovementId) ?? session.movements[0]
  const selectedMovementId = selectedMovement?.id ?? activeMovementId
  const completedMovements = session.movements.filter(isMovementComplete).length
  const [addExerciseOpen, setAddExerciseOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const isAdHoc = Boolean(session.isAdHoc)

  return (
    <Box
      bg="var(--mantine-color-body)"
      c="var(--mantine-color-text)"
      className="-mx-3 -my-4 min-h-[calc(100dvh-3.5rem)] md:mx-auto md:my-0 md:min-h-0 md:max-w-[1180px] md:rounded-2xl md:border"
      style={{
        borderColor: 'var(--mantine-color-default-border)',
        boxShadow: 'var(--vf-shadow-panel)',
      }}
    >
      <LiveSessionHeader
        session={session}
        progress={progress}
        completedMovements={completedMovements}
        finishLabel={finishLabel}
        finishDisabled={finishDisabled || managementPending}
        onFinish={onFinish}
        onEnterFocus={onEnterFocus}
        focusDisabled={managementPending}
        onRename={isAdHoc && session.status === 'in_progress' ? () => setRenameOpen(true) : undefined}
        onDiscard={onDiscard}
        discardDisabled={discardDisabled || managementPending}
      />

      <Box className="h-1" bg="var(--vf-surface-2)" aria-hidden="true">
        <div
          className="h-full transition-all"
          style={{
            width: `${progress.percent}%`,
            backgroundColor: 'var(--mantine-primary-color-filled)',
          }}
        />
      </Box>

      <div className="md:flex md:min-h-[600px]">
        <MovementRail
          session={session}
          activeMovementId={selectedMovementId}
          onSelectMovement={onSelectMovement}
        />

        <main
          className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto px-3 py-3 pb-24 md:max-h-[calc(100vh-12rem)] md:space-y-3 md:p-4 md:pb-4"
          style={{ backgroundColor: 'var(--vf-bg-elevated)' }}
        >
          <LiveSessionOnboarding />
          {finishBlockedReason ? (
            <StatusPanel tone="warning">{finishBlockedReason}</StatusPanel>
          ) : null}
          {finishError ? <StatusPanel tone="danger">{finishError}</StatusPanel> : null}

          <LiveMovementList
            session={session}
            activeMovementId={selectedMovementId}
            onSelectMovement={onSelectMovement}
          />

          {session.movements.length === 0 ? (
            <EmptyState title="No exercises yet" centered>
              Pick anything from the catalog below — sets are yours to shape as you go.
            </EmptyState>
          ) : null}

          <Button
            type="button"
            fullWidth
            variant="default"
            className="border-dashed"
            data-testid="add-exercise"
            disabled={managementPending}
            onClick={() => setAddExerciseOpen(true)}
          >
            <Plus size={16} />
            {isAdHoc ? 'Add exercise' : 'Add accessory'}
          </Button>

          <LiveNotesBox value={notes} onChange={onNotesChange} />
        </main>
      </div>
      {isAdHoc ? (
        <AddAdHocExerciseModal
          open={addExerciseOpen}
          session={session}
          onClose={() => setAddExerciseOpen(false)}
          onAdded={(movementId) => onSelectMovement(movementId)}
        />
      ) : (
        <AddAccessoryModal
          open={addExerciseOpen}
          session={session}
          onClose={() => setAddExerciseOpen(false)}
          onAdded={(movementId) => onSelectMovement(movementId)}
        />
      )}
      {isAdHoc ? (
        <RenameSessionModal open={renameOpen} session={session} onClose={() => setRenameOpen(false)} />
      ) : null}
    </Box>
  )
}

function MovementRail({
  session,
  activeMovementId,
  onSelectMovement,
}: {
  session: WorkoutSession
  activeMovementId: string
  onSelectMovement: (movementId: string) => void
}) {
  return (
    <Box
      component="aside"
      className="hidden w-56 shrink-0 flex-col border-r px-2 py-3 md:flex"
      bg="var(--vf-bg-elevated)"
      style={{ borderColor: 'var(--mantine-color-default-border)' }}
    >
      <SectionLabel className="mb-4 px-2">Movements</SectionLabel>
      <div className="space-y-0.5">
        {session.movements.map((movement) => {
          const complete = isMovementComplete(movement)
          const active = movement.id === activeMovementId
          const completedSets = movement.sets.filter((set) => set.completed).length
          return (
            <button
              key={movement.id}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left transition',
                complete && !active && 'opacity-55',
              )}
              style={{
                borderColor: active ? 'var(--mantine-primary-color-filled)' : 'transparent',
                backgroundColor: active ? 'var(--vf-action-soft)' : 'transparent',
                color: active ? 'var(--vf-action-text)' : 'var(--mantine-color-dimmed)',
              }}
              onClick={() => onSelectMovement(movement.id)}
            >
              <MovementNumberBadge number={movement.orderIndex + 1} active={active} complete={complete} />
              <Text component="span" size="xs" fw={active ? 900 : 600} c="inherit" truncate className={cn('min-w-0 flex-1', complete && 'line-through')}>
                {movement.movementName}
              </Text>
              <Text component="span" size="0.625rem" fw={800} c="inherit" className="shrink-0 tabular-nums" style={{ opacity: 0.8 }}>
                {completedSets}/{movement.sets.length}
              </Text>
            </button>
          )
        })}
      </div>
    </Box>
  )
}

function LiveNotesBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label
      className="grid gap-1 rounded-2xl border p-4"
      style={{
        borderColor: 'var(--vf-card-border)',
        backgroundColor: 'var(--mantine-color-default)',
        boxShadow: 'var(--vf-shadow-card)',
      }}
    >
      <SectionLabel>Session notes</SectionLabel>
      <TextInput
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Optional notes"
        styles={insetFieldStyles}
      />
    </label>
  )
}
