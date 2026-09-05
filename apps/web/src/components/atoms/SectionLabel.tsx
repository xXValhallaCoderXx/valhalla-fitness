import { Text, type TextProps } from './Text'

/** Uppercase, dimmed, bold eyebrow label. Replaces the `vf-section-label` class. */
export function SectionLabel({ style, ...props }: TextProps) {
  return (
    <Text
      component="p"
      tone="dimmed"
      fw={800}
      tt="uppercase"
      size="0.625rem"
      style={{ letterSpacing: '0.08em', ...style }}
      {...props}
    />
  )
}
