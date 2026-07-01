import { describe, expect, it } from 'vitest'
import { templateCatalog } from '../src/domains/program/lib/templates'
import {
  buildCatalogueItems,
  familyByTemplateId,
  familyMembersForTemplate,
  scheduleRangeLabel,
  templateFamilies,
} from '../src/domains/program/lib/template-families'

const catalogIds = new Set(templateCatalog.map((template) => template.id))

describe('templateFamilies config', () => {
  it('references only real templates and unique member ids', () => {
    const seen = new Set<string>()
    for (const family of templateFamilies) {
      for (const member of family.members) {
        expect(catalogIds.has(member.id), `${member.id} exists in catalogue`).toBe(true)
        expect(seen.has(member.id), `${member.id} appears in only one family`).toBe(false)
        seen.add(member.id)
      }
    }
  })

  it('gives every family a default that is one of its members', () => {
    for (const family of templateFamilies) {
      expect(family.members.some((member) => member.id === family.defaultTemplateId)).toBe(true)
    }
  })

  it('covers every built-in template exactly once', () => {
    const builtIns = templateCatalog.filter((template) => template.origin !== 'user_created')
    for (const template of builtIns) {
      expect(familyByTemplateId.has(template.id), `${template.id} belongs to a family`).toBe(true)
    }
  })

  it('enriches catalogue summaries with variant metadata', () => {
    const summary = templateCatalog.find((template) => template.id === 'power_hypertrophy_ppl_5day')
    expect(summary?.familyId).toBe('powerbuilding')
    expect(summary?.variantShortLabel).toBe('5 days · PPL')
    expect(summary?.variantSortOrder).toBe(20)
  })
})

describe('buildCatalogueItems', () => {
  it('collapses the full catalogue into 6 items (5 families + 1 single-member family)', () => {
    const items = buildCatalogueItems(templateCatalog.filter((template) => template.origin !== 'user_created'))
    expect(items).toHaveLength(6)
    const familyItems = items.filter((item) => item.kind === 'family')
    expect(familyItems).toHaveLength(5)
    // Bodybuilding Splits has a single member → renders as a `single` card, not a family group.
    const single = items.find((item) => item.kind === 'single')
    expect(single?.kind).toBe('single')
    if (single?.kind === 'single') expect(single.template.id).toBe('classic_bodypart_split_5day_lp')
  })

  it('orders items by family sortOrder', () => {
    const items = buildCatalogueItems(templateCatalog.filter((template) => template.origin !== 'user_created'))
    const firstFamily = items[0]
    expect(firstFamily.kind === 'family' && firstFamily.family.id).toBe('beginner_linear_strength')
  })

  it('renders a family reduced to one present member as a single card', () => {
    // Only one member of the beginner family survives → single card.
    const trimmed = templateCatalog.filter((template) => template.id === 'beginner_upper_lower_lp')
    const items = buildCatalogueItems(trimmed)
    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe('single')
  })
})

describe('familyMembersForTemplate', () => {
  it('returns ordered members for a family member', () => {
    const members = familyMembersForTemplate('power_hypertrophy_ul', templateCatalog)
    expect(members.map((member) => member.id)).toEqual([
      'power_hypertrophy_ul',
      'power_hypertrophy_ppl_5day',
      'bromley-bullmastiff',
    ])
  })

  it('returns an empty list for a template with no family', () => {
    expect(familyMembersForTemplate('not-a-real-template', templateCatalog)).toEqual([])
  })
})

describe('scheduleRangeLabel', () => {
  it('shows a range across differing day counts', () => {
    const members = familyMembersForTemplate('generic_alternating_5x5_lp', templateCatalog)
    expect(scheduleRangeLabel(members)).toBe('3–5 days/wk')
  })

  it('shows a single value when all members share a day count', () => {
    const members = familyMembersForTemplate('ramping_5x5_3day', templateCatalog)
    expect(scheduleRangeLabel(members)).toBe('3 days/wk')
  })
})
