import { Box } from '@mantine/core'
import type { ReactNode } from 'react'
import { Heading, Text } from '~/components/atoms'
import { Panel } from './Panel'

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
        <Panel
            surface="inset"
            className="flex min-h-64 flex-col items-center justify-center border-dashed p-6 text-center"
        >
            <Heading order={2} size="h4">
                {title}
            </Heading>
            <Text component="p" size="sm" tone="dimmed" className="mt-2 max-w-md">
                {children}
            </Text>
            {action ? <Box className="mt-5">{action}</Box> : null}
        </Panel>
    )
}
