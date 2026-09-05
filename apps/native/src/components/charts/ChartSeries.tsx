import { Fragment } from 'react'
import { Circle, Path } from 'react-native-svg'
import { toneColor, useTokens } from '@/lib/tokens'
import { areaPath, isolatedPointIndices, polylinePath, projectPoints, type ChartBox, type ChartDomain } from './chart-geometry'
import type { TrendSeries } from './TrendChart'

export function ChartSeries({ series, box, domain, coordinateDomain, showPoints }: {
  series: TrendSeries[]
  box: ChartBox
  domain: ChartDomain
  coordinateDomain?: ChartDomain
  showPoints: boolean
}) {
  const { theme } = useTokens()
  return series.map((item) => {
    const points = projectPoints(item.points.map((point) => point.value), box, domain,
      item.points.every((point) => point.x !== undefined) ? item.points.map((point) => point.x!) : undefined,
      coordinateDomain)
    const color = toneColor(theme, item.tone) ?? theme.text
    const mode = item.mode ?? 'line'
    const isolated = isolatedPointIndices(points)
    return (
      <Fragment key={item.key}>
        {mode === 'area' ? <Path d={areaPath(points, box.height - box.padBottom)} fill={color} fillOpacity={item.fillOpacity ?? 0.18} /> : null}
        {mode !== 'dots' ? <Path d={polylinePath(points)} stroke={color} strokeWidth={2} fill="none" /> : null}
        {points.map((point, index) => point.y === null || !(showPoints || mode === 'dots' || isolated.includes(index)) ? null : (
          <Circle key={index} cx={point.x} cy={point.y} r={3.5}
            fill={mode === 'dots' ? theme.background : color} stroke={color} strokeWidth={1.5} />
        ))}
      </Fragment>
    )
  })
}
