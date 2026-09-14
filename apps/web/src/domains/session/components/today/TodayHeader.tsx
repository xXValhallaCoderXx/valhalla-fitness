import type { ReactNode } from 'react'
import { formatWeekdayLongDate } from '@sheetless/domain/shared/dates'
import { ScreenHeader } from '~/components'

/** Today's header — the shared v3 screen header with the date as its eyebrow. */
export function TodayHeader({
  scheduledDate,
  subtitle,
  actions,
}: {
  scheduledDate?: string | null
  subtitle?: string | null
  actions?: ReactNode
}) {
  return (
    <ScreenHeader
      data-testid="today-header"
      eyebrow={formatWeekdayLongDate(scheduledDate)}
      title="Today"
      subtitle={subtitle}
      actions={actions}
    />
  )
}
