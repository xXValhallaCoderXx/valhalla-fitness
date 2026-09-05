import { Title, type TitleProps, type ElementProps } from '@mantine/core'
import { toneColor, type Tone } from './tone'

export interface HeadingProps extends TitleProps, ElementProps<'h1', keyof TitleProps> {
  tone?: Tone
}

/** Section/page heading. Replaces ad-hoc `font-extrabold` titles. */
export function Heading({ tone, c, fw = 800, ...props }: HeadingProps) {
  return <Title c={c ?? toneColor(tone)} fw={fw} {...props} />
}
