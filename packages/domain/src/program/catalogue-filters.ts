import type { CatalogueItem } from '@sheetless/domain/program/template-families'
import { GOAL_OPTIONS, type ExperienceLevel, type PlanGoal } from '@sheetless/domain/program/recommend-plan'

export type CatalogueLevelFilter = 'All' | ExperienceLevel
export type CatalogueGoalFilter = 'all' | PlanGoal

export type CatalogueFilterState = {
  query: string
  level: CatalogueLevelFilter
  goal: CatalogueGoalFilter
}

export const DEFAULT_CATALOGUE_FILTERS: CatalogueFilterState = {
  query: '',
  level: 'All',
  goal: 'all',
}

export const CATALOGUE_LEVEL_FILTERS: readonly CatalogueLevelFilter[] = [
  'All',
  'Beginner',
  'Intermediate',
  'Advanced',
]

export const CATALOGUE_GOAL_FILTERS: ReadonlyArray<{
  value: CatalogueGoalFilter
  label: string
}> = [
  { value: 'all', label: 'All' },
  { value: 'simple', label: 'Simple' },
  { value: 'strength', label: 'Strength' },
  { value: 'muscle', label: 'Muscle' },
]

/**
 * Filter already-grouped catalogue cards. A family is kept intact when any one of its concrete
 * variants satisfies the selected level and goal; text search then considers the whole card.
 */
export function filterCatalogueItems(
  items: CatalogueItem[],
  filters: CatalogueFilterState,
): CatalogueItem[] {
  const query = filters.query.trim().toLowerCase()
  const goalTags =
    GOAL_OPTIONS.find((option) => option.value === filters.goal)?.tags.map((tag) => tag.toLowerCase()) ?? []

  return items.filter((item) => {
    const members = item.kind === 'family' ? item.members : [item.template]
    const memberMatchesFilters = members.some((member) => {
      const matchesLevel = filters.level === 'All' || member.complexity === filters.level
      const matchesGoal =
        filters.goal === 'all' || member.tags.some((tag) => goalTags.includes(tag.toLowerCase()))
      return matchesLevel && matchesGoal
    })
    if (!memberMatchesFilters) return false

    if (!query) return true
    const familyText = item.kind === 'family'
      ? `${item.family.name} ${item.family.tagline ?? ''}`
      : ''
    const memberText = members
      .map((member) => `${member.name} ${member.description} ${member.tags.join(' ')}`)
      .join(' ')
    return `${familyText} ${memberText}`.toLowerCase().includes(query)
  })
}
