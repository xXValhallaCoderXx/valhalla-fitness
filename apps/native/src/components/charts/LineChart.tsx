import { TrendChart, type TrendChartProps, type TrendSeries } from './TrendChart'

export type LineChartProps = Omit<TrendChartProps, 'series'> & {
  points: TrendSeries['points']
  tone?: TrendSeries['tone']
  /** Optional hollow markers over the line — outliers, excluded readings. */
  markers?: TrendSeries['points']
  markerTone?: TrendSeries['tone']
}

/** Single-series stroke. The default for e1RM, strength score, and bodyweight. */
export function LineChart({ points, tone = 'action', markers, markerTone = 'dimmed', ...rest }: LineChartProps) {
  return (
    <TrendChart
      {...rest}
      series={[
        { key: 'line', points, tone, mode: 'line' },
        ...(markers ? [{ key: 'markers', points: markers, tone: markerTone, mode: 'dots' as const }] : []),
      ]}
    />
  )
}
