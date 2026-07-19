import { Box } from '@mantine/core'
import type { ReactNode } from 'react'
import { Heading, Text } from '~/components/atoms'
import { Panel } from './Panel'

export function EmptyState({
    title,
    children,
    action,
    centered = false,
}: {
    title: string
    children: ReactNode
    action?: ReactNode
    centered?: boolean
}) {
    const panel = (
        <Panel
            surface="inset"
            className="flex min-h-64 flex-col items-center justify-center border-dashed p-6 text-center"
        >
            <Heading order={2} size="h4">
                {title}
            </Heading>
            <Text component="p" size="sm" tone="dimmed" ta="center" className="mt-2 max-w-md">
                {children}
            </Text>
            {action ? <Box className="mt-5">{action}</Box> : null}
        </Panel>
    )

    if (centered) {
        return <div className="mx-auto mt-12 w-full max-w-lg">{panel}</div>
    }

    return panel
}
