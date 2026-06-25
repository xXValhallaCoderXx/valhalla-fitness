import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ActionIcon, Badge, Button, Card, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Calculator, Check, ChevronDown, History, RefreshCw, Repeat2, Timer, X } from 'lucide-react'
import { useId, useState } from 'react'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { patchSetInSession, sessionCompletion, type SetPatch } from '~/domains/session/lib/session-cache'
import { upsertSetLogFn } from '~/server/api'
import type { MovementSlot, SetLog, WorkoutSession } from '~/shared/types'

export function SyncPill({ state }: { state?: string }) {
    if (state !== 'saving' && state !== 'syncFailed') return null
    const label = state === 'syncFailed' ? 'Sync failed' : state === 'saving' ? 'Saving' : 'Synced'
    const tone = state === 'syncFailed' ? 'danger' : state === 'saving' ? 'warning' : 'success'
    return <Badge color={tone}>{label}</Badge>
}

export function MovementCard({
    session,
    movement,
    isOpen,
    onToggle,
}: {
    session: WorkoutSession
    movement: MovementSlot
    isOpen: boolean
    onToggle: () => void
}) {
    const contentId = useId()
    const completedSets = movement.sets.filter((set) => set.completed).length
    const totalSets = movement.sets.length

    return (
        <Card className="overflow-hidden p-0">
            <div className="flex items-start justify-between gap-3 p-3">
                <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    aria-expanded={isOpen}
                    aria-controls={contentId}
                    onClick={onToggle}
                >
                    <ChevronDown
                        className={`mt-1 shrink-0 text-[var(--mantine-color-dimmed)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        size={16}
                    />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-base font-bold">{movement.movementName}</h2>
                            <Badge color={movement.role === 'main' ? 'action' : 'neutral'}>{movement.role}</Badge>
                            <Badge color={completedSets === totalSets ? 'success' : 'warning'}>
                                {completedSets}/{totalSets} sets
                            </Badge>
                        </div>
                        {movement.performedMovementId && movement.performedMovementId !== movement.movementId ? (
                            <p className="mt-1 text-xs text-[var(--mantine-color-warning-filled)]">
                                Performed as {movement.performedMovementName}
                            </p>
                        ) : null}
                        <p className="mt-1 text-xs text-[var(--mantine-color-dimmed)]">{movement.targetSummary}</p>
                        {movement.previous ? (
                            <p className="mt-1 text-xs text-[var(--mantine-color-dimmed)]">{movement.previous.label}</p>
                        ) : null}
                    </div>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                    <ActionIcon size="lg" title="Plate math" aria-label="Plate math">
                        <Calculator size={16} />
                    </ActionIcon>
                    <ActionIcon size="lg" title="Swap movement" aria-label="Swap movement">
                        <Repeat2 size={16} />
                    </ActionIcon>
                    <ActionIcon size="lg" title="History" aria-label="History">
                        <History size={16} />
                    </ActionIcon>
                </div>
            </div>
            {isOpen ? (
                <div id={contentId} className="space-y-2 border-t border-[var(--mantine-color-default-border)] p-3">
                    {movement.sets.map((set) => (
                        <SetRow key={`${movement.id}-${set.setIndex}`} session={session} movement={movement} set={set} />
                    ))}
                </div>
            ) : null}
        </Card>
    )
}

function SetRow({
    session,
    movement,
    set,
}: {
    session: WorkoutSession
    movement: MovementSlot
    set: SetLog
}) {
    const queryClient = useQueryClient()
    const [draft, setDraft] = useState({
        actualLoad: set.actualLoad ?? set.targetLoad ?? 0,
        actualReps: set.actualReps ?? set.targetReps ?? set.targetRepMin ?? 0,
        actualRir: set.actualRir ?? undefined,
    })

    const mutation = useMutation({
        mutationKey: ['setLog', session.sessionId, movement.id, set.setIndex],
        mutationFn: (patch: SetPatch) =>
            upsertSetLogFn({
                data: {
                    sessionId: session.sessionId,
                    exerciseLogId: movement.id,
                    setIndex: set.setIndex,
                    actualLoad: patch.actualLoad,
                    actualReps: patch.actualReps,
                    actualRir: patch.actualRir,
                    completed: patch.completed,
                    note: patch.note,
                    clientMutationId: patch.clientMutationId ?? crypto.randomUUID(),
                },
            }),
        onMutate: async (patch) => {
            await queryClient.cancelQueries({ queryKey: ['session', session.sessionId] })
            const previous = queryClient.getQueryData<WorkoutSession>(['session', session.sessionId])
            if (previous) {
                queryClient.setQueryData(
                    ['session', session.sessionId],
                    patchSetInSession(previous, {
                        ...patch,
                        movementSlotId: movement.id,
                        setIndex: set.setIndex,
                        syncState: 'saving',
                    }),
                )
            }
            return { previous }
        },
        onError: (error, patch, context) => {
            if (context?.previous) {
                queryClient.setQueryData(
                    ['session', session.sessionId],
                    patchSetInSession(context.previous, {
                        ...patch,
                        movementSlotId: movement.id,
                        setIndex: set.setIndex,
                        syncState: 'syncFailed',
                    }),
                )
            }
            notifications.show({
                color: 'danger',
                title: 'Set not saved',
                message: getApiErrorMessage(error, 'Unable to save this set. Retry when your connection is stable.'),
            })
        },
        onSuccess: (nextSession) => {
            queryClient.setQueryData(['session', session.sessionId], nextSession)
            queryClient.setQueryData(['today'], (current: any) =>
                current ? { ...current, activeSession: nextSession } : current,
            )
        },
    })

    const complete = () => {
        if (mutation.isPending || set.syncState === 'saving') return
        const completed = set.syncState === 'syncFailed' ? set.completed : !set.completed
        mutation.mutate({
            exerciseLogId: movement.id,
            movementSlotId: movement.id,
            setIndex: set.setIndex,
            actualLoad: Number(draft.actualLoad),
            actualReps: Number(draft.actualReps),
            actualRir: draft.actualRir,
            completed,
            clientMutationId: crypto.randomUUID(),
        })
    }

    const isSaving = mutation.isPending || set.syncState === 'saving'
    const saveFailed = set.syncState === 'syncFailed'
    const isEditingDisabled = set.completed || isSaving
    const actionLabel = saveFailed ? 'Retry' : set.completed ? 'Edit' : 'Complete'

    return (
        <div className={`grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-lg border p-2 ${saveFailed ? 'border-red-500/40 bg-red-500/10' : set.completed ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)]'}`}>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--mantine-color-default)] text-xs font-bold">
                {set.setIndex}
            </div>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--mantine-color-dimmed)]">
                    <span>
                        Target {set.targetLoad ?? '-'} x {set.targetReps ?? `${set.targetRepMin}-${set.targetRepMax}`}
                    </span>
                    {set.isTopSet ? <Badge color="warning">Top set</Badge> : null}
                    {set.isBackoff ? <Badge>Back-off</Badge> : null}
                    <SetSyncStatus state={set.syncState} />
                    {set.completed ? <span className="font-semibold text-emerald-300">Locked</span> : null}
                </div>
                <div className="mt-2 grid grid-cols-[1fr_1fr_1.3fr] gap-2">
                    <NumberField
                        label="Load"
                        value={draft.actualLoad}
                        step={session.units === 'kg' ? session.rounding : 5}
                        onChange={(value) => setDraft((prev) => ({ ...prev, actualLoad: value }))}
                        disabled={isEditingDisabled}
                    />
                    <NumberField
                        label="Reps"
                        value={draft.actualReps}
                        step={1}
                        onChange={(value) => setDraft((prev) => ({ ...prev, actualReps: value }))}
                        disabled={isEditingDisabled}
                    />
                    <RirSelector
                        value={draft.actualRir}
                        onChange={(value) => setDraft((prev) => ({ ...prev, actualRir: value }))}
                        disabled={isEditingDisabled}
                    />
                </div>
            </div>
            <Button
                color={saveFailed ? 'danger' : set.completed ? 'success' : undefined}
                variant={saveFailed || set.completed ? 'light' : 'default'}
                className="h-10 min-w-24 px-3"
                disabled={isSaving}
                onClick={complete}
                title={saveFailed ? 'Retry save' : set.completed ? 'Mark incomplete to edit' : 'Complete set'}
            >
                {saveFailed ? <RefreshCw size={16} /> : set.completed ? <Check size={16} /> : <Timer size={16} />}
                {actionLabel}
            </Button>
        </div>
    )
}

function SetSyncStatus({ state }: { state?: string }) {
    const showStatus = state && state !== 'synced'
    return (
        <span className="inline-flex min-h-[1.375rem] min-w-24 items-center" aria-live="polite">
            {showStatus ? <SyncPill state={state} /> : null}
        </span>
    )
}

function NumberField({
    label,
    value,
    step,
    onChange,
    disabled = false,
}: {
    label: string
    value: number
    step: number
    onChange: (value: number) => void
    disabled?: boolean
}) {
    return (
        <label className="grid gap-1">
            <span className="text-[9px] font-bold uppercase text-[var(--mantine-color-dimmed)]">{label}</span>
            <div className="grid grid-cols-[1.7rem_1fr_1.7rem] overflow-hidden rounded-md border border-[var(--mantine-color-default-border)]">
                <button
                    type="button"
                    className="bg-[var(--mantine-color-default)] text-[var(--mantine-color-dimmed)]"
                    disabled={disabled}
                    onClick={() => onChange(Number(value) - step)}
                >
                    -
                </button>
                <input
                    type="number"
                    className="min-w-0 bg-[var(--vf-surface-2)] px-1 py-1 text-center text-xs font-bold outline-none disabled:text-[var(--mantine-color-dimmed)]"
                    value={Number.isFinite(value) ? value : 0}
                    disabled={disabled}
                    onChange={(event) => onChange(Number(event.target.value))}
                />
                <button
                    type="button"
                    className="bg-[var(--mantine-color-default)] text-[var(--mantine-color-dimmed)]"
                    disabled={disabled}
                    onClick={() => onChange(Number(value) + step)}
                >
                    +
                </button>
            </div>
        </label>
    )
}

function RirSelector({
    value,
    onChange,
    disabled = false,
}: {
    value?: number
    onChange: (value: number) => void
    disabled?: boolean
}) {
    return (
        <div>
            <span className="text-[9px] font-bold uppercase text-[var(--mantine-color-dimmed)]">RIR</span>
            <div className="mt-1 grid grid-cols-5 gap-1">
                {[0, 1, 2, 3, 4].map((item) => (
                    <button
                        key={item}
                        type="button"
                        className={`rounded-md border px-1 py-1 text-[10px] font-bold ${value === item
                                ? 'border-[var(--mantine-primary-color-filled)] bg-[var(--mantine-primary-color-filled)] text-white'
                                : 'border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] text-[var(--mantine-color-dimmed)]'
                            }`}
                        disabled={disabled}
                        onClick={() => onChange(item)}
                    >
                        {item === 4 ? '4+' : item}
                    </button>
                ))}
            </div>
        </div>
    )
}

export function SessionProgress({ session, compact = false }: { session: WorkoutSession; compact?: boolean }) {
    const progress = sessionCompletion(session)
    const completedMovements = session.movements.filter((movement) => movement.sets.every((set) => set.completed)).length
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-xs text-[var(--mantine-color-dimmed)]">
                <span className="min-w-0 truncate">
                    {compact
                        ? `${progress.completed}/${progress.total} sets · ${completedMovements}/${session.movements.length} movements`
                        : `${progress.completed} of ${progress.total} sets`}
                </span>
                <span className="shrink-0 font-bold text-[var(--mantine-color-text)]">{progress.percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--vf-surface-2)]">
                <div className="h-full rounded-full bg-[var(--mantine-primary-color-filled)]" style={{ width: `${progress.percent}%` }} />
            </div>
        </div>
    )
}

export function IncompleteMainWarning({ session }: { session: WorkoutSession }) {
    const incompleteMain = session.movements.some(
        (movement) => movement.role === 'main' && movement.sets.some((set) => !set.completed),
    )
    if (!incompleteMain) return null
    return (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            <X size={14} />
            Main lift has incomplete sets. You can still finish, but review before saving.
        </div>
    )
}

export function NotesBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    return (
        <label className="grid gap-1">
            <span className="text-[10px] font-bold uppercase text-[var(--mantine-color-dimmed)]">Session notes</span>
            <TextInput value={value} onChange={(event) => onChange(event.target.value)} placeholder="Optional notes" />
        </label>
    )
}
