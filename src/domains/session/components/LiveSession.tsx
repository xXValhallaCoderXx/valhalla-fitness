import { ActionIcon, Box, Button, Modal, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Caption, EmptyState, SectionLabel, Text } from '~/components'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { cn } from '~/shared/lib/cn'
import { AD_HOC_BADGE_LABEL, AD_HOC_TITLE_MAX_LENGTH } from '~/domains/session/lib/ad-hoc'
import { sessionCompletion } from '~/domains/session/lib/session-cache'
import { renameSessionFn } from '~/domains/session/server/session-functions'
import type { WorkoutSession } from '~/shared/types'
import { SyncPill } from './Session'
import { AddAccessoryModal } from './AddAccessoryModal'
import { AddAdHocExerciseModal } from './AddAdHocExerciseModal'
import { LiveMovementCard } from './LiveMovementCard'
import { LiveSessionOnboarding } from './LiveSessionOnboarding'
import {
  MetaPill,
  MovementNumberBadge,
  StatusPanel,
} from './LiveSessionControls'
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
      <SessionContextBar
        session={session}
        progress={progress}
        completedMovements={completedMovements}
        finishLabel={finishLabel}
        finishDisabled={finishDisabled}
        onFinish={onFinish}
        onEnterFocus={onEnterFocus}
        onRename={isAdHoc && session.status === 'in_progress' ? () => setRenameOpen(true) : undefined}
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

          {session.movements.map((movement) => {
            const isSelected = movement.id === selectedMovementId
            return (
              <div key={movement.id}>
                <LiveMovementCard
                  session={session}
                  movement={movement}
                  isActive={isSelected}
                  movementNumber={movement.orderIndex + 1}
                  onSelect={() => onSelectMovement(movement.id)}
                />
              </div>
            )
          })}

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

function SessionContextBar({
  session,
  progress,
  completedMovements,
  finishLabel,
  finishDisabled,
  onFinish,
  onEnterFocus,
  onRename,
}: {
  session: WorkoutSession
  progress: ReturnType<typeof sessionCompletion>
  completedMovements: number
  finishLabel: string
  finishDisabled: boolean
  onFinish: () => void
  onEnterFocus?: () => void
  onRename?: () => void
}) {
  return (
    <Box
      className="sticky top-0 z-20 border-b px-4 py-2.5 backdrop-blur md:static md:px-5"
      style={{
        borderColor: 'var(--mantine-color-default-border)',
        backgroundColor: 'color-mix(in srgb, var(--mantine-color-default) 95%, transparent)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div>
              <span className="flex items-center gap-1.5">
                <Text component="h1" size="sm" fw={900} lh={1.1} truncate>
                  {session.title}
                </Text>
                {onRename ? (
                  <ActionIcon
                    aria-label="Rename workout"
                    size="sm"
                    radius="xl"
                    variant="subtle"
                    color="neutral"
                    onClick={onRename}
                  >
                    <Pencil size={12} />
                  </ActionIcon>
                ) : null}
              </span>
              <Caption component="p" mt={2} size="xs">
                {completedMovements} of {session.movements.length} movements · {progress.completed} of {progress.total} sets
              </Caption>
            </div>
            <div className="hidden flex-wrap gap-1.5 md:flex">
              {session.isAdHoc ? (
                <MetaPill>{AD_HOC_BADGE_LABEL}</MetaPill>
              ) : (
                <>
                  <MetaPill tone={session.hardness === 'Hard' ? 'danger' : 'neutral'}>{session.hardness}</MetaPill>
                  <MetaPill>{session.weekLabel}</MetaPill>
                  <MetaPill>{session.programTitle}</MetaPill>
                </>
              )}
              <SyncPill state={session.syncState} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onEnterFocus ? (
            <span className="md:hidden">
              <Button
                type="button"
                variant="default"
                size="compact-sm"
                onClick={onEnterFocus}
                data-testid="enter-focus"
              >
                Focus
              </Button>
            </span>
          ) : null}
          <Button
            type="button"
            data-tour="live-finish"
            size="compact-sm"
            disabled={finishDisabled}
            onClick={onFinish}
          >
            {finishLabel}
          </Button>
        </div>
      </div>
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

function RenameSessionModal({
  open,
  session,
  onClose,
}: {
  open: boolean
  session: WorkoutSession
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(session.title)
  const mutation = useMutation({
    mutationFn: (nextTitle: string) =>
      renameSessionFn({ data: { sessionId: session.sessionId, title: nextTitle } }),
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not rename workout',
        message: getApiErrorMessage(error, 'Unable to rename this workout.'),
      })
    },
    onSuccess: async (nextSession) => {
      queryClient.setQueryData(['session', session.sessionId], nextSession)
      await queryClient.invalidateQueries({ queryKey: ['today'] })
      onClose()
    },
  })
  const trimmed = title.trim()

  return (
    <Modal
      opened={open}
      onClose={() => {
        if (!mutation.isPending) onClose()
      }}
      title="Name this workout"
      size="sm"
      styles={{
        content: {
          border: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'var(--mantine-color-default)',
          color: 'var(--mantine-color-text)',
        },
        header: {
          backgroundColor: 'var(--mantine-color-default)',
          color: 'var(--mantine-color-text)',
        },
        title: {
          color: 'var(--mantine-color-text)',
          fontWeight: 700,
        },
        close: { color: 'var(--mantine-color-dimmed)' },
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (trimmed && !mutation.isPending) mutation.mutate(trimmed)
        }}
        className="space-y-3"
      >
        <TextInput
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={AD_HOC_TITLE_MAX_LENGTH}
          placeholder="e.g. Push day"
          data-autofocus
          styles={insetFieldStyles}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="default" disabled={mutation.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!trimmed || mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save name'}
          </Button>
        </div>
      </form>
    </Modal>
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
