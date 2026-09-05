import { Text as MantineText, type TextProps as MantineTextProps, type ElementProps } from '@mantine/core'
import type { ElementType } from 'react'
import { toneColor, type Tone } from './tone'

export interface TextProps extends MantineTextProps, ElementProps<'p', keyof MantineTextProps> {
  tone?: Tone
  component?: ElementType
}

/**
 * App text primitive. Use `tone`, `fw`, `size`, `truncate`, etc. instead of
 * inline Tailwind typography/color utilities.
 */
export function Text({ tone, c, component, ...props }: TextProps) {
  return <MantineText component={component as any} c={c ?? toneColor(tone)} {...props} />
}
