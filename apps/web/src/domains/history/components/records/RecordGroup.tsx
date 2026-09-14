import type { BestSetGroup } from '~/domains/history/lib/insights'
import { bestSetAccent, bestSetTagLabel } from '~/domains/history/lib/insights'
import type { HistoryBestSet } from '~/domains/history'
import { useExperienceMode } from '~/domains/account/components'
import { formatDayMonth } from '~/shared/lib/dates'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import { ACCENT_TEXT, formatBestSetPrimary, formatNumber, hasDisplayE1rm } from '../insight-format'

/**
 * One group of records, as hairline rows.
 *
 * Rows rather than cards: these are comparable figures down a column, and a grid of bordered cards
 * made the eye work across three axes to compare two numbers. In Full each row selects itself so
 * the rail can show where its estimate came from.
 */
export function RecordGroup({
  group,
  selectedId,
  onSelect,
}: {
  group: BestSetGroup
  selectedId: string | null
  onSelect?: (set: HistoryBestSet) => void
}) {
  const { isFull } = useExperienceMode()

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <SectionLabel>{group.title}</SectionLabel>
        <span className="h-px flex-1" style={{ backgroundColor: 'var(--mantine-color-default-border)' }} />
        <Caption>{group.items.length}</Caption>
      </div>
      <Panel p={0} className="overflow-hidden">
        {group.items.map((set, index) => {
          const selected = set.id === selectedId
          // A bodyweight record has no load to derive an estimate from, so it has nothing to trace.
          const traceable = isFull && Boolean(onSelect) && set.load != null && set.load > 0
          const body = (
            <>
              <span className="flex min-w-0 flex-col">
                <Text component="span" size="sm" fw={800} truncate>{set.movementName}</Text>
                <Caption component="span" truncate>
                  {set.sessionTitle} · {formatDayMonth(set.performedAt)}
                </Caption>
              </span>
              <span className="flex shrink-0 items-baseline gap-3">
                <Caption component="span" fw={700} c={ACCENT_TEXT[bestSetAccent(set.type)]}>
                  {bestSetTagLabel(set.type)}
                </Caption>
                <Text component="span" size="sm" fw={800} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatBestSetPrimary(set)}
                </Text>
                {hasDisplayE1rm(set) ? (
                  <Caption component="span" fw={700} tone="action" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    e1RM {formatNumber(set.e1rm)}
                  </Caption>
                ) : null}
              </span>
            </>
          )

          const className = 'flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left'
          const style = {
            borderTop: index ? '1px solid var(--mantine-color-default-border)' : undefined,
            background: selected ? 'var(--vf-action-soft)' : undefined,
          }

          return traceable ? (
            <button
              key={set.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect?.(set)}
              className={`${className} vf-card-hover`}
              style={{ ...style, appearance: 'none', cursor: 'pointer' }}
            >
              {body}
            </button>
          ) : (
            <div key={set.id} className={className} style={style}>
              {body}
            </div>
          )
        })}
      </Panel>
    </div>
  )
}
