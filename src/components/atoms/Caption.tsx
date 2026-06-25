import { Text, type TextProps } from './Text'

/** Small, dimmed meta/caption text. Replaces tiny `text-xs`/`text-[11px]` dimmed labels. */
export function Caption({ size = 'xs', ...props }: TextProps) {
  return <Text size={size} tone="dimmed" {...props} />
}
