import { LineChart } from '@mantine/charts'
import { Link } from '@tanstack/react-router'
import { Clock, Scale } from 'lucide-react'
import { buildBodyweightTrend } from '@sheetless/domain/history/bodyweight-trend'
import type { HistoryInsights } from '@sheetless/domain/history/types'
import type { InsightRange } from '@sheetless/domain/history/insight-ranges'
import { formatCompactDate, formatDayMonth, formatWeekdayShortDate } from '~/shared/lib/dates'
import { formatWeight } from '~/shared/lib/set-notation'
import { Caption, Text } from '~/components'
import { BodyweightPromptCard } from '../BodyweightPromptCard'

/**
 * The rule that closes the screen: bodyweight, a way to log it, and when you last trained.
 *
 * The design draws one line. The bodyweight detail beneath it is kept because bodyweight has no
 * other home in the web app — the strength score reads it, so an account that cannot see or update
 * it cannot see why its score moved.
 */
export function OverviewFooterRule({
  insights,
  range,
  lastSession,
  completedSessions = 0,
}: {
  insights: HistoryInsights
  range: InsightRange
  lastSession?: { date: string | null; durationMinutes: number | null } | null
  /** Gates the capture prompt: there has to be training worth scoring before we ask. */
  completedSessions?: number
}) {
  const units = insights.bodyweight.units
  const hasBodyweight = insights.bodyweight.entries.length > 0
  const hasSex = insights.bodyweight.sex !== null
  const trend = buildBodyweightTrend({ entries: insights.bodyweight.entries, range, today: insights.today, units })
  const dateLabel = (value: number) =>
    Number.isFinite(value) ? formatCompactDate(new Date(value).toISOString().slice(0, 10)) : ''

  return (
    <section
      className="mt-6 pt-4"
      data-testid="bodyweight-trend"
      style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="flex items-center gap-2">
          <Scale size={14} color="var(--mantine-color-dimmed)" className="shrink-0" />
          <Caption component="span">Bodyweight</Caption>
          {trend.latest ? (
            <>
              <Text component="span" size="sm" fw={800}>{formatWeight(trend.latest.value, units)}</Text>
              <Caption component="span">· recorded {formatDayMonth(trend.latest.date)}</Caption>
            </>
          ) : (
            <Caption component="span">not recorded yet</Caption>
          )}
        </span>

        <Link to="/settings">
          <Text component="span" size="sm" fw={700} tone="action">
            Log bodyweight
          </Text>
        </Link>

        {lastSession?.date ? (
          <span className="flex items-center gap-2 sm:ml-auto">
            <Clock size={14} color="var(--mantine-color-dimmed)" className="shrink-0" />
            <Caption component="span" style={{ fontVariantNumeric: 'tabular-nums' }}>
              Last session {formatWeekdayShortDate(lastSession.date)}
              {lastSession.durationMinutes === null ? '' : ` · ${Math.round(lastSession.durationMinutes)} min`}
            </Caption>
          </span>
        ) : null}
      </div>

      {trend.latest ? (
        <>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <Caption>
              Latest recorded · {trend.latest.date}
              {trend.latestOutsideRange ? ' · outside selected range' : ''}
            </Caption>
            <Caption>
              {trend.count} {trend.count === 1 ? 'measurement' : 'measurements'} in range · {trend.totalCount} recorded
            </Caption>
            {trend.change !== null ? (
              <Caption>
                Change in range: {trend.change > 0 ? '+' : ''}
                {formatWeight(trend.change, units)}
              </Caption>
            ) : null}
          </div>

          {trend.count ? (
            <div className="mt-2" aria-label="Bodyweight measurements">
              <LineChart
                h={90}
                data={trend.points}
                dataKey="x"
                series={[{ name: 'value', label: `Bodyweight (${units})`, color: 'var(--mantine-color-text)' }]}
                curveType="linear"
                strokeWidth={2}
                withDots
                dotProps={{ r: 3 }}
                valueFormatter={(value) => formatWeight(value, units) ?? '—'}
                xAxisProps={{ type: 'number', domain: ['dataMin', 'dataMax'], tickFormatter: dateLabel, minTickGap: 36 }}
                yAxisProps={{ domain: ['auto', 'auto'], width: 52 }}
                tooltipProps={{ labelFormatter: (value) => dateLabel(Number(value)) }}
              />
            </div>
          ) : (
            <Caption component="p" mt="xs">
              No measurements in this range. Select a wider range or log bodyweight.
            </Caption>
          )}
          {trend.count === 1 ? (
            <Caption component="p" mt="xs">One measurement in range. Log another to see a change.</Caption>
          ) : null}
        </>
      ) : (
        <Caption component="p" mt="xs">No bodyweight recorded yet. Log your first measurement in Settings.</Caption>
      )}

      {/* The strength score reads bodyweight and sex; without them it can only report a raw total. */}
      {(!hasBodyweight || !hasSex) && completedSessions >= 2 ? (
        <BodyweightPromptCard units={units} hasBodyweight={hasBodyweight} hasSex={hasSex} />
      ) : null}
    </section>
  )
}
