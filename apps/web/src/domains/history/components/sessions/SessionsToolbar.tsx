import { TextInput } from '@mantine/core'
import { Search } from 'lucide-react'
import type { LedgerFilter } from '~/domains/history/lib/session-ledger'
import { AD_HOC_BADGE_LABEL } from '~/domains/session/lib/ad-hoc'
import { FilterChip, historySearchInputStyles } from '../insight-format'

/** Search and the filter chips, on one row beside the heading — 10a's arrangement. */
export function SessionsToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  activeProgramTitle,
  intensities,
  hasAdHoc,
}: {
  search: string
  onSearchChange: (search: string) => void
  filter: LedgerFilter
  onFilterChange: (filter: LedgerFilter) => void
  activeProgramTitle?: string | null
  intensities: string[]
  hasAdHoc: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <TextInput
        leftSection={<Search size={16} />}
        placeholder="Search sessions"
        aria-label="Search sessions"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        styles={historySearchInputStyles}
        className="min-w-56"
      />
      <FilterChip label="All" active={filter === 'all'} onClick={() => onFilterChange('all')} />
      {activeProgramTitle ? (
        <FilterChip label="This programme" active={filter === 'programme'} onClick={() => onFilterChange('programme')} />
      ) : null}
      <FilterChip label="PRs only" active={filter === 'pr'} onClick={() => onFilterChange('pr')} />
      {intensities.map((level) => (
        <FilterChip
          key={level}
          label={level}
          capitalize
          active={filter === level}
          onClick={() => onFilterChange(level as LedgerFilter)}
        />
      ))}
      {hasAdHoc ? (
        <FilterChip label={AD_HOC_BADGE_LABEL} active={filter === 'adhoc'} onClick={() => onFilterChange('adhoc')} />
      ) : null}
    </div>
  )
}
