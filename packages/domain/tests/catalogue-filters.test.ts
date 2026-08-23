import { describe, expect, it } from 'vitest'
import {
  filterCatalogueItems,
  type CatalogueFilterState,
} from '@sheetless/domain/program/catalogue-filters'
import { buildCatalogueItems } from '@sheetless/domain/program/template-families'
import { templateCatalog } from '@sheetless/domain/program/templates'
import type { ProgramTemplateSummary } from '@sheetless/domain/program/types'

const allFilters: CatalogueFilterState = { query: '', level: 'All', goal: 'all' }

describe('filterCatalogueItems', () => {
  it('keeps an entire family when one member matches the selected level and goal', () => {
    const items = buildCatalogueItems(templateCatalog)
    const results = filterCatalogueItems(items, {
      query: '',
      level: 'Advanced',
      goal: 'strength',
    })
    const strengthFamily = results.find(
      (item) => item.kind === 'family' && item.family.id === 'intermediate_strength',
    )

    expect(strengthFamily?.kind).toBe('family')
    if (strengthFamily?.kind !== 'family') throw new Error('Expected the complete strength family')
    expect(strengthFamily.members.map((member) => member.id)).toEqual([
      'ramping_5x5_3day',
      'weekly_intensity_3day',
    ])
  })

  it('searches family names and taglines without dropping family variants', () => {
    const results = filterCatalogueItems(buildCatalogueItems(templateCatalog), {
      ...allFilters,
      query: 'weekly waves once linear runs out',
    })

    expect(results).toHaveLength(1)
    expect(results[0]?.kind).toBe('family')
    if (results[0]?.kind !== 'family') throw new Error('Expected a family result')
    expect(results[0].family.id).toBe('intermediate_strength')
    expect(results[0].members).toHaveLength(2)
  })

  it('searches member names, descriptions, and tags case-insensitively', () => {
    const items = buildCatalogueItems(templateCatalog)

    expect(filterCatalogueItems(items, { ...allFilters, query: '  OLD SCHOOL WAVE  ' }))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: 'family',
          family: expect.objectContaining({ id: 'classic_volume_strength' }),
        }),
      ]))
    expect(filterCatalogueItems(items, { ...allFilters, query: 'low-stress pump' }))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: 'family',
          family: expect.objectContaining({ id: 'training_max_wave' }),
        }),
      ]))
    expect(filterCatalogueItems(items, { ...allFilters, query: 'powerbuilding' }))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: 'family',
          family: expect.objectContaining({ id: 'powerbuilding' }),
        }),
      ]))
  })

  it('applies level and goal to the same concrete member', () => {
    const source = buildCatalogueItems(templateCatalog).find(
      (item) => item.kind === 'family' && item.family.id === 'intermediate_strength',
    )
    if (source?.kind !== 'family') throw new Error('Expected a family fixture')
    const family = {
      ...source,
      members: [
        { ...source.members[0], complexity: 'Advanced', tags: ['strength'] },
        { ...source.members[1], complexity: 'Beginner', tags: ['hypertrophy'] },
      ],
    }

    expect(filterCatalogueItems([family], {
      query: '',
      level: 'Advanced',
      goal: 'muscle',
    })).toEqual([])
  })

  it('filters ungrouped custom templates and supports an empty result', () => {
    const custom: ProgramTemplateSummary = {
      ...templateCatalog[0],
      id: 'custom-tempo-work',
      name: 'Tempo Builder',
      description: 'Slow eccentric practice',
      complexity: 'Intermediate',
      origin: 'user_created',
      sourceLabel: 'Custom',
      tags: ['hypertrophy', 'tempo'],
    }
    const items = buildCatalogueItems([custom])

    expect(filterCatalogueItems(items, { query: 'TEMPO', level: 'Intermediate', goal: 'muscle' }))
      .toEqual([{ kind: 'single', template: custom }])
    expect(filterCatalogueItems(items, { query: 'tempo', level: 'Beginner', goal: 'muscle' }))
      .toEqual([])
  })
})
