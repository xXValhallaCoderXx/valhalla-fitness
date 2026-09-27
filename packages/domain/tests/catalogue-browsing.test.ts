import { describe, expect, it } from 'vitest'
import {
  browseCatalogueItems,
  catalogueDurationLabel,
  catalogueEntryTemplate,
  catalogueFacetCounts,
  DEFAULT_CATALOGUE_BROWSE_FILTERS,
} from '../src/program/catalogue-browsing'
import { buildCatalogueItems, type CatalogueItem } from '../src/program/template-families'
import { getFallbackTemplateDefinition, templateCatalog } from '../src/program/templates'

const defaults = DEFAULT_CATALOGUE_BROWSE_FILTERS
const items = buildCatalogueItems(templateCatalog)

function family(id: string): Extract<CatalogueItem, { kind: 'family' }> {
  const item = items.find((candidate) => candidate.kind === 'family' && candidate.family.id === id)
  if (item?.kind !== 'family') throw new Error(`Missing family fixture ${id}`)
  return item
}

describe('native catalogue browsing', () => {
  it('keeps full family membership and searches metadata without case or whitespace sensitivity', () => {
    const beginner = family('beginner_linear_strength')
    expect(browseCatalogueItems(items, { ...defaults, query: '  arms  ', days: 5 })).toEqual([beginner])
    expect(browseCatalogueItems([beginner], { ...defaults, query: 'SIMPLE PROGRESSION' })).toEqual([beginner])
    expect(beginner.members).toHaveLength(4)
  })

  it('requires query, days, level and goal to match the same concrete schedule', () => {
    const base = family('intermediate_strength')
    const mixed: CatalogueItem = {
      ...base,
      members: [
        { ...base.members[0], daysPerWeek: 3, complexity: 'Advanced', tags: ['strength'], name: 'Alpha', description: '' },
        { ...base.members[1], daysPerWeek: 4, complexity: 'Beginner', tags: ['hypertrophy'], name: 'Beta', description: '' },
      ],
    }
    expect(browseCatalogueItems([mixed], { ...defaults, days: 4, level: 'Advanced' })).toEqual([])
    expect(browseCatalogueItems([mixed], { ...defaults, level: 'Advanced', goal: 'muscle' })).toEqual([])
    expect(browseCatalogueItems([mixed], { ...defaults, query: 'Beta', days: 3 })).toEqual([])
    expect(browseCatalogueItems([mixed], { ...defaults, query: 'Alpha', days: 3, level: 'Advanced', goal: 'strength' })).toEqual([mixed])
  })

  it('derives day choices and facet card counts while retaining other filters', () => {
    const beginner = family('beginner_linear_strength')
    const wave = family('training_max_wave')
    const counts = catalogueFacetCounts([beginner, wave], { ...defaults, days: 5, level: 'Intermediate' })
    expect(counts.days).toEqual([
      { value: 'all', count: 1 }, { value: 3, count: 0 }, { value: 4, count: 1 }, { value: 5, count: 1 },
    ])
    expect(counts.level).toEqual([
      { value: 'All', count: 2 }, { value: 'Beginner', count: 1 },
      { value: 'Intermediate', count: 1 }, { value: 'Advanced', count: 0 },
    ])
    expect(counts.goal.find((entry) => entry.value === 'strength')?.count).toBe(1)
    expect(catalogueFacetCounts([beginner, wave], { ...defaults, query: 'not in catalogue' }).days.every((entry) => entry.count === 0)).toBe(true)
  })

  it('prefers the available family default then a matching available schedule', () => {
    const beginner = family('beginner_linear_strength')
    expect(catalogueEntryTemplate(beginner)?.id).toBe(beginner.family.defaultTemplateId)
    expect(catalogueEntryTemplate(beginner, { ...defaults, days: 5 })?.id).toBe('beginner_upper_lower_arms_5day_lp')
    const unavailableDefault = {
      ...beginner,
      members: beginner.members.map((member) => ({ ...member, available: member.id !== beginner.family.defaultTemplateId })),
    }
    expect(catalogueEntryTemplate(unavailableDefault)?.id).toBe('beginner_upper_lower_lp')
    expect(catalogueEntryTemplate(unavailableDefault, { ...defaults, days: 3 })).toBeNull()
    expect(browseCatalogueItems([unavailableDefault], { ...defaults, days: 3 })).toEqual([unavailableDefault])
  })

  it('handles ungrouped custom templates, empty results and clearing filters', () => {
    const custom: CatalogueItem = { kind: 'single', template: {
      ...templateCatalog[0], id: 'custom', name: 'Tempo builder', description: '',
      origin: 'user_created', daysPerWeek: 2, tags: ['hypertrophy'],
    } }
    expect(catalogueEntryTemplate(custom, { ...defaults, days: 2, query: 'tempo', goal: 'muscle' })?.id).toBe('custom')
    expect(browseCatalogueItems([custom], { ...defaults, days: 5 })).toEqual([])
    expect(browseCatalogueItems([custom], defaults)).toEqual([custom])
    expect(catalogueFacetCounts([custom], defaults).days.map((entry) => entry.value)).toEqual(['all', 2])
    expect(catalogueFacetCounts([], defaults).days).toEqual([{ value: 'all', count: 0 }])
  })
})

describe('authoritative catalogue duration', () => {
  it('uses real definition cycle length for every fallback summary', () => {
    for (const template of templateCatalog) {
      expect(template.durationWeeks).toBe(getFallbackTemplateDefinition(template.id).durationWeeks)
    }
    // A repeating two-week cycle is not the mockup's invented twelve-week commitment.
    expect(templateCatalog.find((template) => template.id === 'generic_alternating_5x5_lp')?.durationWeeks).toBe(2)
  })

  it('formats uniform and mixed family lengths without hiding missing definitions', () => {
    const wave = family('training_max_wave')
    expect(catalogueDurationLabel(wave)).toBe('4 weeks')
    expect(catalogueDurationLabel(family('classic_volume_strength'))).toBe('6–18 weeks')
    expect(catalogueDurationLabel({ ...wave, members: wave.members.map((member, index) => ({
      ...member, durationWeeks: index ? undefined : 4,
    })) })).toBeNull()
    expect(catalogueDurationLabel({ kind: 'single', template: { ...wave.members[0], durationWeeks: 1 } })).toBe('1 week')
    expect(catalogueDurationLabel({ kind: 'single', template: { ...wave.members[0], durationWeeks: 0 } })).toBeNull()
  })
})
