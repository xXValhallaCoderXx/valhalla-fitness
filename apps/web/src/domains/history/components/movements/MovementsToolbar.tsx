import { TextInput } from '@mantine/core'
import { Search } from 'lucide-react'
import { FilterChip, historySearchInputStyles } from '../insight-format'

/** Search and the category chips, in the header's actions slot. */
export function MovementsToolbar({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  categories,
}: {
  query: string
  onQueryChange: (query: string) => void
  category: string | null
  onCategoryChange: (category: string | null) => void
  categories: string[]
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <TextInput
        value={query}
        onChange={(event) => onQueryChange(event.currentTarget.value)}
        placeholder="Search movements"
        aria-label="Search movements"
        leftSection={<Search size={14} />}
        styles={historySearchInputStyles}
        className="min-w-52"
      />
      <FilterChip label="All" active={category === null} onClick={() => onCategoryChange(null)} />
      {categories.map((value) => (
        <FilterChip
          key={value}
          label={value.replaceAll('_', ' ')}
          capitalize
          active={category === value}
          onClick={() => onCategoryChange(value)}
        />
      ))}
    </div>
  )
}
