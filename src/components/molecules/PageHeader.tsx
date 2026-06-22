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
        <Box className="mb-4 flex flex-col gap-3 border-b border-[var(--mantine-color-default-border)] pb-3 sm:flex-row sm:items-end sm:justify-between">
            <Box className="min-w-0">
                {eyebrow ? (
                    <Text component="p" className="vf-section-label mb-1">
                        {eyebrow}
                    </Text>
                ) : null}
                <Title order={1} className="truncate text-[1.125rem] font-extrabold leading-tight md:text-[1.25rem]">
                    {title}
                </Title>
                {children ? (
                    <Text component="div" size="sm" c="dimmed" className="mt-1 max-w-3xl leading-snug">
                        {children}
                    </Text>
                ) : null}
            </Box>
            {actions ? <Box className="flex shrink-0 flex-wrap items-center gap-2">{actions}</Box> : null}
        </Box>
    )
}
