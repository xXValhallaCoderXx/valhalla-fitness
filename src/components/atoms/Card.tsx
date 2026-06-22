import { Card as MantineCard, type CardProps as MantineCardProps } from '@mantine/core'
import { cn } from '~/lib/cn'

export type CardProps = MantineCardProps

export function Card({ children, className, ...props }: CardProps) {
    return (
        <MantineCard
            withBorder
            className={cn(
                'rounded-[var(--radius-card)] !border-[var(--border)] !bg-[var(--surface)] p-4 !text-[var(--text)] shadow-[var(--shadow-card)]',
                className,
            )}
            {...props}
        >
            {children}
        </MantineCard>
    )
}
