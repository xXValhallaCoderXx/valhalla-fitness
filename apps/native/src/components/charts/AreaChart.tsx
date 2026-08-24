import { TrendChart, type TrendChartProps, type TrendSeries } from './TrendChart'

export type AreaChartProps = Omit<TrendChartProps, 'series'> & {
  points: TrendSeries['points']
  tone?: TrendSeries['tone']
  fillOpacity?: number
}

/** Filled single series. Used for weekly volume, which reads as a quantity. */
export function AreaChart({ points, tone = 'action', fillOpacity, ...rest }: AreaChartProps) {
  return (
    <TrendChart
      {...rest}
      includeZero={rest.includeZero ?? true}
      series={[{ key: 'area', points, tone, mode: 'area', fillOpacity }]}
    />
  )
}
