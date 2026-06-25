import { Text, type TextProps } from './Text'

/** Prominent numeric/stat value. Replaces `font-black`/`vf-stat-value`. */
export function StatValue({ style, size = 'lg', ...props }: TextProps) {
  return (
    <Text
      fw={900}
      lh={1.1}
      size={size}
      style={{ fontVariantNumeric: 'tabular-nums', ...style }}
      {...props}
    />
  )
}
