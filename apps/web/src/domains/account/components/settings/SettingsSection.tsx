import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Caption, Heading, Text } from '~/components'

export function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  actions,
  children,
}: {
  id: string
  icon: LucideIcon
  title: string
  description: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--vf-action-soft)', border: '1px solid var(--vf-action-border)' }}
          >
            <Icon size={20} color="var(--vf-action-text)" />
          </div>
          <div className="min-w-0">
            <Heading order={2} size="h5">{title}</Heading>
            <Caption size="0.625rem">{description}</Caption>
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}

export function DataRow({
  icon: Icon,
  title,
  caption,
  action,
}: {
  icon: LucideIcon
  title: string
  caption: string
  action: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: 'var(--vf-surface-2)' }}
        >
          <Icon size={16} color="var(--mantine-color-dimmed)" />
        </div>
        <div className="min-w-0">
          <Text size="sm" fw={700}>{title}</Text>
          <Caption>{caption}</Caption>
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}
