/** Native port of web FocusSetProgressBar: tappable per-set segments. */
import { Pressable, View } from 'react-native'
import type { MovementSlot } from '@sheetless/domain/session/types/session'
import { setSegments, type SetSegmentState } from '@sheetless/domain/session/live-focus-utils'
import { useTokens, type Theme } from '@/lib/tokens'

export function FocusSetProgressBar({
  movement,
  selectedSetIndex,
  onSelectSet,
}: {
  movement: MovementSlot
  selectedSetIndex: number
  onSelectSet: (setIndex: number) => void
}) {
  const { theme } = useTokens()
  const segments = setSegments(movement, selectedSetIndex)
  return (
    <View accessibilityLabel="Set progress" style={{ flexDirection: 'row', gap: 6 }}>
      {segments.map((segment) => (
        <Pressable
          key={segment.setIndex}
          accessibilityLabel={`Set ${segment.setIndex}`}
          onPress={() => onSelectSet(segment.setIndex)}
          style={{ flex: 1, paddingVertical: 8 }}
        >
          <View
            style={{
              backgroundColor: segmentColor(theme, segment.state),
              borderRadius: 4,
              height: 8,
            }}
          />
        </Pressable>
      ))}
    </View>
  )
}

function segmentColor(theme: Theme, state: SetSegmentState): string {
  switch (state) {
    case 'complete':
      return theme.primaryFill
    case 'current':
      return theme.tones.action.border
    case 'failed':
      return theme.tones.danger.text
    default:
      // theme.border stays visible on both schemes; surfaceInset vanishes into the dark background.
      return theme.border
  }
}
