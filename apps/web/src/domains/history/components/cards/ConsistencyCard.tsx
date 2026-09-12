import type { ConsistencySummary } from '~/domains/history'
import { consistencyExplanation } from '~/domains/history/lib/consistency'
import { Caption, InfoHint, Panel, SectionLabel, StatValue, Text } from '~/components'
import { formatNumber } from '../insight-format'
import { useExperienceMode } from '~/domains/account/components'
import { CONSISTENCY_MIN_WEEKS } from '~/domains/history/lib/insight-gates'
import { insightCardLabel } from '~/domains/history/lib/insight-labels'

export function ConsistencyCard({ consistency }: { consistency: ConsistencySummary }) {
  const { mode } = useExperienceMode()
  const enoughHistory = consistency.totalWeeks >= CONSISTENCY_MIN_WEEKS

  return (
    <Panel p="md">
      <span className="inline-flex items-center gap-1">
        <SectionLabel>{insightCardLabel('consistency', mode)}</SectionLabel>
        <InfoHint label="About this metric">{consistencyExplanation}</InfoHint>
      </span>
      <div className="mt-1 flex items-end gap-2">
        <StatValue size="xl">
          {consistency.avgSessionsPerWeek === null ? '—' : formatNumber(consistency.avgSessionsPerWeek)}
        </StatValue>
        <Caption mb={4}>sessions / week</Caption>
      </div>

      {enoughHistory ? (
        <div className="mt-3 space-y-2">
          <Row label="Longest streak" value={`${consistency.longestStreakWeeks}w`} />
          <Row
            label="Current streak"
            value={`${consistency.currentStreakWeeks}w`}
            tone={consistency.currentStreakWeeks > 0 ? 'success' : 'dimmed'}
          />
          <Row
            label="Weeks trained"
            value={
              consistency.percentWeeksTrained === null
                ? `${consistency.weeksTrained} of ${consistency.totalWeeks}`
                : `${consistency.weeksTrained} of ${consistency.totalWeeks} (${consistency.percentWeeksTrained}%)`
            }
          />
        </div>
      ) : (
        <Caption mt="sm">Your consistency picture builds over your first few weeks.</Caption>
      )}
    </Panel>
  )
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'dimmed' }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Text size="sm" tone="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={800} tone={tone}>
        {value}
      </Text>
    </div>
  )
}
