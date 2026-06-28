import { Box, Button, TextInput } from '@mantine/core'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Caption, SectionLabel, Text } from '~/components'
import { cn } from '~/shared/lib/cn'
import { sessionCompletion } from '~/domains/session/lib/session-cache'
import type { WorkoutSession } from '~/shared/types'
import { SyncPill } from './Session'
import { AddAccessoryModal } from './AddAccessoryModal'
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
  const [addAccessoryOpen, setAddAccessoryOpen] = useState(false)

  return (
    <Box
      bg="var(--mantine-color-body)"
      c="var(--mantine-color-text)"
      className="-mx-3 -my-4 min-h-[calc(100dvh-3.5rem)] md:mx-auto md:my-0 md:min-h-0 md:max-w-[1180px] md:rounded-xl md:border"
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

          <Button
            type="button"
            fullWidth
            variant="default"
            className="border-dashed"
            onClick={() => setAddAccessoryOpen(true)}
          >
            <Plus size={16} />
            Add accessory
          </Button>

          <LiveNotesBox value={notes} onChange={onNotesChange} />
        </main>
      </div>
      <AddAccessoryModal
        open={addAccessoryOpen}
        session={session}
        onClose={() => setAddAccessoryOpen(false)}
        onAdded={(movementId) => onSelectMovement(movementId)}
      />
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
}: {
  session: WorkoutSession
  progress: ReturnType<typeof sessionCompletion>
  completedMovements: number
  finishLabel: string
  finishDisabled: boolean
  onFinish: () => void
  onEnterFocus?: () => void
}) {
  return (
    <Box
      className="sticky top-[calc(3rem+env(safe-area-inset-top))] z-20 border-b px-4 py-2.5 backdrop-blur md:static md:px-5"
      style={{
        borderColor: 'var(--mantine-color-default-border)',
        backgroundColor: 'color-mix(in srgb, var(--mantine-color-default) 95%, transparent)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div>
              <Text component="h1" size="sm" fw={900} lh={1.1} truncate>
                {session.title}
              </Text>
              <Caption component="p" mt={2} size="xs">
                {completedMovements} of {session.movements.length} movements · {progress.completed} of {progress.total} sets
              </Caption>
            </div>
            <div className="hidden flex-wrap gap-1.5 md:flex">
              <MetaPill tone={session.hardness === 'Hard' ? 'danger' : 'neutral'}>{session.hardness}</MetaPill>
              <MetaPill>{session.weekLabel}</MetaPill>
              <MetaPill>{session.programTitle}</MetaPill>
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
      <SectionLabel className="mb-2 px-2">Movements</SectionLabel>
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
      className="grid gap-1 rounded-xl border p-4"
      style={{
        borderColor: 'var(--mantine-color-default-border)',
        backgroundColor: 'var(--mantine-color-default)',
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
