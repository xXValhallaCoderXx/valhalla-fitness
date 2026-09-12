import { Paper, type PaperProps, type ElementProps } from '@mantine/core'

export interface PanelProps extends PaperProps, ElementProps<'div', keyof PaperProps> {
  surface?: 'panel' | 'inset'
}

/**
 * Themed surface. `panel` (default) is the standard card; `inset` is a recessed surface.
 * Both are flat — depth is carried by the border, and shadows are reserved for things that
 * genuinely float (modals, menus, the rest-timer pill).
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
        ...style,
      }}
      {...props}
    />
  )
}
