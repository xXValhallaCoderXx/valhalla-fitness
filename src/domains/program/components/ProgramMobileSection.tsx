import { Badge, Card } from '@mantine/core'
import type { ReactNode } from 'react'
import { SectionLabel } from '~/components'

export function ProgramMobileSection({
  title,
  badge,
  children,
}: {
  title: string
  badge?: ReactNode
  children: ReactNode
}) {
  return (
    <Card component="details" p={0}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <SectionLabel>{title}</SectionLabel>
        {badge ? <Badge>{badge}</Badge> : null}
      </summary>
      <div className="border-t p-3">
        {children}
      </div>
    </Card>
  )
}
