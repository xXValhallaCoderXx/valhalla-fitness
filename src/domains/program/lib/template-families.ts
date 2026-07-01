import type { ProgramTemplateSummary } from '~/shared/types'

/**
 * Programme families are a purely presentational layer that groups the flat template catalogue into
 * a handful of training-style "families", each offering one or more concrete schedule/split
 * *variants*. Every variant remains its own runnable `TemplateDefinition` with its own concrete
 * `template_id` — started programmes, logs, progression, and required state all key on that id. A
 * family is only how we surface those templates: one card in the catalogue, a variant selector on
 * the detail page, and family-level recommendations in Find-my-plan.
 *
 * This module references template ids as strings only — it has no dependency on the DSL definitions.
 * It is the single source of truth for family + per-variant presentation metadata, merged onto
 * summaries via {@link applyFamilyMeta} in both the fallback catalogue and the server DB path.
 */

/** A concrete template within a family, with the copy shown on the detail-page variant selector. */
export type FamilyMember = {
  id: string
  /** Full descriptor, e.g. "5-day PPL + Upper/Lower". Shown on the wizard result sub-line. */
  variantLabel: string
  /** Terse selector-chip / card copy, e.g. "5 days · PPL". */
  variantShortLabel: string
  /** One-line explanation shown under the selected variant. */
  variantDescription: string
  /** Display order within the family (ascending). Lowest is the family default's natural position. */
  variantSortOrder: number
}

export type ProgramTemplateFamily = {
  id: string
  name: string
  tagline?: string
  description: string
  /** Plain-English explanation of the training approach, shown in the card's info popover. */
  methodology: string
  complexity: string
  tags: string[]
  /** The variant that loads when the family card is opened / the wizard falls back to. */
  defaultTemplateId: string
  /** Display order in the catalogue (ascending). */
  sortOrder: number
  /** Members ordered by {@link FamilyMember.variantSortOrder}. */
  members: FamilyMember[]
}

export const templateFamilies: ProgramTemplateFamily[] = [
  {
    id: 'beginner_linear_strength',
    name: 'Beginner Linear Strength',
    tagline: 'Simple progression for new lifters',
    description:
      'Build strength and muscle with repeatable weekly training and add-weight-when-you-complete-your-reps progression.',
    complexity: 'Beginner',
    tags: ['beginner', 'linear', 'strength', 'hypertrophy'],
    methodology:
      'Linear progression is the simplest way to get stronger fast: add a little weight every session, as long as you complete all your reps. These plans keep that same idea and just scale it to how many days a week you can train.',
    defaultTemplateId: 'generic_alternating_5x5_lp',
    sortOrder: 10,
    members: [
      {
        id: 'generic_alternating_5x5_lp',
        variantLabel: '3-day 5×5 Linear',
        variantShortLabel: '3 days',
        variantDescription: 'Alternating A/B full-body sessions with 5×5 work — the simplest place to start.',
        variantSortOrder: 10,
      },
      {
        id: 'beginner_upper_lower_lp',
        variantLabel: '4-day Upper/Lower',
        variantShortLabel: '4 days',
        variantDescription: 'A balanced upper/lower split with straight-set linear progression.',
        variantSortOrder: 20,
      },
      {
        id: 'beginner_upper_lower_arms_5day_lp',
        variantLabel: '5-day Upper/Lower + Arms',
        variantShortLabel: '5 days · +Arms',
        variantDescription: 'More weekly volume with a dedicated arm and upper-back pump day.',
        variantSortOrder: 30,
      },
      {
        id: 'beginner_ppl_upper_lower_5day_lp',
        variantLabel: '5-day PPL + Upper/Lower',
        variantShortLabel: '5 days · PPL',
        variantDescription: 'Push, pull, and legs days plus an upper/lower finish for a bodybuilding feel.',
        variantSortOrder: 40,
      },
    ],
  },
  {
    id: 'intermediate_strength',
    name: 'Intermediate Strength',
    tagline: 'Weekly waves once linear runs out',
    description:
      'Three-day intermediate strength work — ramping 5×5 loads or a volume-to-intensity wave chasing new top sets.',
    complexity: 'Intermediate',
    tags: ['strength', '5x5', 'intensity', 'volume'],
    methodology:
      'When adding weight every single session stops working, you move to weekly waves — building up across the week and adding weight from one week to the next instead of one session to the next. A natural next step after your first linear run.',
    defaultTemplateId: 'ramping_5x5_3day',
    sortOrder: 20,
    members: [
      {
        id: 'ramping_5x5_3day',
        variantLabel: '3-day Ramping 5×5',
        variantShortLabel: '3 days · 5×5',
        variantDescription: 'A heavy ramp, a recovery day, and a volume day — loads climb week to week.',
        variantSortOrder: 10,
      },
      {
        id: 'weekly_intensity_3day',
        variantLabel: '3-day Volume → Intensity',
        variantShortLabel: '3 days · Volume→Intensity',
        variantDescription: 'A volume day, a recovery day, and a weekly intensity day chasing new top sets.',
        variantSortOrder: 20,
      },
    ],
  },
  {
    id: 'powerbuilding',
    name: 'Powerbuilding',
    tagline: 'Heavy strength plus muscle-building volume',
    description:
      'Powerbuilding splits that pair heavy power work with higher-rep hypertrophy volume for size and strength together.',
    complexity: 'Intermediate',
    tags: ['powerbuilding', 'hypertrophy', 'volume', 'wave'],
    methodology:
      'Powerbuilding pairs heavy, low-rep work for strength with higher-rep work for muscle size, so you build both at once. The variants split that across upper/lower or push-pull-legs days depending on your week.',
    defaultTemplateId: 'power_hypertrophy_ul',
    sortOrder: 30,
    members: [
      {
        id: 'power_hypertrophy_ul',
        variantLabel: '4-day Power + Hypertrophy U/L',
        variantShortLabel: '4 days · U/L',
        variantDescription: 'Two heavy power days plus two higher-rep hypertrophy days on an upper/lower split.',
        variantSortOrder: 10,
      },
      {
        id: 'power_hypertrophy_ppl_5day',
        variantLabel: '5-day Power + Hypertrophy PPL',
        variantShortLabel: '5 days · PPL',
        variantDescription: 'Power upper/lower days followed by hypertrophy push, pull, and legs sessions.',
        variantSortOrder: 20,
      },
    ],
  },
  {
    id: 'training_max_wave',
    name: 'Training Max Wave',
    tagline: 'Percentage waves off a training max',
    description:
      'Training-max percentage waves with back-off work and structured accessories, at four or five days a week.',
    complexity: 'Intermediate',
    tags: ['training max', 'wave', 'strength', 'hypertrophy'],
    methodology:
      "Weights are based on a conservative 'training max' (about 90% of your best), so they stay manageable while loads wave up over a few weeks and then reset a little heavier. A proven, sustainable way to keep adding strength.",
    defaultTemplateId: 'healthy-531-fsl',
    sortOrder: 40,
    members: [
      {
        id: 'healthy-531-fsl',
        variantLabel: '4-day Training Max Wave',
        variantShortLabel: '4 days',
        variantDescription: 'A 4-week training-max percentage wave with back-off work and structured accessories.',
        variantSortOrder: 10,
      },
      {
        id: 'training_max_wave_pump_5day',
        variantLabel: '5-day Training Max Wave + Pump',
        variantShortLabel: '5 days · +Pump',
        variantDescription: 'The four main-lift days plus a low-stress pump/supplemental day.',
        variantSortOrder: 20,
      },
    ],
  },
  {
    id: 'classic_volume_strength',
    name: 'Classic Volume Strength',
    tagline: 'Volume and intensity waves for advanced lifters',
    description:
      'Whole-body and upper/lower plans that alternate volumizing and intensifying waves toward heavy top sets.',
    complexity: 'Intermediate',
    tags: ['volume', 'strength', 'intensity', 'peak'],
    methodology:
      'A base-to-peak approach: start with higher-volume waves to build a foundation, then shift to heavier waves to sharpen strength toward a peak. Longer, structured builds for more experienced lifters.',
    defaultTemplateId: 'bromley-volume-intensity',
    sortOrder: 50,
    members: [
      {
        id: 'bromley-volume-intensity',
        variantLabel: '3-day Volume-Intensity',
        variantShortLabel: '3 days',
        variantDescription: 'A whole-body split alternating a 3-week volume wave with a 3-week top-set wave.',
        variantSortOrder: 10,
      },
      {
        id: 'bromley-70s-powerlifter',
        variantLabel: '4-day Classic Volume Strength',
        variantShortLabel: '4 days · Volume',
        variantDescription: 'An 18-week upper/lower plan with volumizing waves, intensifying waves, and variations.',
        variantSortOrder: 20,
      },
      {
        id: 'bromley-bullmastiff',
        variantLabel: '4-day Old School Wave',
        variantShortLabel: '4 days · Wave',
        variantDescription: 'An 18-week upper/lower wave with base and peak phases and plus-set regulation.',
        variantSortOrder: 30,
      },
    ],
  },
  {
    id: 'bodybuilding_splits',
    name: 'Bodybuilding Splits',
    tagline: 'Train around individual muscle groups',
    description:
      'A classic bodypart split with one regulated main lift per major day and double-progressed accessories.',
    complexity: 'Beginner',
    tags: ['bodybuilding', 'hypertrophy', 'bro split', 'linear'],
    methodology:
      'A classic bodypart split — train one major muscle group per day with a main lift plus higher-rep accessories. A simple, focused way to build size.',
    defaultTemplateId: 'classic_bodypart_split_5day_lp',
    sortOrder: 60,
    members: [
      {
        id: 'classic_bodypart_split_5day_lp',
        variantLabel: '5-day Bodypart Split',
        variantShortLabel: '5 days',
        variantDescription: 'One major lift per day with double-progressed bodybuilding accessories.',
        variantSortOrder: 10,
      },
    ],
  },
]

/** Family that a given template id belongs to, or `undefined` for custom/ungrouped templates. */
export const familyByTemplateId: Map<string, ProgramTemplateFamily> = new Map()
/** Per-template variant metadata merged onto summaries by {@link applyFamilyMeta}. */
export const variantMetaById: Map<
  string,
  Pick<
    ProgramTemplateSummary,
    'familyId' | 'variantLabel' | 'variantShortLabel' | 'variantDescription' | 'variantSortOrder'
  >
> = new Map()

for (const family of templateFamilies) {
  for (const member of family.members) {
    familyByTemplateId.set(member.id, family)
    variantMetaById.set(member.id, {
      familyId: family.id,
      variantLabel: member.variantLabel,
      variantShortLabel: member.variantShortLabel,
      variantDescription: member.variantDescription,
      variantSortOrder: member.variantSortOrder,
    })
  }
}

/** Spread the matching family/variant metadata onto a summary; a no-op for ungrouped templates. */
export function applyFamilyMeta(summary: ProgramTemplateSummary): ProgramTemplateSummary {
  const meta = variantMetaById.get(summary.id)
  return meta ? { ...summary, ...meta } : summary
}

export type CatalogueItem =
  | { kind: 'single'; template: ProgramTemplateSummary }
  | { kind: 'family'; family: ProgramTemplateFamily; members: ProgramTemplateSummary[] }

/**
 * Collapse a flat template list into catalogue items: one item per family (positioned by the
 * family's `sortOrder`), plus a `single` item for every ungrouped template (kept in input order).
 * Members absent from the input simply drop out; a family left with a single present member renders
 * as a `single` card so it never looks like a group of one.
 */
export function buildCatalogueItems(templates: ProgramTemplateSummary[]): CatalogueItem[] {
  const byId = new Map(templates.map((template) => [template.id, template]))
  const items: CatalogueItem[] = []
  const emittedFamilyIds = new Set<string>()

  for (const template of templates) {
    const family = familyByTemplateId.get(template.id)
    if (!family) {
      items.push({ kind: 'single', template })
      continue
    }
    if (emittedFamilyIds.has(family.id)) continue
    emittedFamilyIds.add(family.id)

    const members = family.members
      .map((member) => byId.get(member.id))
      .filter((member): member is ProgramTemplateSummary => Boolean(member))
      .sort((left, right) => (left.variantSortOrder ?? 0) - (right.variantSortOrder ?? 0))

    if (members.length <= 1) {
      // A family reduced to one present member is just a normal card.
      if (members[0]) items.push({ kind: 'single', template: members[0] })
      continue
    }
    items.push({ kind: 'family', family, members })
  }

  // Stable sort families/singles by family sortOrder where known, otherwise keep input order.
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftOrder = left.item.kind === 'family' ? left.item.family.sortOrder : sortOrderForSingle(left.item.template)
      const rightOrder = right.item.kind === 'family' ? right.item.family.sortOrder : sortOrderForSingle(right.item.template)
      return leftOrder - rightOrder || left.index - right.index
    })
    .map(({ item }) => item)
}

function sortOrderForSingle(template: ProgramTemplateSummary): number {
  const family = familyByTemplateId.get(template.id)
  // A single-member family keeps its family position; ungrouped templates sort after all families.
  return family ? family.sortOrder : Number.MAX_SAFE_INTEGER
}

/**
 * The in-catalogue members of `templateId`'s family, ordered by variant sort order. Returns `[]`
 * when the template has no family or isn't part of the given list. Drives the detail-page selector.
 */
export function familyMembersForTemplate(
  templateId: string,
  templates: ProgramTemplateSummary[],
): ProgramTemplateSummary[] {
  const family = familyByTemplateId.get(templateId)
  if (!family) return []
  const byId = new Map(templates.map((template) => [template.id, template]))
  return family.members
    .map((member) => byId.get(member.id))
    .filter((member): member is ProgramTemplateSummary => Boolean(member))
    .sort((left, right) => (left.variantSortOrder ?? 0) - (right.variantSortOrder ?? 0))
}

/** e.g. `4–5 days/wk`, or `4 days/wk` when every member shares a day count. */
export function scheduleRangeLabel(members: ProgramTemplateSummary[]): string {
  const days = members.map((member) => member.daysPerWeek)
  const min = Math.min(...days)
  const max = Math.max(...days)
  return min === max ? `${min} days/wk` : `${min}–${max} days/wk`
}

const COMPLEXITY_BY_RANK = ['Beginner', 'Intermediate', 'Advanced'] as const
const COMPLEXITY_RANK: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 }

/**
 * The family's complexity as shown on the card — derived from its actual members, not a fixed family
 * value, so a family that spans levels reads honestly (e.g. `Intermediate–Advanced`) instead of
 * hiding harder variants behind a single label.
 */
export function complexityRangeLabel(members: ProgramTemplateSummary[]): string {
  const ranks = members.map((member) => COMPLEXITY_RANK[member.complexity] ?? 1)
  const min = Math.min(...ranks)
  const max = Math.max(...ranks)
  return min === max ? COMPLEXITY_BY_RANK[min] : `${COMPLEXITY_BY_RANK[min]}–${COMPLEXITY_BY_RANK[max]}`
}

/** The most approachable member's complexity — used for the card accent color of a family. */
export function lowestComplexity(members: ProgramTemplateSummary[]): string {
  const min = Math.min(...members.map((member) => COMPLEXITY_RANK[member.complexity] ?? 1))
  return COMPLEXITY_BY_RANK[min] ?? 'Intermediate'
}
