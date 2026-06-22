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
        <Card className="flex min-h-64 flex-col items-center justify-center text-center">
            <Title order={2} className="text-lg font-extrabold">
                {title}
            </Title>
            <Text component="p" size="sm" c="dimmed" className="mt-2 max-w-md">
                {children}
            </Text>
            {action ? <Box className="mt-5">{action}</Box> : null}
        </Card>
    )
}
