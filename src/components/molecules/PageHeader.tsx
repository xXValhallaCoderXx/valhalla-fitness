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
                    <Text component="p" className="vf-section-label mb-1">
                        {eyebrow}
                    </Text>
                ) : null}
                <Title order={1} className="text-[18px] font-extrabold leading-tight tracking-tight md:text-lg">
                    {title}
                </Title>
                {children ? <Box className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--muted)] md:text-sm">{children}</Box> : null}
            </Box>
            {actions ? <Box className="flex items-center gap-2">{actions}</Box> : null}
        </Box>
    )
}
