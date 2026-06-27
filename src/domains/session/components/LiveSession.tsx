import { TextInput } from '@mantine/core'
import { Dumbbell, Plus } from 'lucide-react'
import { useState } from 'react'
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
}: LiveSessionFrameProps) {
  const progress = sessionCompletion(session)
  const selectedMovement = session.movements.find((movement) => movement.id === activeMovementId) ?? session.movements[0]
  const selectedMovementId = selectedMovement?.id ?? activeMovementId
  const completedMovements = session.movements.filter(isMovementComplete).length
  const [addAccessoryOpen, setAddAccessoryOpen] = useState(false)

  return (
    <div className="-mx-3 -my-4 min-h-[calc(100dvh-3.5rem)] bg-[var(--mantine-color-body)] text-[var(--mantine-color-text)] md:mx-auto md:my-0 md:min-h-0 md:max-w-[1180px] md:rounded-xl md:border md:border-[var(--mantine-color-default-border)] md:bg-[var(--mantine-color-default)] md:shadow-[var(--vf-shadow-panel)]">
      <SessionContextBar
        session={session}
        progress={progress}
        completedMovements={completedMovements}
        finishLabel={finishLabel}
        finishDisabled={finishDisabled}
        onFinish={onFinish}
      />

      <div className="h-1 bg-[var(--vf-surface-2)]" aria-hidden="true">
        <div
          className="h-full bg-[var(--mantine-primary-color-filled)] transition-all"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <div className="md:flex md:min-h-[600px]">
        <MovementRail
          session={session}
          activeMovementId={selectedMovementId}
          onSelectMovement={onSelectMovement}
        />

        <main className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto px-3 py-3 pb-24 md:max-h-[calc(100vh-12rem)] md:space-y-3 md:bg-[var(--vf-bg-elevated)] md:p-4 md:pb-4">
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

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-4 py-3 text-sm font-extrabold text-[var(--mantine-color-dimmed)] transition hover:border-[var(--vf-action-border)] hover:bg-[var(--vf-surface-2)] hover:text-[var(--mantine-color-text)]"
            onClick={() => setAddAccessoryOpen(true)}
          >
            <Plus size={16} />
            Add accessory
          </button>

          <LiveNotesBox value={notes} onChange={onNotesChange} />
        </main>
      </div>
      <AddAccessoryModal
        open={addAccessoryOpen}
        session={session}
        onClose={() => setAddAccessoryOpen(false)}
        onAdded={(movementId) => onSelectMovement(movementId)}
      />
    </div>
  )
}

function SessionContextBar({
  session,
  progress,
  completedMovements,
  finishLabel,
  finishDisabled,
  onFinish,
}: {
  session: WorkoutSession
  progress: ReturnType<typeof sessionCompletion>
  completedMovements: number
  finishLabel: string
  finishDisabled: boolean
  onFinish: () => void
}) {
  return (
    <div className="sticky top-[calc(3rem+env(safe-area-inset-top))] z-20 border-b border-[var(--mantine-color-default-border)] bg-[color:var(--mantine-color-default)/0.95] px-4 py-2.5 backdrop-blur md:static md:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5 md:hidden">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--vf-brand-mark)] text-[var(--vf-brand-mark-text)]">
              <Dumbbell size={11} />
            </div>
            <span className="text-xs font-bold tracking-tight text-[var(--mantine-color-text)]">Sheetless</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div>
              <h1 className="truncate text-[11px] font-extrabold leading-tight text-[var(--mantine-color-text)] md:text-sm">
                {session.title}
              </h1>
              <p className="mt-0.5 text-[9px] text-[var(--mantine-color-dimmed)] md:text-xs">
                {completedMovements} of {session.movements.length} movements · {progress.completed} of {progress.total} sets
              </p>
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
          <button
            type="button"
            data-tour="live-finish"
            className="rounded-lg bg-[var(--mantine-primary-color-filled)] px-2.5 py-1.5 text-[10px] font-extrabold text-white transition hover:bg-[var(--mantine-primary-color-filled-hover)] disabled:opacity-50 md:px-3 md:text-xs"
            disabled={finishDisabled}
            onClick={onFinish}
          >
            {finishLabel}
          </button>
        </div>
      </div>
    </div>
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
    <aside className="hidden w-56 shrink-0 flex-col border-r border-[var(--mantine-color-default-border)] bg-[var(--vf-bg-elevated)] px-2 py-3 md:flex">
      <p className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-wider text-[var(--mantine-color-dimmed)]">Movements</p>
      <div className="space-y-0.5">
        {session.movements.map((movement) => {
          const complete = isMovementComplete(movement)
          const active = movement.id === activeMovementId
          return (
            <button
              key={movement.id}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition',
                active
                  ? 'border border-[var(--mantine-primary-color-filled)] bg-[var(--vf-action-soft)] text-[var(--vf-action-text)]'
                  : 'text-[var(--mantine-color-dimmed)] hover:bg-[var(--mantine-color-default)]',
                complete && !active && 'opacity-55',
              )}
              onClick={() => onSelectMovement(movement.id)}
            >
              <MovementNumberBadge number={movement.orderIndex + 1} active={active} complete={complete} />
              <span className={cn('truncate text-xs', active ? 'font-extrabold' : 'font-semibold', complete && 'line-through')}>
                {movement.movementName}
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

function LiveNotesBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 rounded-xl border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] p-4">
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--mantine-color-dimmed)]">
        Session notes
      </span>
      <TextInput
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Optional notes"
        classNames={{
          input: '!border-[var(--mantine-color-default-border)] !bg-[var(--vf-surface-2)] !text-[var(--mantine-color-text)]',
        }}
      />
    </label>
  )
}
