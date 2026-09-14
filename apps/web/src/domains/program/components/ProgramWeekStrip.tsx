import { Check } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Caption, Panel, Text } from '~/components'
import { useExperienceMode } from '~/domains/account/components'
import { guidedWeekDescriptor } from '@sheetless/domain/program/week-character'
import { formatWeekPercentages } from '@sheetless/domain/program/week-percentages'
import type { TemplateDefinition } from '~/domains/program'

type WeekStatus = 'done' | 'current' | 'upcoming'

const statusAccent: Record<WeekStatus, string> = {
  done: 'var(--vf-action-text)',
  current: 'var(--mantine-primary-color-filled)',
  upcoming: 'transparent',
}

/**
 * The cycle at a glance: one cell per week of the programme.
 *
 * Built as a single bordered card whose `gap-px` *is* the divider, the technique
 * the insights stat strip already uses — cleaner than the comp's negative-margin trick and it keeps the
 * outer radius intact. Guided reads the programme's own word for each week; Full reads the
 * percentages the week actually prescribes.
 */
export function ProgramWeekStrip({
  definition,
  currentWeekNumber,
  selectedWeekNumber,
  onSelectWeek,
}: {
  definition: TemplateDefinition
  /** 1-based — where the programme actually is. */
  currentWeekNumber: number
  /** 1-based — which week the page is showing; defaults to the current one. */
  selectedWeekNumber?: number
  onSelectWeek?: (weekIndex: number) => void
}) {
  const { isFull } = useExperienceMode()
  const currentRef = useRef<HTMLDivElement | null>(null)

  // An 18-week programme divides a 1180px row into 60px slivers, so the cells keep a readable
  // minimum and the strip scrolls instead. A 4-week cycle still fills the width because the track
  // is `minmax(min, 1fr)`. Scroll the current week into view, otherwise week 18 of 18 starts
  // off-screen.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [currentWeekNumber])

  // Full's cells carry the percentage line, which needs noticeably more room than a word.
  const minCell = isFull ? '12rem' : '9rem'

  return (
    <Panel p={0} className="overflow-hidden" data-testid="program-week-strip">
      <div
        className="grid grid-flow-col gap-px overflow-x-auto"
        style={{
          gridAutoColumns: `minmax(${minCell}, 1fr)`,
          backgroundColor: 'var(--mantine-color-default-border)',
        }}
      >
        {definition.weeks.map((week, index) => {
          const number = index + 1
          const status: WeekStatus =
            number < currentWeekNumber ? 'done' : number === currentWeekNumber ? 'current' : 'upcoming'
          const percentages = isFull ? formatWeekPercentages(definition, week) : null
          const selected = number === (selectedWeekNumber ?? currentWeekNumber)

          return (
            <div
              key={`${week.label}-${index}`}
              ref={status === 'current' ? currentRef : undefined}
              role={onSelectWeek ? 'button' : undefined}
              tabIndex={onSelectWeek ? 0 : undefined}
              aria-current={selected ? 'true' : undefined}
              aria-label={onSelectWeek ? `Show week ${number}` : undefined}
              onClick={onSelectWeek ? () => onSelectWeek(index) : undefined}
              onKeyDown={
                onSelectWeek
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onSelectWeek(index)
                      }
                    }
                  : undefined
              }
              className={`flex min-w-0 flex-col justify-center gap-0.5 p-2.5 md:flex-row md:items-center md:justify-between md:gap-2 md:p-3.5 ${
                onSelectWeek ? 'cursor-pointer' : ''
              }`}
              style={{
                backgroundColor: selected ? 'var(--vf-action-soft)' : 'var(--mantine-color-default)',
                borderTop: `3px solid ${statusAccent[status]}`,
                boxShadow: selected && status !== 'current' ? 'inset 0 0 0 1px var(--vf-action-border)' : undefined,
              }}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex min-w-0 items-baseline gap-2">
                  {/* The absolute week, not `week.label` — a long programme restarts that label
                      each wave, so an 18-week cycle would show "Week 1" six times. */}
                  <Text
                    size="sm"
                    fw={700}
                    tone={status === 'current' ? 'action' : status === 'upcoming' ? 'dimmed' : 'default'}
                    truncate
                  >
                    Week {number}
                  </Text>
                  {isFull ? <Caption className="hidden md:block" tt="uppercase" fw={800}>{week.hardness}</Caption> : null}
                </div>
                <Caption lh={1.35} style={isFull ? { fontVariantNumeric: 'tabular-nums' } : undefined} truncate>
                  {percentages ?? guidedWeekDescriptor(week)}
                </Caption>
              </div>

              {/* Guided marks where you are with a dot; Full has the hardness token instead. On a
                  393px phone four dots cost more width than the week names have to spare, so the
                  tint and the top rule carry the state there. */}
              {!isFull ? (
                <span className="hidden md:inline-flex">
                  <WeekStatusDot status={status} />
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

function WeekStatusDot({ status }: { status: WeekStatus }) {
  if (status === 'done') {
    return (
      <span
        aria-hidden="true"
        className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: 'var(--vf-action-text)' }}
      >
        <Check size={12} color="var(--mantine-color-white)" strokeWidth={3.2} />
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      className="h-5.5 w-5.5 shrink-0 rounded-full"
      style={
        status === 'current'
          ? { backgroundColor: 'var(--mantine-primary-color-filled)' }
          : { border: '2px solid var(--mantine-color-default-border)' }
      }
    />
  )
}
