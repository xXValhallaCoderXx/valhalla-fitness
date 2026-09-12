import { Button, TextInput } from '@mantine/core'
import { Search } from 'lucide-react'
import {
  CATALOGUE_GOAL_FILTERS,
  CATALOGUE_LEVEL_FILTERS,
  type CatalogueGoalFilter,
  type CatalogueLevelFilter,
} from '@sheetless/domain/program/catalogue-filters'
import { SectionLabel } from '~/components'

export function TemplateCatalogueFilters({
  level,
  goal,
  query,
  onLevelChange,
  onGoalChange,
  onQueryChange,
}: {
  level: CatalogueLevelFilter
  goal: CatalogueGoalFilter
  query: string
  onLevelChange: (level: CatalogueLevelFilter) => void
  onGoalChange: (goal: CatalogueGoalFilter) => void
  onQueryChange: (query: string) => void
}) {
  return (
    <div
      className="sticky top-0 z-30 -mx-3 mb-5 space-y-3 px-3 py-3 md:-mx-8 md:px-8 md:mb-6 lg:-mx-10 lg:px-10"
      style={{ backgroundColor: 'var(--mantine-color-body)' }}
    >
      <div className="max-w-4xl">
        <TextInput
          leftSection={<Search size={16} />}
          placeholder="Search programmes"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <FilterRow label="Level">
          {CATALOGUE_LEVEL_FILTERS.map((option) => (
            <Button
              key={option}
              size="xs"
              radius="xl"
              variant={level === option ? 'filled' : 'default'}
              className="shrink-0"
              onClick={() => onLevelChange(option)}
            >
              {option}
            </Button>
          ))}
        </FilterRow>
        <FilterRow label="Goal">
          {CATALOGUE_GOAL_FILTERS.map((option) => (
            <Button
              key={option.value}
              size="xs"
              radius="xl"
              variant={goal === option.value ? 'filled' : 'default'}
              className="shrink-0"
              onClick={() => onGoalChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </FilterRow>
      </div>
    </div>
  )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 shrink-0">
        <SectionLabel size="0.625rem">{label}</SectionLabel>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:overflow-visible sm:pb-0">
        {children}
      </div>
    </div>
  )
}
