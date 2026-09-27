/** Input position is relative to scroll content; viewport height excludes fixed page controls. */
export function focusedInputScrollOffset({ inputTop, inputHeight, viewportHeight, scrollOffset, padding }: {
  inputTop: number; inputHeight: number; viewportHeight: number; scrollOffset: number; padding: number
}): number | null {
  if (![inputTop, inputHeight, viewportHeight, scrollOffset, padding].every(Number.isFinite) ||
    inputHeight <= 0 || viewportHeight <= 0) return null
  const visibleTop = scrollOffset + padding
  const visibleBottom = scrollOffset + viewportHeight - padding
  let target: number
  if (inputTop < visibleTop || inputHeight > viewportHeight - padding * 2) {
    target = Math.max(0, inputTop - padding)
  } else if (inputTop + inputHeight > visibleBottom) {
    target = Math.max(0, inputTop + inputHeight - viewportHeight + padding)
  } else return null
  return Math.abs(target - scrollOffset) < 1 ? null : target
}
