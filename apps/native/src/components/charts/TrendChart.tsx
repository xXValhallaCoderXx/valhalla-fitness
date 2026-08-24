import { Fragment, useState } from 'react'
import { View, type LayoutChangeEvent } from 'react-native'
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg'
import { fontFamily, fontSizes, toneColor, useTokens, type Tone } from '@/lib/tokens'
import { Caption } from '../Caption'
import {
  areaPath,
  domainFor,
  finiteCount,
  niceTicks,
  polylinePath,
  projectPoints,
  sampleAxisLabels,
  type ChartBox,
} from './chart-geometry'

export type TrendPoint = { label: string; value: number | null }

export type TrendSeries = {
  key: string
  points: TrendPoint[]
  /** Resolved through useTokens, so call sites never carry a colour. */
  tone: Tone
  /** dots draws markers only — used to overlay outliers on a line series. */
  mode?: 'line' | 'area' | 'dots'
  /** Area fill alpha; matches the web cards' 0.18 by default. */
  fillOpacity?: number
}

export interface TrendChartProps {
  series: TrendSeries[]
  height?: number
  /** Formats y-axis ticks. Keep it short — the labels reserve width by length. */
  formatValue?: (value: number) => string
  yTickCount?: number
  maxXLabels?: number
  /** Anchor the axis at zero. True for volume, false for e1RM and bodyweight. */
  includeZero?: boolean
  /** Shown instead of an axis when there is nothing to plot. */
  emptyMessage: string
  accessibilityLabel: string
  testID?: string
}

const AXIS_LABEL_HEIGHT = 16
const CHAR_WIDTH = 6.5

/**
 * The one chart engine: gridlines, a value axis, and any number of line, area,
 * or dot series over shared geometry. All the awkward cases live in
 * `chart-geometry.ts`; this only paints.
 */
export function TrendChart({
  series,
  height = 180,
  formatValue = (value) => String(Math.round(value)),
  yTickCount = 4,
  maxXLabels = 4,
  includeZero = false,
  emptyMessage,
  accessibilityLabel,
  testID,
}: TrendChartProps) {
  const { theme } = useTokens()
  // React Compiler is on: measured layout must be state, never a ref read
  // during render, or the chart never receives a width.
  const [width, setWidth] = useState(0)
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)

  const allValues = series.flatMap((item) => item.points.map((point) => point.value))
  const drawable = finiteCount(allValues)
  const labels = series[0]?.points.map((point) => point.label) ?? []

  if (!drawable) {
    return (
      <View onLayout={onLayout} style={{ justifyContent: 'center', minHeight: height }} testID={testID}>
        <Caption>{emptyMessage}</Caption>
      </View>
    )
  }

  const domain = domainFor(allValues, { includeZero })
  const ticks = niceTicks(domain[0], domain[1], yTickCount)
  const tickLabels = ticks.map(formatValue)
  const padLeft = 8 + Math.max(...tickLabels.map((label) => label.length), 1) * CHAR_WIDTH
  const box: ChartBox = {
    width,
    height,
    padLeft,
    padRight: 6,
    padTop: 8,
    padBottom: AXIS_LABEL_HEIGHT + 6,
  }
  const baselineY = box.height - box.padBottom
  const tickYs = projectPoints(ticks, { ...box, padLeft: 0, padRight: 0 }, domain)
  const xLabelIndices = sampleAxisLabels(labels.length, maxXLabels)

  return (
    <View onLayout={onLayout} accessible accessibilityLabel={accessibilityLabel} testID={testID}>
      {/* Nothing can be laid out until the first measurement lands. */}
      {width > 0 ? (
        <Svg width={width} height={height}>
          {ticks.map((tick, index) => {
            const y = tickYs[index]?.y
            if (y === null || y === undefined) return null
            return (
              <Fragment key={`tick-${tick}`}>
                <Line
                  x1={box.padLeft}
                  x2={box.width - box.padRight}
                  y1={y}
                  y2={y}
                  stroke={theme.border}
                  strokeWidth={1}
                />
                <SvgText
                  x={box.padLeft - 5}
                  y={y + 3}
                  textAnchor="end"
                  fill={theme.textMuted}
                  fontFamily={fontFamily}
                  fontSize={fontSizes.caption}
                >
                  {tickLabels[index]}
                </SvgText>
              </Fragment>
            )
          })}

          {series.map((item) => {
            const points = projectPoints(
              item.points.map((point) => point.value),
              box,
              domain,
            )
            const color = toneColor(theme, item.tone) ?? theme.text
            const mode = item.mode ?? 'line'

            if (mode === 'dots') {
              return points.map((point, index) =>
                point.y === null ? null : (
                  <Circle
                    key={`${item.key}-dot-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={3.5}
                    // Hollow marker, matching the web outlier treatment.
                    fill={theme.background}
                    stroke={color}
                    strokeWidth={1.5}
                  />
                ),
              )
            }

            const stroke = (
              <Path
                key={`${item.key}-line`}
                d={polylinePath(points)}
                stroke={color}
                strokeWidth={2}
                fill="none"
              />
            )
            const lone =
              finiteCount(item.points.map((point) => point.value)) === 1
                ? points
                    .filter((point) => point.y !== null)
                    .map((point) => (
                      // A single reading has no line, so draw it or it vanishes.
                      <Circle key={`${item.key}-lone`} cx={point.x} cy={point.y!} r={3} fill={color} />
                    ))
                : null

            if (mode === 'area') {
              return (
                <Fragment key={item.key}>
                  <Path d={areaPath(points, baselineY)} fill={color} fillOpacity={item.fillOpacity ?? 0.18} />
                  {stroke}
                  {lone}
                </Fragment>
              )
            }
            return (
              <Fragment key={item.key}>
                {stroke}
                {lone}
              </Fragment>
            )
          })}

          {xLabelIndices.map((index) => {
            const point = projectPoints(labels.map(() => 0), box, [0, 1])[index]
            if (!point) return null
            const isFirst = index === 0
            const isLast = index === labels.length - 1
            return (
              <SvgText
                key={`x-${index}`}
                x={point.x}
                y={box.height - 4}
                textAnchor={isFirst ? 'start' : isLast ? 'end' : 'middle'}
                fill={theme.textMuted}
                fontFamily={fontFamily}
                fontSize={fontSizes.caption}
              >
                {labels[index]}
              </SvgText>
            )
          })}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
    </View>
  )
}
