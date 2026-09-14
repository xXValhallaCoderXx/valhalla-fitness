import { Box } from '@mantine/core'
import type { ReactNode } from 'react'
import { Heading, SectionLabel, Text } from '~/components/atoms'

/**
 * The v3 screen header: eyebrow, large title, subtitle, and an actions slot.
 *
 * Not `PageHeader` — that one hard-codes an h3-sized title and a bottom rule. The v3 comps want a
 * larger title, no rule, and an eyebrow that varies per screen (a date on Today, "Plan" on Plan).
 */
export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  'data-testid': testId,
}: {
  eyebrow?: ReactNode
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  'data-testid'?: string
}) {
  return (
    <Box
      component="header"
      data-testid={testId}
      className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="min-w-0">
        {eyebrow ? <SectionLabel>{eyebrow}</SectionLabel> : null}
        <Heading mt={2} order={1} size="h2" lh={1.05} lts="-0.6px">
          {title}
        </Heading>
        {subtitle ? (
          <Text component="div" mt={4} size="sm" tone="dimmed" lh={1.35}>
            {subtitle}
          </Text>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </Box>
  )
}
