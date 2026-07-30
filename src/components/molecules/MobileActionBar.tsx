import { Box } from '@mantine/core'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '~/shared/lib/cn'

const MOBILE_BOTTOM_OFFSET =
  'var(--vf-mobile-bottom-offset, calc(4rem + env(safe-area-inset-bottom, 0px)))'

export function MobileActionBar({
  children,
  className,
  contentClassName,
  maxWidth = '1180px',
  'data-testid': dataTestId = 'route-action-bar',
}: {
  children: ReactNode
  className?: string
  contentClassName?: string
  maxWidth?: CSSProperties['maxWidth']
  'data-testid'?: string
}) {
  return (
    <Box
      data-testid={dataTestId}
      className={cn(
        'fixed inset-x-0 z-30 border-t p-3 backdrop-blur lg:hidden',
        className,
      )}
      style={{
        bottom: MOBILE_BOTTOM_OFFSET,
        paddingLeft: 'max(0.75rem, var(--vf-safe-left, 0px))',
        paddingRight: 'max(0.75rem, var(--vf-safe-right, 0px))',
        borderColor: 'var(--mantine-color-default-border)',
        backgroundColor:
          'color-mix(in srgb, var(--mantine-color-default) 96%, transparent)',
        boxShadow: '0 -12px 36px rgb(0 0 0 / 0.12)',
      }}
    >
      <div
        className={cn('mx-auto flex flex-col gap-2', contentClassName)}
        style={{ maxWidth }}
      >
        {children}
      </div>
    </Box>
  )
}
