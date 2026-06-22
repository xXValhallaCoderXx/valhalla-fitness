import { Button as MantineButton, type ButtonProps as MantineButtonProps } from '@mantine/core'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '~/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'

type NativeButtonProps = ComponentPropsWithoutRef<'button'>

export type ButtonProps = Omit<NativeButtonProps, 'color'> &
    Omit<MantineButtonProps, 'children' | 'className' | 'color' | 'variant'> & {
        variant?: ButtonVariant
    }

const variantConfig: Record<
    ButtonVariant,
    Pick<MantineButtonProps, 'color' | 'variant'> & { className?: string }
> = {
    primary: {
        color: 'action',
        variant: 'filled',
        className: '!bg-[var(--action)] !text-white shadow-sm hover:!bg-[var(--action-hover)]',
    },
    secondary: {
        color: 'neutral',
        variant: 'light',
        className:
            '!border !border-[var(--border)] !bg-[var(--surface-2)] !text-[var(--text)] hover:!bg-[var(--surface-3)]',
    },
    danger: {
        color: 'danger',
        variant: 'light',
        className:
            '!border !border-[var(--danger-border)] !bg-[var(--danger-soft)] !text-[var(--danger-text)] hover:!bg-[var(--danger-soft)]',
    },
    success: {
        color: 'success',
        variant: 'light',
        className:
            '!border !border-[var(--success-border)] !bg-[var(--success-soft)] !text-[var(--success-text)] hover:!bg-[var(--success-soft)]',
    },
    ghost: {
        color: 'neutral',
        variant: 'subtle',
        className: '!bg-transparent !text-[var(--muted)] hover:!bg-[var(--surface-2)] hover:!text-[var(--text)]',
    },
}

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
    const config = variantConfig[variant]

    return (
        <MantineButton
            className={cn(
                'inline-flex min-h-10 items-center justify-center gap-2.5 rounded-[var(--radius-control)] px-3 text-sm font-extrabold transition active:scale-[0.99]',
                config.className,
                className,
            )}
            color={config.color}
            variant={config.variant}
            {...props}
        />
    )
}
