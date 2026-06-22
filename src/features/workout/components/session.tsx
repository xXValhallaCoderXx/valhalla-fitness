import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { Calculator, Check, ChevronDown, History, RefreshCw, Repeat2, Timer, X } from 'lucide-react'
import { useId, useState } from 'react'
import { Button, Card, Chip, TextInput } from '~/components/atoms'
import { getApiErrorMessage } from '~/lib/api-error'
import { patchSetInSession, sessionCompletion, type SetPatch } from '~/lib/session-cache'
import { upsertSetLogFn } from '~/server/api'
import type { MovementSlot, SetLog, WorkoutSession } from '~/types/training'

export function SyncPill({ state }: { state?: string }) {
    const label = state === 'syncFailed' ? 'Sync failed' : state === 'saving' ? 'Saving' : 'Synced'
    const tone = state === 'syncFailed' ? 'danger' : state === 'saving' ? 'warning' : 'success'
    return <Chip tone={tone}>{label}</Chip>
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
                        className={`mt-1 shrink-0 text-[var(--muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        size={16}
                    />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-base font-bold">{movement.movementName}</h2>
                            <Chip tone={movement.role === 'main' ? 'action' : 'neutral'}>{movement.role}</Chip>
                            <Chip tone={completedSets === totalSets ? 'success' : 'warning'}>
                                {completedSets}/{totalSets} sets
                            </Chip>
                        </div>
                        {movement.performedMovementId && movement.performedMovementId !== movement.movementId ? (
                            <p className="mt-1 text-xs text-[var(--warning)]">
                                Performed as {movement.performedMovementName}
                            </p>
                        ) : null}
                        <p className="mt-1 text-xs text-[var(--muted)]">{movement.targetSummary}</p>
                        {movement.previous ? (
                            <p className="mt-1 text-xs text-[var(--muted)]">{movement.previous.label}</p>
                        ) : null}
                    </div>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" className="h-9 w-9 px-0" title="Plate math">
                        <Calculator size={16} />
                    </Button>
                    <Button variant="ghost" className="h-9 w-9 px-0" title="Swap movement">
                        <Repeat2 size={16} />
                    </Button>
                    <Button variant="ghost" className="h-9 w-9 px-0" title="History">
                        <History size={16} />
                    </Button>
                </div>
            </div>
            {isOpen ? (
                <div id={contentId} className="space-y-2 border-t border-[var(--border)] p-3">
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
        <div className={`grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-lg border p-2 ${saveFailed ? 'border-red-500/40 bg-red-500/10' : set.completed ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--surface-2)]'}`}>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--surface)] text-xs font-bold">
                {set.setIndex}
            </div>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                    <span>
                        Target {set.targetLoad ?? '-'} x {set.targetReps ?? `${set.targetRepMin}-${set.targetRepMax}`}
                    </span>
                    {set.isTopSet ? <Chip tone="warning">Top set</Chip> : null}
                    {set.isBackoff ? <Chip>Back-off</Chip> : null}
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
                variant={saveFailed ? 'danger' : set.completed ? 'success' : 'secondary'}
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
            <span className="text-[9px] font-bold uppercase text-[var(--muted)]">{label}</span>
            <div className="grid grid-cols-[1.7rem_1fr_1.7rem] overflow-hidden rounded-md border border-[var(--border)]">
                <button
                    type="button"
                    className="bg-[var(--surface)] text-[var(--muted)]"
                    disabled={disabled}
                    onClick={() => onChange(Number(value) - step)}
                >
                    -
                </button>
                <input
                    type="number"
                    className="min-w-0 bg-[var(--surface-2)] px-1 py-1 text-center text-xs font-bold outline-none disabled:text-[var(--muted)]"
                    value={Number.isFinite(value) ? value : 0}
                    disabled={disabled}
                    onChange={(event) => onChange(Number(event.target.value))}
                />
                <button
                    type="button"
                    className="bg-[var(--surface)] text-[var(--muted)]"
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
            <span className="text-[9px] font-bold uppercase text-[var(--muted)]">RIR</span>
            <div className="mt-1 grid grid-cols-5 gap-1">
                {[0, 1, 2, 3, 4].map((item) => (
                    <button
                        key={item}
                        type="button"
                        className={`rounded-md border px-1 py-1 text-[10px] font-bold ${value === item
                                ? 'border-[var(--action)] bg-[var(--action)] text-white'
                                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]'
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

export function SessionProgress({ session }: { session: WorkoutSession }) {
    const progress = sessionCompletion(session)
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                <span>
                    {progress.completed} of {progress.total} sets
                </span>
                <span>{progress.percent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div className="h-full rounded-full bg-[var(--action)]" style={{ width: `${progress.percent}%` }} />
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
            <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Session notes</span>
            <TextInput value={value} onChange={(event) => onChange(event.target.value)} placeholder="Optional notes" />
        </label>
    )
}
