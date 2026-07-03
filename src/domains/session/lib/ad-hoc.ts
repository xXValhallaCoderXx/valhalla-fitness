import type { FavoriteWorkout, MovementRole, MovementSlot, PlannedSession, SetLog, Unit, WorkoutSession } from '~/shared/types'

/** Sentinel template id stored in ad-hoc prescription snapshots. */
export const AD_HOC_TEMPLATE_ID = 'ad_hoc'
export const DEFAULT_AD_HOC_TITLE = 'Ad-hoc workout'
export const AD_HOC_PROGRAM_TITLE = 'Ad hoc'
export const AD_HOC_BADGE_LABEL = 'Ad hoc'
export const AD_HOC_TARGET_SUMMARY = 'Ad hoc'
export const AD_HOC_DEFAULT_SET_COUNT = 3
export const AD_HOC_TITLE_MAX_LENGTH = 60

export function normalizeAdHocTitle(value: string | null | undefined): string | null {
  const title = value?.trim()
  if (!title) return null
  return title.slice(0, AD_HOC_TITLE_MAX_LENGTH)
}

/**
 * A valid PlannedSession for a session that has no programme behind it. Plan-only fields get
 * neutral sentinels; `kind: 'ad_hoc'` and null hardness are what downstream UI branches on.
 */
export function buildAdHocSnapshot(input: {
  title?: string | null
  scheduledDate: string
  units: Unit
  rounding: number
  movements?: MovementSlot[]
}): PlannedSession {
  return {
    id: 'ad-hoc',
    templateSessionId: 'ad-hoc',
    kind: 'ad_hoc',
    title: normalizeAdHocTitle(input.title) ?? DEFAULT_AD_HOC_TITLE,
    programTitle: AD_HOC_PROGRAM_TITLE,
    templateId: AD_HOC_TEMPLATE_ID,
    weekIndex: 0,
    weekLabel: '',
    hardness: null,
    scheduledDate: input.scheduledDate,
    estimatedMinutes: 0,
    units: input.units,
    rounding: input.rounding,
    movements: input.movements ?? [],
  }
}

function buildAdHocSets(setCount: number): SetLog[] {
  return Array.from({ length: Math.max(1, setCount) }, (_, index) => ({
    id: `set-${index + 1}`,
    setIndex: index + 1,
    targetLoad: null,
    targetReps: null,
    targetRepMin: null,
    targetRepMax: null,
    targetRir: null,
    targetRpe: null,
    isTopSet: false,
    isAmrap: false,
    isBackoff: false,
    actualLoad: null,
    actualReps: null,
    completed: false,
  }))
}

export function buildAdHocMovementSlot(input: {
  slotId: string
  movementId: string
  movementName: string
  role: MovementRole
  orderIndex: number
  setCount: number
}): MovementSlot {
  return {
    id: input.slotId,
    slotId: input.slotId,
    phaseKey: AD_HOC_TEMPLATE_ID,
    movementId: input.movementId,
    movementName: input.movementName,
    performedMovementId: input.movementId,
    performedMovementName: input.movementName,
    role: input.role,
    orderIndex: input.orderIndex,
    targetSummary: AD_HOC_TARGET_SUMMARY,
    progressionRuleId: null,
    progressionMethod: null,
    sets: buildAdHocSets(input.setCount),
    previous: null,
    notes: null,
    isAdded: true,
  }
}

function sanitizeSlotPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-')
}

export function nextAdHocSlotId(usedSlotIds: Set<string>, movementId: string): string {
  let index = Array.from(usedSlotIds).filter((slotId) => slotId.startsWith('adhoc-')).length + 1
  while (true) {
    const slotId = `adhoc-${index}-${sanitizeSlotPart(movementId)}`
    if (!usedSlotIds.has(slotId)) return slotId
    index += 1
  }
}

/**
 * Movement slots for repeating a past workout: same movements (as performed), same roles and
 * order, fresh empty sets sized to what was actually completed last time. Targets stay null —
 * loads/reps re-seed from the freshly computed previous comparables instead.
 */
export function seedMovementsFromSource(source: WorkoutSession): MovementSlot[] {
  const usedSlotIds = new Set<string>()
  return source.movements
    .slice()
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map((movement, index) => {
      const movementId = movement.performedMovementId ?? movement.movementId
      const movementName = movement.performedMovementName ?? movement.movementName
      const completedSetCount = movement.sets.filter((set) => set.completed).length
      const slotId = nextAdHocSlotId(usedSlotIds, movementId)
      usedSlotIds.add(slotId)
      return buildAdHocMovementSlot({
        slotId,
        movementId,
        movementName,
        role: movement.role,
        orderIndex: index,
        setCount: completedSetCount || movement.sets.length || 1,
      })
    })
}

export function favoriteWorkoutFromRow(row: {
  id: string
  completed_at?: string | null
  prescription_snapshot?: PlannedSession | null
}): FavoriteWorkout {
  const movements = (row.prescription_snapshot?.movements ?? [])
    .slice()
    .sort((left, right) => left.orderIndex - right.orderIndex)
  return {
    sessionId: row.id,
    title: row.prescription_snapshot?.title ?? DEFAULT_AD_HOC_TITLE,
    movementNames: movements.map((movement) => movement.performedMovementName ?? movement.movementName),
    movementCount: movements.length,
    setCount: movements.reduce((total, movement) => total + movement.sets.length, 0),
    completedAt: row.completed_at ?? null,
  }
}
