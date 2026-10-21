import {
  CATALOGUE_GOAL_FILTERS,
  CATALOGUE_LEVEL_FILTERS,
  DEFAULT_CATALOGUE_FILTERS,
  type CatalogueFilterState,
} from './catalogue-filters'
import { GOAL_OPTIONS } from './recommend-plan'
import type { CatalogueItem } from './template-families'
import type { ProgramTemplateSummary } from './types'

export type CatalogueBrowseFilters = CatalogueFilterState & { days: 'all' | number }

export const DEFAULT_CATALOGUE_BROWSE_FILTERS: CatalogueBrowseFilters = {
  ...DEFAULT_CATALOGUE_FILTERS,
  days: 'all',
}

function membersOf(item: CatalogueItem): ProgramTemplateSummary[] {
  return item.kind === 'family' ? item.members : [item.template]
}

function matchingMembers(item: CatalogueItem, filters: CatalogueBrowseFilters) {
  const query = filters.query.trim().toLowerCase()
  const familyText = item.kind === 'family'
    ? `${item.family.name} ${item.family.tagline ?? ''}`
    : ''
  const goalTags = GOAL_OPTIONS.find((option) => option.value === filters.goal)?.tags ?? []

  return membersOf(item).filter((member) => {
    if (filters.days !== 'all' && member.daysPerWeek !== filters.days) return false
    if (filters.level !== 'All' && member.complexity !== filters.level) return false
    if (filters.goal !== 'all' && !member.tags.some((tag) => goalTags.includes(tag.toLowerCase()))) return false
    const text = `${familyText} ${member.name} ${member.description} ${member.tags.join(' ')}`
    return !query || text.toLowerCase().includes(query)
  })
}

/** Every active filter must match one schedule; the returned card retains all its schedules. */
export function browseCatalogueItems(items: CatalogueItem[], filters: CatalogueBrowseFilters): CatalogueItem[] {
  return items.filter((item) => matchingMembers(item, filters).length > 0)
}

/** Family/card counts if one facet changes, keeping the search and other facets in force. */
export function catalogueFacetCounts(items: CatalogueItem[], filters: CatalogueBrowseFilters) {
  const availableDays = [...new Set(items.flatMap(membersOf).map((member) => member.daysPerWeek))]
    .filter((days) => Number.isInteger(days) && days > 0)
    .sort((left, right) => left - right)
  const days: CatalogueBrowseFilters['days'][] = ['all', ...availableDays]
  return {
    days: days.map((value) => ({
      value,
      count: browseCatalogueItems(items, { ...filters, days: value }).length,
    })),
    level: CATALOGUE_LEVEL_FILTERS.map((value) => ({
      value,
      count: browseCatalogueItems(items, { ...filters, level: value }).length,
    })),
    goal: CATALOGUE_GOAL_FILTERS.map(({ value }) => ({
      value,
      count: browseCatalogueItems(items, { ...filters, goal: value }).length,
    })),
  }
}

/** Open an available matching schedule, preferring the family's declared default when it fits. */
export function catalogueEntryTemplate(
  item: CatalogueItem,
  filters: CatalogueBrowseFilters = DEFAULT_CATALOGUE_BROWSE_FILTERS,
): ProgramTemplateSummary | null {
  const matches = matchingMembers(item, filters).filter((member) => member.available)
  const defaultId = item.kind === 'family' ? item.family.defaultTemplateId : item.template.id
  return matches.find((member) => member.id === defaultId) ?? matches[0] ?? null
}

/** Omit a family duration when any member's definition is unknown instead of implying a full range. */
export function catalogueDurationLabel(item: CatalogueItem): string | null {
  const durations = membersOf(item).map((member) => member.durationWeeks)
  if (!durations.length || durations.some((duration) => duration == null || !Number.isInteger(duration) || duration < 1)) return null
  const minimum = Math.min(...durations as number[])
  const maximum = Math.max(...durations as number[])
  return minimum === maximum
    ? `${minimum} ${minimum === 1 ? 'week' : 'weeks'}`
    : `${minimum}–${maximum} weeks`
}
