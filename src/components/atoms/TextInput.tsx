import { TextInput as MantineTextInput } from '@mantine/core'
import type { InputHTMLAttributes } from 'react'
import { cn } from '~/lib/cn'

export type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>

export function TextInput({ className, ...props }: TextInputProps) {
    return (
        <MantineTextInput
            classNames={{
                input: cn(
                    'min-h-11 w-full rounded-[var(--radius-control)] !border !border-[var(--border)] !bg-[var(--surface-2)] px-3 text-sm font-medium !text-[var(--text)] outline-none transition placeholder:!text-[var(--muted)] focus:!border-[var(--action)]',
                    className,
                ),
            }}
            {...props}
        />
    )
}
