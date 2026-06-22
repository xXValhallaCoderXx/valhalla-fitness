import { Box, Card, Text, Title } from '@mantine/core'
import type { ReactNode } from 'react'

export function EmptyState({
    title,
    children,
    action,
}: {
    title: string
    children: ReactNode
    action?: ReactNode
}) {
    return (
        <Card className="flex min-h-64 flex-col items-center justify-center border-dashed bg-[var(--vf-surface-2)] p-6 text-center">
            <Title order={2} className="text-base font-extrabold md:text-lg">
                {title}
            </Title>
            <Text component="p" size="sm" c="dimmed" className="mt-2 max-w-md">
                {children}
            </Text>
            {action ? <Box className="mt-5">{action}</Box> : null}
        </Card>
    )
}
