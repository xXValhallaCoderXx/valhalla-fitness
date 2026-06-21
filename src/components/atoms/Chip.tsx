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
        className: 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]',
    },
    action: {
        color: 'action',
        className: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    },
    success: {
        color: 'success',
        className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    },
    warning: {
        color: 'warning',
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    },
    danger: {
        color: 'danger',
        className: 'border-red-500/30 bg-red-500/10 text-red-300',
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
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase',
                config.className,
                className,
            )}
            {...props}
        >
            {children}
        </Badge>
    )
}
