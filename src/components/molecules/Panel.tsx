import { Paper, type PaperProps, type ElementProps } from '@mantine/core'

export interface PanelProps extends PaperProps, ElementProps<'div', keyof PaperProps> {
  surface?: 'panel' | 'inset'
}

/**
 * Themed surface. `panel` (default) is an elevated card; `inset` is a recessed
 * surface. Replaces the `vf-panel` / `vf-inset` utility classes and ad-hoc
 * `bg-[var(--vf-surface-2)]` cards.
 */
export function Panel({ surface = 'panel', style, ...props }: PanelProps) {
  const inset = surface === 'inset'
  return (
    <Paper
      radius={inset ? 'md' : 'lg'}
      withBorder
      style={{
        backgroundColor: inset ? 'var(--vf-surface-2)' : 'var(--mantine-color-default)',
        borderColor: inset ? 'var(--mantine-color-default-border)' : 'var(--vf-card-border)',
        boxShadow: inset ? undefined : 'var(--vf-shadow-card)',
        ...style,
      }}
      {...props}
    />
  )
}
