import type { ProgramInstance, TemplateDefinition } from '@sheetless/domain/program/types'

/**
 * Where a programme is inside its current week.
 *
 * `ProgramInstance.currentWeekIndex` is misleadingly named: it counts completed *sessions* across
 * the whole programme, not weeks. Everything here is that one counter projected two ways — modulo
 * `daysPerWeek` for the position in the week, divided by it for the week itself.
 */
export function sessionIndexInWeek(currentSessionIndex: number, daysPerWeek: number): number {
  if (!Number.isFinite(currentSessionIndex) || daysPerWeek <= 0) return 0
  return ((currentSessionIndex % daysPerWeek) + daysPerWeek) % daysPerWeek
}

export type TodayWeekSessionStatus = 'done' | 'next' | 'upcoming'

export type TodayWeekSession = {
  id: string
  title: string
  estimatedMinutes: number
  status: TodayWeekSessionStatus
  /** Global session index of this row, matching `ProgramSessionStamp.weekIndex`. */
  globalIndex: number
  /** Slots in the session — Plan's row meta ("6 movements · about 75 min"). */
  movementCount: number
  /**
   * Planned sets for this session in the *current* week. Prescriptions vary by week, so this is
   * only meaningful alongside the week it was built for.
   */
  setCount: number
}

export type TodayWeek = {
  /** 0-based index into `definition.weeks`. */
  weekIndex: number
  /** Global session index of this week's first session — how a logged workout is matched to a row. */
  firstGlobalIndex: number
  /** Whether this is the week the programme is actually on. */
  isCurrent: boolean
  /** 1-based. */
  weekNumber: number
  totalWeeks: number
  phaseLabel: string | null
  /** 1-based position of today's session within the week. */
  sessionNumber: number
  daysPerWeek: number
  /** Sessions of this week already finished — the numerator of "2 of 5 sessions done". */
  sessionsDone: number
  sessions: TodayWeekSession[]
}

/**
 * The "This week" model.
 *
 * The programme has no weekday schedule — `TemplateDefinition` carries `daysPerWeek` and nothing
 * else — so this is an ordered session list, not a calendar. Sessions before today's are done,
 * today's is next, the rest are upcoming.
 */
export function buildTodayWeek(
  program: Pick<ProgramInstance, 'currentWeekIndex'>,
  definition: TemplateDefinition,
  /** Look at another week of the current cycle; omit for the week the programme is on. */
  viewWeekIndex?: number,
): TodayWeek | null {
  const { daysPerWeek, durationWeeks } = definition
  if (daysPerWeek <= 0 || durationWeeks <= 0) return null

  const currentWeekIndex = Math.min(
    sessionIndexInWeek(Math.floor(program.currentWeekIndex / daysPerWeek), durationWeeks),
    durationWeeks - 1,
  )
  const weekIndex =
    viewWeekIndex === undefined
      ? currentWeekIndex
      : Math.min(Math.max(0, Math.trunc(viewWeekIndex)), durationWeeks - 1)
  const isCurrent = weekIndex === currentWeekIndex

  // A past week is finished, a future week has not started, and only the current one is partway
  // through. Repeat cycles mean the same week index recurs, so sessions are addressed from the
  // start of the cycle the programme is in rather than from the programme's very first session.
  const sessionsDone = isCurrent
    ? sessionIndexInWeek(program.currentWeekIndex, daysPerWeek)
    : weekIndex < currentWeekIndex
      ? daysPerWeek
      : 0
  const cycleLength = durationWeeks * daysPerWeek
  const cycleStart = Math.floor(program.currentWeekIndex / cycleLength) * cycleLength
  const firstGlobalIndex = cycleStart + weekIndex * daysPerWeek

  return {
    weekIndex,
    firstGlobalIndex,
    isCurrent,
    weekNumber: weekIndex + 1,
    totalWeeks: durationWeeks,
    phaseLabel: definition.weeks[weekIndex]?.phaseLabel ?? null,
    sessionNumber: sessionsDone + 1,
    daysPerWeek,
    sessionsDone,
    sessions: definition.sessions.slice(0, daysPerWeek).map((session, index) => ({
      id: session.id,
      title: session.title,
      estimatedMinutes: session.estimatedMinutes,
      status:
        index < sessionsDone ? 'done' : isCurrent && index === sessionsDone ? 'next' : 'upcoming',
      movementCount: session.slots.length,
      setCount: session.slots.reduce(
        (total, slot) => total + (definition.weeks[weekIndex]?.prescriptions[slot.prescriptionId]?.sets.length ?? 0),
        0,
      ),
      /** Global session index, for matching this row to the workout that was logged against it. */
      globalIndex: firstGlobalIndex + index,
    })),
  }
}
