import type {
  HistoryBestSet,
  HistoryMovementSummary,
  HistoryWeeklyVolume,
  RecentHistoryEntry,
} from '~/shared/types'

/**
 * Pure presentation helpers for the Insights (`/history`) page — grouping,
 * sorting, filtering, and chart geometry. Kept out of the component so they can
 * be unit-tested and reused across the Overview/Records/Movements/Sessions tabs.
 */

/** Mantine palette names (work as both `Badge color` and `var(--vf-<name>-…)`). */
export type AccentColor = 'action' | 'accent' | 'warning' | 'success' | 'danger' | 'neutral'

// ---------- Records grouping ----------

export type BestSetGroupKey = 'top' | 'volume' | 'accessory'
export type BestSetGroup = { key: BestSetGroupKey; title: string; items: HistoryBestSet[] }

const RECORD_GROUPS: Array<{ key: BestSetGroupKey; title: string; types: HistoryBestSet['type'][] }> = [
  { key: 'top', title: 'Top-set records', types: ['top_set', 'amrap'] },
  { key: 'volume', title: 'Volume records', types: ['volume'] },
  { key: 'accessory', title: 'Accessory bests', types: ['accessory'] },
]

/** Group best sets into Top-set / Volume / Accessory, dropping empty groups. */
export function groupBestSets(bestSets: HistoryBestSet[]): BestSetGroup[] {
  return RECORD_GROUPS.map((group) => ({
    key: group.key,
    title: group.title,
    items: bestSets.filter((set) => group.types.includes(set.type)),
  })).filter((group) => group.items.length > 0)
}

export function bestSetTagLabel(type: HistoryBestSet['type']): string {
  if (type === 'amrap') return 'AMRAP'
  if (type === 'top_set') return 'Top set'
  if (type === 'volume') return 'Volume'
  return 'Accessory'
}

export function bestSetAccent(type: HistoryBestSet['type']): AccentColor {
  if (type === 'amrap' || type === 'top_set') return 'action'
  if (type === 'volume') return 'accent'
  return 'warning'
}

// ---------- Movements table ----------

export type MovementSortKey = 'last' | 'volume' | 'e1rm' | 'sets'
export type SortDir = 'asc' | 'desc'

export function movementCategories(rows: HistoryMovementSummary[]): string[] {
  const set = new Set<string>()
  for (const row of rows) if (row.category) set.add(row.category)
  return Array.from(set).sort((left, right) => left.localeCompare(right))
}

export function filterMovements(
  rows: HistoryMovementSummary[],
  query: string,
  category: string | null,
): HistoryMovementSummary[] {
  const normalized = query.trim().toLowerCase()
  return rows.filter((row) => {
    if (category && row.category !== category) return false
    if (!normalized) return true
    return `${row.movementName} ${row.category}`.toLowerCase().includes(normalized)
  })
}

function movementSortValue(row: HistoryMovementSummary, key: MovementSortKey): number {
  if (key === 'last') return row.lastPerformedAt ? new Date(row.lastPerformedAt).getTime() : 0
  if (key === 'volume') return row.totalVolume ?? 0
  if (key === 'sets') return row.totalCompletedSets ?? 0
  return row.bestSet?.e1rm ?? 0
}

export function sortMovementSummaries(
  rows: HistoryMovementSummary[],
  key: MovementSortKey,
  dir: SortDir,
): HistoryMovementSummary[] {
  const factor = dir === 'asc' ? 1 : -1
  return [...rows].sort((left, right) => {
    const diff = movementSortValue(left, key) - movementSortValue(right, key)
    if (diff !== 0) return diff * factor
    return left.movementName.localeCompare(right.movementName)
  })
}

// ---------- Volume line chart geometry ----------

export type VolumePoint = { x: number; y: number; label: string; value: number }
export type VolumeSeries = {
  points: VolumePoint[]
  linePath: string
  areaPath: string
  total: number
  trendPercent: number | null
}

function roundCoord(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Scale weekly volumes into SVG coordinates for an area+line chart. Pure
 * geometry — handles 0/1 points and flat series without NaNs.
 */
export function buildVolumeSeries(
  weeks: HistoryWeeklyVolume[],
  opts: { width: number; height: number; paddingX?: number; paddingY?: number },
): VolumeSeries {
  const { width, height, paddingX = 0, paddingY = 0 } = opts
  const innerWidth = Math.max(0, width - paddingX * 2)
  const innerHeight = Math.max(0, height - paddingY * 2)
  const baseline = paddingY + innerHeight
  const values = weeks.map((week) => week.volume)
  const total = values.reduce((sum, value) => sum + value, 0)
  const maxValue = Math.max(...values, 1)

  const points: VolumePoint[] = weeks.map((week, index) => {
    const x =
      weeks.length <= 1 ? paddingX + innerWidth / 2 : paddingX + (index / (weeks.length - 1)) * innerWidth
    const y = baseline - (week.volume / maxValue) * innerHeight
    return { x: roundCoord(x), y: roundCoord(y), label: week.weekLabel, value: week.volume }
  })

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ')
  const areaPath = points.length
    ? `${linePath} L${points[points.length - 1].x} ${roundCoord(baseline)} L${points[0].x} ${roundCoord(baseline)} Z`
    : ''

  return { points, linePath, areaPath, total, trendPercent: computeTrend(values) }
}

function computeTrend(values: number[]): number | null {
  if (values.length < 2) return null
  const last = values[values.length - 1]
  const previous = values[values.length - 2]
  if (!previous) return null
  return ((last - previous) / previous) * 100
}

// ---------- Session intensity ----------

export type Intensity = NonNullable<RecentHistoryEntry['hardness']>

const INTENSITY_LEVELS: Intensity[] = ['Light', 'Medium', 'Hard', 'Deload']

/** Hardness-to-accent mapping shared with the Your Plan page styling. */
export function intensityColor(hardness?: RecentHistoryEntry['hardness']): AccentColor {
  if (hardness === 'Hard') return 'danger'
  if (hardness === 'Medium') return 'warning'
  if (hardness === 'Light') return 'success'
  if (hardness === 'Deload') return 'action'
  return 'neutral'
}

export function availableIntensities(sessions: RecentHistoryEntry[]): Intensity[] {
  const present = new Set(sessions.map((session) => session.hardness).filter(Boolean))
  return INTENSITY_LEVELS.filter((level) => present.has(level))
}

/** Sessions-tab filter: an intensity, everything, or ad-hoc workouts (which have no intensity). */
export type SessionFilter = Intensity | 'all' | 'adhoc'

export function hasAdHocSessions(sessions: RecentHistoryEntry[]): boolean {
  return sessions.some((session) => session.isAdHoc)
}

export function filterSessions(
  sessions: RecentHistoryEntry[],
  filter: SessionFilter,
  query = '',
): RecentHistoryEntry[] {
  const byKind =
    filter === 'all'
      ? sessions
      : filter === 'adhoc'
        ? sessions.filter((session) => session.isAdHoc)
        : sessions.filter((session) => session.hardness === filter)
  const text = query.trim().toLowerCase()
  if (!text) return byKind
  return byKind.filter((session) => session.title.toLowerCase().includes(text))
}
