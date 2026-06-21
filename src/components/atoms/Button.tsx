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
    primary: { color: 'action', variant: 'filled' },
    secondary: {
        color: 'neutral',
        variant: 'light',
        className: 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]',
    },
    danger: { color: 'danger', variant: 'light', className: 'border border-red-900/40' },
    success: { color: 'success', variant: 'light', className: 'border border-emerald-700/40' },
    ghost: { color: 'neutral', variant: 'subtle', className: 'text-[var(--muted)] hover:text-[var(--text)]' },
}

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
    const config = variantConfig[variant]

    return (
        <MantineButton
            className={cn(
                'inline-flex min-h-10 items-center justify-center gap-2 text-sm font-bold transition active:scale-[0.99]',
                config.className,
                className,
            )}
            color={config.color}
            variant={config.variant}
            {...props}
        />
    )
}
