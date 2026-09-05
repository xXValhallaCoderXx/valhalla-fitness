/**
 * Pure geometry for the native charts: value domains, tick placement, and SVG
 * path strings. No react, no react-native-svg — every awkward case (a single
 * point, a flat series, gaps from nulls) is decided here so the components stay
 * declarative and this stays unit-testable.
 *
 * Values are the caller's units; a `null` value means "no data at this index"
 * and opens a gap rather than being drawn through.
 */

export type ChartBox = {
  width: number
  height: number
  padLeft: number
  padRight: number
  padTop: number
  padBottom: number
}

export type ChartDomain = readonly [min: number, max: number]

export type ProjectedPoint = { x: number; y: number | null }

const isFinite_ = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value)

/** How many points would actually be drawn. Two is the minimum for a line. */
export function finiteCount(values: ReadonlyArray<number | null>): number {
  return values.reduce<number>((total, value) => (isFinite_(value) ? total + 1 : total), 0)
}

/** Rounds a raw step up to the nearest 1, 2, 2.5, 5, or 10 times a power of ten. */
function niceStep(rawStep: number): number {
  if (!isFinite_(rawStep) || rawStep <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  const stepped = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10
  return stepped * magnitude
}

/**
 * Gridline values inside [min, max], on human-readable increments. A flat range
 * yields the single value — a chart of one number has one line, not a fake axis.
 */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!isFinite_(min) || !isFinite_(max)) return []
  if (min === max) return [min]
  const [low, high] = min < max ? [min, max] : [max, min]
  const step = niceStep((high - low) / Math.max(1, count))
  const ticks: number[] = []
  // Accumulating `start + i * step` avoids the drift of repeated addition.
  const start = Math.ceil(low / step) * step
  for (let index = 0; ; index += 1) {
    const tick = start + index * step
    // Snap away binary-float dust so 0.30000000000000004 prints as 0.3.
    const snapped = Number(tick.toPrecision(12))
    if (snapped > high) break
    ticks.push(snapped)
    if (ticks.length > 64) break
  }
  return ticks
}

/**
 * The value range to plot. A flat or single-point series is padded so it draws
 * through the middle instead of collapsing onto an edge or dividing by zero.
 */
export function domainFor(
  values: ReadonlyArray<number | null>,
  options: { includeZero?: boolean; padPercent?: number } = {},
): ChartDomain {
  const finite = values.filter(isFinite_)
  if (!finite.length) return [0, 1]

  let min = Math.min(...finite)
  let max = Math.max(...finite)
  if (options.includeZero) {
    min = Math.min(0, min)
    max = Math.max(0, max)
  }

  if (min === max) {
    const pad = Math.abs(min) > 0 ? Math.abs(min) * 0.1 : 1
    return [min - pad, max + pad]
  }

  const pad = (max - min) * (options.padPercent ?? 0)
  return [min - pad, max + pad]
}

/**
 * Maps values onto pixel coordinates inside the box's plot area. Points are
 * spread evenly by index; a lone point is centred rather than pinned left.
 */
export function projectPoints(
  values: ReadonlyArray<number | null>,
  box: ChartBox,
  domain: ChartDomain,
  coordinates?: ReadonlyArray<number>,
  coordinateDomain?: ChartDomain,
): ProjectedPoint[] {
  const plotWidth = Math.max(0, box.width - box.padLeft - box.padRight)
  const plotHeight = Math.max(0, box.height - box.padTop - box.padBottom)
  const [min, max] = domain
  const span = max - min
  const dated = coordinates?.length === values.length && coordinates.every(Number.isFinite)
  const xMin = dated ? (coordinateDomain?.[0] ?? Math.min(...coordinates)) : 0
  const xMax = dated ? (coordinateDomain?.[1] ?? Math.max(...coordinates)) : values.length - 1

  return values.map((value, index) => {
    const x =
      xMax === xMin
        ? box.padLeft + plotWidth / 2
        : box.padLeft + plotWidth * ((dated ? coordinates[index] : index) - xMin) / (xMax - xMin)
    if (!isFinite_(value)) return { x, y: null }
    // A zero span would divide by zero; centre it instead.
    const ratio = span === 0 ? 0.5 : (value - min) / span
    return { x, y: box.padTop + plotHeight * (1 - ratio) }
  })
}

/** Every isolated point needs a marker, even with other runs in the series. */
export function isolatedPointIndices(points: ReadonlyArray<ProjectedPoint>): number[] {
  return points.flatMap((point, index) => point.y !== null &&
    (index === 0 || points[index - 1].y === null) &&
    (index === points.length - 1 || points[index + 1].y === null) ? [index] : [])
}

export function nearestPointIndex(points: ReadonlyArray<ProjectedPoint>, x: number): number | null {
  let best: number | null = null
  let distance = Infinity
  points.forEach((point, index) => {
    if (point.y !== null && Math.abs(point.x - x) < distance) {
      best = index
      distance = Math.abs(point.x - x)
    }
  })
  return best
}

/** Move among actual readings, skipping gaps; null selection starts at the latest. */
export function adjacentPointIndex(values: ReadonlyArray<number | null>, selected: number | null, direction: -1 | 1): number | null {
  const indices = values.flatMap((value, index) => isFinite_(value) ? [index] : [])
  if (!indices.length) return null
  const position = selected === null ? -1 : indices.indexOf(selected)
  if (position < 0) return indices[indices.length - 1]
  return indices[Math.max(0, Math.min(indices.length - 1, position + direction))]
}

/** Splits on nulls so a gap in the data is a gap in the line. */
function contiguousRuns(points: ReadonlyArray<ProjectedPoint>): Array<Array<{ x: number; y: number }>> {
  const runs: Array<Array<{ x: number; y: number }>> = []
  let run: Array<{ x: number; y: number }> = []
  for (const point of points) {
    if (point.y === null) {
      if (run.length) runs.push(run)
      run = []
      continue
    }
    run.push({ x: point.x, y: point.y })
  }
  if (run.length) runs.push(run)
  return runs
}

const round = (value: number) => Number(value.toFixed(2))

/**
 * Stroke path. Runs of one point emit a bare `M`, which draws nothing — the
 * caller renders those as dots so a single reading is still visible.
 */
export function polylinePath(points: ReadonlyArray<ProjectedPoint>): string {
  return contiguousRuns(points)
    .map((run) =>
      run
        .map((point, index) => `${index === 0 ? 'M' : 'L'}${round(point.x)} ${round(point.y)}`)
        .join(' '),
    )
    .join(' ')
    .trim()
}

/** Filled path, closed down to `baselineY`. One run per contiguous stretch. */
export function areaPath(points: ReadonlyArray<ProjectedPoint>, baselineY: number): string {
  return contiguousRuns(points)
    .filter((run) => run.length > 1)
    .map((run) => {
      const line = run.map((point) => `L${round(point.x)} ${round(point.y)}`).join(' ')
      return `M${round(run[0].x)} ${round(baselineY)} ${line} L${round(run[run.length - 1].x)} ${round(baselineY)} Z`
    })
    .join(' ')
    .trim()
}

/**
 * Which x-axis indices to label, always including the first and last, so a long
 * series does not overprint itself.
 */
export function sampleAxisLabels(count: number, maxLabels: number): number[] {
  if (count <= 0 || maxLabels <= 0) return []
  if (count === 1) return [0]
  if (maxLabels === 1) return [count - 1]
  if (count <= maxLabels) return Array.from({ length: count }, (_, index) => index)
  const step = (count - 1) / (maxLabels - 1)
  const indices = Array.from({ length: maxLabels }, (_, index) => Math.round(index * step))
  return Array.from(new Set(indices)).sort((left, right) => left - right)
}
