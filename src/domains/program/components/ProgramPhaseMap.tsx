import { Text } from '~/components'
import type { PhaseMapPhase, PhaseMapWeek, ProgramPhaseMap as ProgramPhaseMapModel } from '~/domains/program/lib/program-phase-map'

/**
 * Glanceable program phase map — phases side by side, each split into waves of
 * week segments, with done/current/upcoming fills and a "you are here" pin.
 * `full` renders pins + wave/phase labels; `compact` is the thin mobile strip.
 */
export function ProgramPhaseMap({
  phaseMap,
  variant = 'full',
}: {
  phaseMap: ProgramPhaseMapModel
  variant?: 'full' | 'compact'
}) {
  const compact = variant === 'compact'
  return (
    <div style={{ display: 'flex', gap: compact ? 10 : 30 }}>
      {phaseMap.phases.map((phase) => (
        <div key={phase.key} style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: compact ? 7 : 14 }}>
            {phase.waves.map((wave, waveIndex) => (
              <div key={wave.label ?? waveIndex} style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: compact ? 3 : 5 }}>
                  {wave.weeks.map((week) => (
                    <WeekSegment key={week.index} week={week} compact={compact} />
                  ))}
                </div>
                {!compact && wave.label ? (
                  <Text ta="center" size="0.625rem" fw={600} tone="dimmed" mt={7} truncate>
                    {wave.label}
                  </Text>
                ) : null}
              </div>
            ))}
          </div>
          <PhaseFooter phase={phase} compact={compact} />
        </div>
      ))}
    </div>
  )
}

function WeekSegment({ week, compact }: { week: PhaseMapWeek; compact: boolean }) {
  const current = week.status === 'current'
  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        minWidth: 0,
        height: compact ? 7 : 10,
        borderRadius: compact ? 4 : 5,
        backgroundColor: segmentColor(week.status),
        boxShadow: current && !compact ? '0 0 0 3px var(--vf-action-soft)' : undefined,
      }}
    >
      {current && !compact ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 18,
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            backgroundColor: 'var(--mantine-color-text)',
            color: 'var(--mantine-color-body)',
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 6,
          }}
        >
          Week {week.number}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '100%',
              transform: 'translateX(-50%)',
              border: '4px solid transparent',
              borderTopColor: 'var(--mantine-color-text)',
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

function PhaseFooter({ phase, compact }: { phase: PhaseMapPhase; compact: boolean }) {
  const isCurrent = phase.weeks.some((week) => week.isCurrent)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 5 : 7,
        marginTop: compact ? 8 : 9,
        paddingTop: compact ? 0 : 9,
        borderTop: compact ? undefined : '1px solid var(--mantine-color-default-border)',
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          flex: 'none',
          backgroundColor: isCurrent ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default-border)',
        }}
      />
      <Text size="xs" fw={700} truncate>
        {phase.label}
      </Text>
      {!compact ? (
        <Text size="xs" tone="dimmed" style={{ whiteSpace: 'nowrap' }}>
          · {phase.range}
        </Text>
      ) : null}
    </div>
  )
}

function segmentColor(status: PhaseMapWeek['status']) {
  return status === 'upcoming' ? 'var(--mantine-color-default-border)' : 'var(--mantine-primary-color-filled)'
}
