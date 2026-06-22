import { Box } from '@mantine/core'
import type { ReactNode } from 'react'
import { cn } from '~/lib/cn'

export function Page({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <Box component="main" className={cn('mx-auto w-full max-w-[1180px] px-3 py-4 md:px-5 md:py-5 lg:px-6', className)}>
            {children}
        </Box>
    )
}
