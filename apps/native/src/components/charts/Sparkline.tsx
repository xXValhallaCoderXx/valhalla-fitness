import { TrendChart, type TrendChartProps, type TrendSeries } from './TrendChart'

export type SparklineProps = Pick<TrendChartProps, 'emptyMessage' | 'accessibilityLabel' | 'testID'> & {
  points: TrendSeries['points']
  tone?: TrendSeries['tone']
  height?: number
}

/** Axis-free miniature for inline use beside a headline number. */
export function Sparkline({ points, tone = 'action', height = 44, ...rest }: SparklineProps) {
  return (
    <TrendChart
      {...rest}
      height={height}
      // No gridlines and no labels: the number beside it carries the value.
      yTickCount={0}
      maxXLabels={0}
      series={[{ key: 'sparkline', points, tone, mode: 'line' }]}
    />
  )
}
