import { BODY_LOAD_TIER_MAX, bodyLoadTierLabels } from '~/domains/history/lib/body-load'
import {
  ADEQUACY_HIGH_SETS,
  ADEQUACY_LOW_SETS,
  adequacyTierLabels,
} from '~/domains/history/lib/muscle-volume'
import type { BodyLoadTier } from '~/domains/history'
import type { AdequacyTier } from '~/domains/history/lib/muscle-volume'
import { useExperienceMode } from '~/domains/account/components'
import { Caption } from '~/components'
import { adequacyFill, bodyLoadFill } from './body-load-style'

/**
 * Coldest to hottest, which is also ascending threshold order.
 *
 * Bounds are read from `BODY_LOAD_TIER_MAX` rather than restated, so the legend cannot drift from
 * the function that assigns the colours. Full mode shows them; Guided just names the tiers.
 */
const FATIGUE_TIERS: Array<{ tier: BodyLoadTier; bound: string }> = [
  { tier: 'fresh', bound: `${BODY_LOAD_TIER_MAX.fresh}%` },
  { tier: 'low', bound: `≤${BODY_LOAD_TIER_MAX.low}%` },
  { tier: 'moderate', bound: `≤${BODY_LOAD_TIER_MAX.moderate}%` },
  { tier: 'high', bound: `>${BODY_LOAD_TIER_MAX.moderate}%` },
]

const ADEQUACY_TIERS: Array<{ tier: AdequacyTier; bound: string }> = [
  { tier: 'below', bound: `<${ADEQUACY_LOW_SETS}` },
  { tier: 'in_range', bound: `${ADEQUACY_LOW_SETS}–${ADEQUACY_HIGH_SETS}` },
  { tier: 'high', bound: `>${ADEQUACY_HIGH_SETS}` },
]

export function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
      <Caption>{label}</Caption>
    </span>
  )
}

export function BodyLoadLegend({ view }: { view: 'fatigue' | 'sets' }) {
  const { isFull } = useExperienceMode()
  const withBound = (label: string, bound: string) => (isFull ? `${label} ${bound}` : label)

  return (
    <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
      {view === 'fatigue'
        ? FATIGUE_TIERS.map(({ tier, bound }) => (
            <LegendSwatch
              key={tier}
              color={bodyLoadFill(tier)}
              label={withBound(bodyLoadTierLabels[tier], bound)}
            />
          ))
        : ADEQUACY_TIERS.map(({ tier, bound }) => (
            <LegendSwatch
              key={tier}
              color={adequacyFill(tier)}
              label={withBound(adequacyTierLabels[tier], bound)}
            />
          ))}
    </div>
  )
}
