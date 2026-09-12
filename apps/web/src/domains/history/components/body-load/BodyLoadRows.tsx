import {
  ADEQUACY_HIGH_SETS,
  adequacyTierLabels,
  type RegionAdequacy,
  type RegionDelta,
} from '~/domains/history/lib/muscle-volume'
import { bodyLoadTierLabels } from '~/domains/history/lib/body-load'
import type { BodyLoadRegion } from '~/domains/history'
import { Caption, StatValue, Text } from '~/components'
import { bodyLoadColor, toneForTier } from '../insight-format'
import { adequacyFill, adequacyTone } from './body-load-style'

const rowClass = 'flex w-full items-center gap-4 border-t py-3 text-left first:border-t-0'
const rowStyle = { borderColor: 'var(--mantine-color-default-border)' }

function Bar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--vf-surface-inset)' }}>
      <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
    </div>
  )
}

function FatigueCells({ region }: { region: BodyLoadRegion }) {
  return (
    <>
      <div className="w-28 shrink-0 sm:w-40">
        <Text fw={700} truncate>{region.label}</Text>
        {/* Never "N sets": the same set counts once for every muscle it touches, so these figures
            cannot be summed across regions. The normalized convention lives in the weekly view. */}
        <Caption mt={1}>Involved in {region.recentSetCount} set{region.recentSetCount === 1 ? '' : 's'}</Caption>
      </div>
      <div className="min-w-0 flex-1">
        <Bar percent={region.impactPercent} color={bodyLoadColor(region.tier)} />
        <Caption mt={1.5} truncate>{region.movementNames.length ? region.movementNames.join(', ') : 'No recent work'}</Caption>
      </div>
      <div className="w-16 shrink-0 text-right">
        <StatValue size="sm" tone={toneForTier(region.tier)}>{region.impactPercent}%</StatValue>
        <Caption size="0.625rem" fw={800} tone={toneForTier(region.tier)}>{bodyLoadTierLabels[region.tier]}</Caption>
      </div>
    </>
  )
}

/**
 * Selectable only in Full mode, where a click opens the trace.
 *
 * Two explicit branches rather than a polymorphic element: swapping the tag through a variable
 * loses the button's typed handler and leaves the div with a dangling `onClick`.
 */
export function FatigueRow({
  region,
  onSelect,
  selected,
}: {
  region: BodyLoadRegion
  onSelect?: (regionId: BodyLoadRegion['regionId']) => void
  selected?: boolean
}) {
  if (!onSelect) {
    return (
      <div className={rowClass} style={rowStyle}>
        <FatigueCells region={region} />
      </div>
    )
  }
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(region.regionId)}
      className={`${rowClass} rounded-sm px-1`}
      style={{
        ...rowStyle,
        background: selected ? 'var(--vf-action-soft)' : 'none',
        appearance: 'none',
        cursor: 'pointer',
      }}
    >
      <FatigueCells region={region} />
    </button>
  )
}

export function AdequacyRow({
  region,
  delta,
  showDelta,
}: {
  region: RegionAdequacy
  delta?: RegionDelta
  showDelta: boolean
}) {
  const barPercent = Math.min((region.weeklySets / ADEQUACY_HIGH_SETS) * 100, 100)
  return (
    <div className={rowClass} style={rowStyle}>
      <div className="w-28 shrink-0 sm:w-40">
        <Text fw={700} truncate>{region.label}</Text>
      </div>
      <div className="min-w-0 flex-1">
        <Bar percent={barPercent} color={adequacyFill(region.tier)} />
      </div>
      {showDelta ? (
        <div className="w-14 shrink-0 text-right">
          {/* Deliberately uncoloured: more sets is not automatically better, and fewer during a
              planned deload is correct. The sign says what happened; it makes no judgement. */}
          <Text
            size="sm"
            fw={800}
            tone="dimmed"
            style={{ fontVariantNumeric: 'tabular-nums' }}
            title={delta ? undefined : 'no sets in either week'}
          >
            {formatDelta(delta)}
          </Text>
        </div>
      ) : null}
      <div className="w-24 shrink-0 text-right">
        <StatValue size="sm" tone={adequacyTone(region.tier)}>{region.weeklySets}</StatValue>
        <Caption size="0.625rem" fw={800} tone={adequacyTone(region.tier)}>{adequacyTierLabels[region.tier]}</Caption>
      </div>
    </div>
  )
}

/**
 * "Unchanged" and "never trained" are different facts and must not share a glyph.
 *
 * `buildRegionDeltas` omits regions with no sets in either week, so an absent entry means
 * untrained — a dash. A present entry at zero really is no change, and says so with a number.
 */
function formatDelta(delta?: RegionDelta) {
  if (!delta) return '—'
  if (delta.delta === 0) return '0'
  return delta.delta > 0 ? `+${delta.delta}` : `−${Math.abs(delta.delta)}`
}
