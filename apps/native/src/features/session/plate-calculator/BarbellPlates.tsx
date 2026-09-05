import { View } from 'react-native'
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg'
import type { Unit } from '@sheetless/domain/shared/types'
import { plateVisual } from '@sheetless/domain/session/plate-math'

const MAX_DIAMETER = 96
const PLATE_WIDTH = 15
const GAP = 3
const SHAFT_STUB = 20
const SLEEVE_TAIL = 22
const COLLAR_WIDTH = 8
const SLEEVE_HEIGHT = 11
const VIEWBOX_HEIGHT = MAX_DIAMETER + 18
const CENTER_Y = VIEWBOX_HEIGHT / 2

/** Native SVG rendering of one loaded barbell sleeve, heaviest plate nearest the collar. */
export function BarbellPlates({ perSide, units }: { perSide: number[]; units: Unit }) {
  const platesWidth = perSide.length
    ? perSide.length * PLATE_WIDTH + (perSide.length - 1) * GAP
    : 0
  const sleeveEnd = SHAFT_STUB + platesWidth + SLEEVE_TAIL
  const width = Math.max(96, sleeveEnd + COLLAR_WIDTH)
  const label = perSide.length
    ? `Barbell loaded per side: ${perSide.join(', ')} ${units}`
    : 'Empty barbell — just the bar'

  return (
    <View style={{ alignItems: 'center', height: 138, justifyContent: 'center', width: '100%' }}>
      <Svg
        accessible
        accessibilityLabel={label}
        height={138}
        preserveAspectRatio="xMidYMid meet"
        viewBox={`0 0 ${width} ${VIEWBOX_HEIGHT}`}
        width="100%"
      >
        <Rect
          x={0}
          y={CENTER_Y - SLEEVE_HEIGHT / 2}
          width={sleeveEnd}
          height={SLEEVE_HEIGHT}
          rx={3}
          fill="#9AA4AA"
          stroke="rgba(0, 0, 0, 0.35)"
          strokeWidth={1}
        />
        <Rect
          x={sleeveEnd}
          y={CENTER_Y - MAX_DIAMETER * 0.2}
          width={COLLAR_WIDTH}
          height={MAX_DIAMETER * 0.4}
          rx={2}
          fill="#7E8A91"
          stroke="rgba(0, 0, 0, 0.4)"
          strokeWidth={1}
        />
        {perSide.map((plate, index) => {
          const visual = plateVisual(plate, units)
          const diameter = visual.relativeDiameter * MAX_DIAMETER
          const x = SHAFT_STUB + index * (PLATE_WIDTH + GAP)
          const centerX = x + PLATE_WIDTH / 2
          return (
            <G key={`${plate}-${index}`}>
              <Rect
                x={x}
                y={CENTER_Y - diameter / 2}
                width={PLATE_WIDTH}
                height={diameter}
                rx={3}
                fill={visual.fill}
                stroke={visual.border}
                strokeWidth={1.5}
              />
              <SvgText
                x={centerX}
                y={CENTER_Y}
                fill={visual.textColor}
                fontSize={9}
                fontWeight="700"
                textAnchor="middle"
                alignmentBaseline="central"
                rotation={-90}
                origin={`${centerX}, ${CENTER_Y}`}
              >
                {plate}
              </SvgText>
            </G>
          )
        })}
      </Svg>
    </View>
  )
}
