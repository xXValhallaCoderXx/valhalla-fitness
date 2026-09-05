import { Fragment, useState } from 'react'
import { View, type LayoutChangeEvent } from 'react-native'
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg'
import { fontFamily, fontSizes, useTokens, type Tone } from '@/lib/tokens'
import { Caption } from '../Caption'
import { Button } from '../Button'
import { ChartSeries } from './ChartSeries'
import { ChartTouchTarget } from './ChartTouchTarget'
import {
  adjacentPointIndex,
  nearestPointIndex,
  domainFor,
  finiteCount,
  niceTicks,
  projectPoints,
  sampleAxisLabels,
  type ChartBox,
} from './chart-geometry'

export type TrendPoint = { label: string; value: number | null; x?: number; date?: string }

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
  inspectable?: boolean
  showPoints?: boolean
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
  inspectable = false,
  showPoints = false,
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
  const [selection, setSelection] = useState<{ signature: string; index: number } | null>(null)
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)

  const allValues = series.flatMap((item) => item.points.map((point) => point.value))
  const drawable = finiteCount(allValues)
  const labels = series[0]?.points.map((point) => point.label) ?? []
  const inspection = labels.map((_, index) => {
    const item = series.find((candidate) => Number.isFinite(candidate.points[index]?.value))
    const point = item?.points[index]
    return { ...point, value: point?.value ?? null, excluded: item?.mode === 'dots' }
  })
  const values = inspection.map((point) => point.value)
  const signature = JSON.stringify(series)
  const selectedIndex = selection?.signature === signature ? selection.index : adjacentPointIndex(values, null, 1)
  const selected = selectedIndex === null ? null : inspection[selectedIndex]
  const select = (index: number | null) => { if (index !== null) setSelection({ signature, index }) }
  const coordinates = series.flatMap((item) => item.points.flatMap((point) => point.x === undefined ? [] : [point.x]))
  const coordinateDomain = coordinates.length ? [Math.min(...coordinates), Math.max(...coordinates)] as const : undefined
  const xCoordinates = series[0]?.points.every((point) => point.x !== undefined)
    ? series[0].points.map((point) => point.x!) : undefined

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
  const tickYs = projectPoints(ticks, { ...box, padLeft: 0, padRight: 0 }, domain)
  const xLabelIndices = sampleAxisLabels(labels.length, coordinateDomain ? Math.min(2, maxXLabels) : maxXLabels)
  const projected = projectPoints(values, box, domain, xCoordinates, coordinateDomain)

  return (
    <View onLayout={onLayout} accessibilityLabel={accessibilityLabel} testID={testID}>
      {/* Nothing can be laid out until the first measurement lands. */}
      {width > 0 ? (
        <View style={{ height }}>
          <Svg width={width} height={height} accessible={false} pointerEvents="none">
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

            <ChartSeries series={series} box={box} domain={domain} coordinateDomain={coordinateDomain} showPoints={showPoints} />
            {inspectable && selectedIndex !== null && projected[selectedIndex]?.y != null ? (
              <Circle cx={projected[selectedIndex].x} cy={projected[selectedIndex].y!} r={6}
                fill="none" stroke={theme.text} strokeWidth={2} />
            ) : null}

            {xLabelIndices.map((index) => {
              const point = projectPoints(labels.map(() => 0), box, [0, 1], xCoordinates, coordinateDomain)[index]
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
          {inspectable ? <ChartTouchTarget onSelect={(x) => select(nearestPointIndex(projected, x))} /> : null}
        </View>
      ) : (
        <View style={{ height }} />
      )}
      {inspectable && selected?.value != null ? (
        <View style={{ gap: 8 }}>
          <View accessibilityLiveRegion="polite"><Caption>
            {selected.date ?? selected.label}: {formatValue(selected.value)}{selected.excluded ? ' · excluded outlier' : ''}
          </Caption></View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Previous" variant="default" accessibilityLabel={`${accessibilityLabel}: previous reading`}
              disabled={adjacentPointIndex(values, selectedIndex, -1) === selectedIndex}
              onPress={() => select(adjacentPointIndex(values, selectedIndex, -1))} />
            <Button label="Next" variant="default" accessibilityLabel={`${accessibilityLabel}: next reading`}
              disabled={adjacentPointIndex(values, selectedIndex, 1) === selectedIndex}
              onPress={() => select(adjacentPointIndex(values, selectedIndex, 1))} />
          </View>
        </View>
      ) : null}
    </View>
  )
}
