import { Box } from '@mantine/core'
import type { ReactNode } from 'react'
import { cn } from '~/lib/cn'

export function Page({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <Box component="main" className={cn('mx-auto w-full max-w-6xl px-4 py-5 md:px-6', className)}>
            {children}
        </Box>
    )
}
