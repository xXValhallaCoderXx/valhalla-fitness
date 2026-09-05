/** RN Web supplies a MouseEvent to onPress, which has no native locationX. */
export function ChartTouchTarget({ onSelect }: { onSelect: (x: number) => void }) {
  return <div aria-hidden="true"
    style={{ position: 'absolute', inset: 0, cursor: 'crosshair' }}
    onClick={(event) => onSelect(event.clientX - event.currentTarget.getBoundingClientRect().left)} />
}
