import { Box, Text, Title } from '@mantine/core'
import type { ReactNode } from 'react'

export function PageHeader({
    title,
    eyebrow,
    actions,
    children,
}: {
    title: string
    eyebrow?: string
    actions?: ReactNode
    children?: ReactNode
}) {
    return (
        <Box className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <Box>
                {eyebrow ? (
                    <Text component="p" className="mb-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                        {eyebrow}
                    </Text>
                ) : null}
                <Title order={1} className="text-xl font-bold tracking-tight">
                    {title}
                </Title>
                {children ? <Box className="mt-1 text-sm text-[var(--muted)]">{children}</Box> : null}
            </Box>
            {actions ? <Box className="flex items-center gap-2">{actions}</Box> : null}
        </Box>
    )
}
