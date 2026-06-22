import { Badge, type BadgeProps } from '@mantine/core'
import type { ReactNode } from 'react'
import { cn } from '~/lib/cn'

export type ChipTone = 'neutral' | 'action' | 'success' | 'warning' | 'danger'

export type ChipProps = Omit<BadgeProps, 'children' | 'color'> & {
    children: ReactNode
    tone?: ChipTone
}

const toneConfig: Record<ChipTone, { color: string; className: string }> = {
    neutral: {
        color: 'neutral',
        className: '!border-[var(--border)] !bg-[var(--surface-2)] !text-[var(--muted)]',
    },
    action: {
        color: 'action',
        className: '!border-[var(--action-border)] !bg-[var(--action-soft)] !text-[var(--action-text)]',
    },
    success: {
        color: 'success',
        className: '!border-[var(--success-border)] !bg-[var(--success-soft)] !text-[var(--success-text)]',
    },
    warning: {
        color: 'warning',
        className: '!border-[var(--warning-border)] !bg-[var(--warning-soft)] !text-[var(--warning-text)]',
    },
    danger: {
        color: 'danger',
        className: '!border-[var(--danger-border)] !bg-[var(--danger-soft)] !text-[var(--danger-text)]',
    },
}

export function Chip({ children, tone = 'neutral', className, ...props }: ChipProps) {
    const config = toneConfig[tone]

    return (
        <Badge
            component="span"
            radius="xl"
            size="xs"
            variant="light"
            color={config.color}
            className={cn(
                'inline-flex items-center rounded-full !border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider',
                config.className,
                className,
            )}
            {...props}
        >
            {children}
        </Badge>
    )
}
