import { SegmentedControl } from '@mantine/core'
import { INSIGHT_RANGES, insightRangeLabels, type InsightRange } from '~/domains/history/lib/insight-ranges'

/**
 * Global range switch for the trend cards. Ranges wider than the logged
 * history render clamped-to-history data (never a fabricated axis), so every
 * option stays enabled. All-time stats ignore it by construction.
 */
export function InsightRangeSwitch({ value, onChange }: { value: InsightRange; onChange: (range: InsightRange) => void }) {
  return (
    <SegmentedControl
      size="xs"
      radius="md"
      value={value}
      onChange={(next) => onChange(next as InsightRange)}
      data={INSIGHT_RANGES.map((range) => ({ value: range, label: insightRangeLabels[range] }))}
      styles={{
        root: { backgroundColor: 'var(--vf-surface-2)', border: '1px solid var(--mantine-color-default-border)' },
        label: { fontWeight: 700 },
      }}
    />
  )
}
