import { Box, type BoxProps } from '@mantine/core'
import type { ReactNode } from 'react'
import markUrl from '~/assets/sheetless-mark.png'

type BrandMarkSize = 'xs' | 'sm' | 'md' | 'lg'

const sizes: Record<BrandMarkSize, { box: string; icon: number; radius: string }> = {
  xs: { box: '1.25rem', icon: 11, radius: '0.375rem' },
  sm: { box: '1.75rem', icon: 14, radius: '0.375rem' },
  md: { box: '2rem', icon: 16, radius: '0.5rem' },
  lg: { box: '3rem', icon: 22, radius: '0.625rem' },
}

export interface BrandMarkProps extends BoxProps {
  children?: ReactNode
  size?: BrandMarkSize
  withBorder?: boolean
  muted?: boolean
}

export function BrandMark({ children, size = 'sm', withBorder = false, muted = false, style, ...props }: BrandMarkProps) {
  const resolved = sizes[size]

  return (
    <Box
      component="span"
      bg={muted ? 'var(--vf-surface-2)' : 'var(--vf-brand-mark)'}
      c={muted ? 'dimmed' : 'var(--vf-brand-mark-text)'}
      className="inline-flex shrink-0 items-center justify-center"
      style={{
        width: resolved.box,
        height: resolved.box,
        borderRadius: resolved.radius,
        border: withBorder ? '1px solid var(--mantine-color-default-border)' : undefined,
        ...style,
      }}
      {...props}
    >
      {children ?? (
        <Box
          component="span"
          aria-hidden="true"
          bg="currentColor"
          style={{
            width: resolved.icon,
            height: resolved.icon,
            mask: `url(${markUrl}) center / contain no-repeat`,
            WebkitMask: `url(${markUrl}) center / contain no-repeat`,
          }}
        />
      )}
    </Box>
  )
}
