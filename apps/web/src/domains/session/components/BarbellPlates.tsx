import type { Unit } from '~/shared/types'
import { plateVisual } from '~/domains/session/lib/plate-math'

// viewBox geometry (unitless — the SVG renders at DISPLAY_HEIGHT px and scales down to fit narrow screens).
const MAX_DIAMETER = 96
const PLATE_W = 15
const GAP = 3
const SHAFT_STUB = 20 // bar shaft on the centre side, left of the first plate
const SLEEVE_TAIL = 22 // sleeve beyond the last plate
const COLLAR_W = 8
const SLEEVE_H = 11
const H = MAX_DIAMETER + 18
const CY = H / 2
/** Fixed on-screen height so the graphic never stretches to fill the modal; width follows the ratio. */
const DISPLAY_HEIGHT = 138

/**
 * A loaded barbell sleeve drawn as an SVG: heaviest plate nearest the collar (matching `perSide`'s
 * heaviest-first order and how a bar is actually loaded), each plate coloured to the Olympic/IWF
 * standard and sized by weight. Presentational and pure — no browser APIs, SSR-safe.
 */
export function BarbellPlates({ perSide, units }: { perSide: number[]; units: Unit }) {
  const platesWidth = perSide.length ? perSide.length * PLATE_W + (perSide.length - 1) * GAP : 0
  const sleeveEnd = SHAFT_STUB + platesWidth + SLEEVE_TAIL
  const width = sleeveEnd + COLLAR_W

  const label = perSide.length ? `Barbell loaded per side: ${perSide.join(', ')} ${units}` : 'Empty barbell — just the bar'

  return (
    <svg
      role="img"
      aria-label={label}
      data-testid="barbell-plates"
      viewBox={`0 0 ${width} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ height: DISPLAY_HEIGHT, maxWidth: '100%', display: 'block', margin: '0 auto' }}
    >
      {/* Sleeve/shaft running the full length, behind the plates. */}
      <rect
        x={0}
        y={CY - SLEEVE_H / 2}
        width={sleeveEnd}
        height={SLEEVE_H}
        rx={3}
        fill="var(--vf-surface-3)"
        stroke="var(--mantine-color-default-border)"
        strokeWidth={1}
      />
      {/* Spring collar clamping the plates on. */}
      <rect
        x={sleeveEnd}
        y={CY - MAX_DIAMETER * 0.2}
        width={COLLAR_W}
        height={MAX_DIAMETER * 0.4}
        rx={2}
        fill="var(--vf-surface-3)"
        stroke="var(--mantine-color-default-border)"
        strokeWidth={1}
      />

      {perSide.map((plate, index) => {
        const visual = plateVisual(plate, units)
        const diameter = visual.relativeDiameter * MAX_DIAMETER
        const x = SHAFT_STUB + index * (PLATE_W + GAP)
        const cx = x + PLATE_W / 2
        return (
          <g key={`${plate}-${index}`} data-testid="plate-disc">
            <rect
              x={x}
              y={CY - diameter / 2}
              width={PLATE_W}
              height={diameter}
              rx={3}
              fill={visual.fill}
              stroke={visual.border}
              strokeWidth={1.5}
            />
            <text
              x={cx}
              y={CY}
              fill={visual.textColor}
              fontSize={9}
              fontWeight={700}
              textAnchor="middle"
              dominantBaseline="central"
              transform={`rotate(-90 ${cx} ${CY})`}
            >
              {plate}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
