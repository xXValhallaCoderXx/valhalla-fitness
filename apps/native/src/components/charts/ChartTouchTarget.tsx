import { Pressable } from 'react-native'

/** Own the touch target so coordinates cannot be relative to an SVG child. */
export function ChartTouchTarget({ onSelect }: { onSelect: (x: number) => void }) {
  return <Pressable accessible={false} focusable={false}
    style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
    onPress={(event) => onSelect(event.nativeEvent.locationX)} />
}
