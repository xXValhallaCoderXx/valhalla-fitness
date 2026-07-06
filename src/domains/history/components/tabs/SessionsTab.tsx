import { Badge, TextInput } from '@mantine/core'
import { ChevronRight, Search, Star } from 'lucide-react'
import { formatCompactDate, formatRelativeTime } from '~/shared/lib/dates'
import {
  availableIntensities,
  filterSessions,
  hasAdHocSessions,
  intensityColor,
  type SessionFilter,
} from '~/domains/history/lib/insights'
import { AD_HOC_BADGE_LABEL } from '~/domains/session/lib/ad-hoc'
import type { RecentHistoryEntry } from '~/shared/types'
import { Caption, EmptyState, Panel, Text } from '~/components'
import { ACCENT_SOFT, ACCENT_TEXT, FilterChip, historySearchInputStyles } from '../insight-format'

export function SessionsTab({
  sessions,
  activeProgramTitle,
  onOpenSession,
  filter,
  onFilterChange,
  search,
  onSearchChange,
}: {
  sessions: RecentHistoryEntry[]
  activeProgramTitle?: string | null
  onOpenSession: (sessionId: string) => void
  filter: SessionFilter
  onFilterChange: (filter: SessionFilter) => void
  search: string
  onSearchChange: (value: string) => void
}) {
  const intensities = availableIntensities(sessions)
  const showAdHocFilter = hasAdHocSessions(sessions)
  const filtered = filterSessions(sessions, filter, search)

  if (!sessions.length) {
    return (
      <EmptyState title="No completed sessions yet">
        {activeProgramTitle
          ? `${activeProgramTitle} is active. Finished workouts will be listed here with movement history.`
          : 'Finish a workout and it will be listed here with movement history.'}
      </EmptyState>
    )
  }

  return (
    <div className="space-y-3">
      <TextInput
        leftSection={<Search size={16} />}
        placeholder="Search sessions"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        styles={historySearchInputStyles}
      />
      <div className="flex flex-wrap gap-2">
        <FilterChip label="All" active={filter === 'all'} onClick={() => onFilterChange('all')} />
        {intensities.map((level) => (
          <FilterChip key={level} label={level} active={filter === level} onClick={() => onFilterChange(level)} />
        ))}
        {showAdHocFilter ? (
          <FilterChip label={AD_HOC_BADGE_LABEL} active={filter === 'adhoc'} onClick={() => onFilterChange('adhoc')} />
        ) : null}
      </div>
      <Panel px="md" py="xs">
        {filtered.length ? (
          filtered.map((session, index) => (
            <SessionRow
              key={session.id}
              session={session}
              last={index === filtered.length - 1}
              onOpen={() => onOpenSession(session.id)}
            />
          ))
        ) : (
          <Text size="sm" tone="dimmed" className="py-3">No matching sessions.</Text>
        )}
      </Panel>
    </div>
  )
}

function SessionRow({ session, last, onOpen }: { session: RecentHistoryEntry; last: boolean; onOpen: () => void }) {
  const color = intensityColor(session.hardness)
  const date = session.completedAt ?? session.scheduledDate
  return (
    <div className="flex gap-4">
      <div className="flex w-3.5 shrink-0 flex-col items-center">
        <span
          className="mt-5 h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: ACCENT_TEXT[color], boxShadow: `0 0 0 3px ${ACCENT_SOFT[color]}` }}
        />
        {!last ? <span className="w-px flex-1" style={{ backgroundColor: 'var(--mantine-color-default-border)' }} /> : null}
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 items-center justify-between gap-4 border-t py-3.5 text-left first:border-t-0"
        style={{ borderColor: 'var(--mantine-color-default-border)' }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Text fw={800} truncate>{session.title}</Text>
            {session.isFavorite ? (
              <Star size={13} fill="var(--vf-accent-text)" color="var(--vf-accent-text)" style={{ flexShrink: 0 }} aria-label="Favourite workout" />
            ) : null}
            {session.hardness ? <Badge color={color} variant="light" style={{ flexShrink: 0 }}>{session.hardness}</Badge> : null}
            {session.isAdHoc ? (
              <Badge color="accent" variant="light" style={{ flexShrink: 0 }}>{AD_HOC_BADGE_LABEL}</Badge>
            ) : null}
          </div>
          <Caption mt={2} truncate>
            {[session.weekLabel, `${session.movementCount} movements`, `${session.completedSetCount}/${session.plannedSetCount} sets`]
              .filter(Boolean)
              .join(' · ')}
          </Caption>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <Text size="xs" fw={700}>{formatCompactDate(date)}</Text>
            <Caption size="0.625rem">{formatRelativeTime(date)}</Caption>
          </div>
          <ChevronRight size={16} color="var(--mantine-color-dimmed)" />
        </div>
      </button>
    </div>
  )
}
