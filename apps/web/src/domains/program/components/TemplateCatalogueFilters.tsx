import { Select, TextInput } from '@mantine/core'
import { Search } from 'lucide-react'
import {
  CATALOGUE_GOAL_FILTERS,
  CATALOGUE_LEVEL_FILTERS,
  type CatalogueGoalFilter,
  type CatalogueLevelFilter,
} from '@sheetless/domain/program/catalogue-filters'
import { Text } from '~/components'

/**
 * Search, two filters and the result count, in one row.
 *
 * The count is filter-reactive on purpose: sitting beside a search box, a number that ignored the
 * search would read as a bug.
 */
export function TemplateCatalogueFilters({
  level,
  goal,
  query,
  resultCount,
  onLevelChange,
  onGoalChange,
  onQueryChange,
}: {
  level: CatalogueLevelFilter
  goal: CatalogueGoalFilter
  query: string
  /** Cards currently shown, across every section. */
  resultCount: number
  onLevelChange: (level: CatalogueLevelFilter) => void
  onGoalChange: (goal: CatalogueGoalFilter) => void
  onQueryChange: (query: string) => void
}) {
  return (
    <div
      className="sticky top-0 z-30 -mx-3 mb-5 px-3 py-3 md:-mx-8 md:mb-6 md:px-8 lg:-mx-10 lg:px-10"
      style={{ backgroundColor: 'var(--mantine-color-body)' }}
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* Full width on a phone: sharing a row with two 10rem selects leaves the field narrower
            than its own search icon. */}
        <TextInput
          className="min-w-0 basis-full sm:max-w-[27.5rem] sm:basis-[27.5rem]"
          leftSection={<Search size={16} />}
          placeholder="Search programmes"
          aria-label="Search programmes"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />

        <Select
          className="min-w-0 flex-1 sm:w-[13rem] sm:flex-none"
          aria-label="Experience level"
          data={CATALOGUE_LEVEL_FILTERS.map((option) => ({
            value: option,
            label: option === 'All' ? 'All levels' : option,
          }))}
          value={level}
          allowDeselect={false}
          onChange={(value) => onLevelChange((value ?? 'All') as CatalogueLevelFilter)}
        />

        <Select
          className="min-w-0 flex-1 sm:w-[13rem] sm:flex-none"
          aria-label="Training goal"
          data={CATALOGUE_GOAL_FILTERS.map((option) => ({
            value: option.value,
            label: option.value === 'all' ? 'All goals' : option.label,
          }))}
          value={goal}
          allowDeselect={false}
          onChange={(value) => onGoalChange((value ?? 'all') as CatalogueGoalFilter)}
        />

        <Text className="basis-full shrink-0 sm:ml-auto sm:basis-auto" size="sm" tone="dimmed">
          {resultCount} {resultCount === 1 ? 'programme' : 'programmes'}
        </Text>
      </div>
    </div>
  )
}
