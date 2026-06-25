import { Box } from '@mantine/core'
import type { ReactNode } from 'react'
import { Heading, SectionLabel, Text } from '~/components/atoms'

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
        <Box
            className="mb-4 flex flex-col gap-3 pb-3 sm:flex-row sm:items-end sm:justify-between"
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
        >
            <Box className="min-w-0">
                {eyebrow ? <SectionLabel className="mb-1">{eyebrow}</SectionLabel> : null}
                <Heading order={1} size="h3" lh={1.2} className="truncate">
                    {title}
                </Heading>
                {children ? (
                    <Text component="div" size="sm" tone="dimmed" lh={1.35} className="mt-1 max-w-3xl">
                        {children}
                    </Text>
                ) : null}
            </Box>
            {actions ? <Box className="flex shrink-0 flex-wrap items-center gap-2">{actions}</Box> : null}
        </Box>
    )
}
