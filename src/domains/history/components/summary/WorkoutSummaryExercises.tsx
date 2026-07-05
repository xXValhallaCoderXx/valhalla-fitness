import { Check, ChevronDown, FileText, Star, Trophy } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import type { AccentTone, EffortTone, SummaryExercise, WorkoutSummaryModel } from '~/domains/history/lib/workout-summary'
import { TONE_SOFT, TONE_TEXT } from './summary-tones'

export function SessionBest({ best }: { best: NonNullable<WorkoutSummaryModel['sessionBest']> }) {
  const subtle = 'rgba(255,255,255,0.72)'
  return (
    <div className="flex items-center gap-3.5 rounded-2xl p-4" style={{ backgroundColor: 'var(--mantine-color-action-9)' }}>
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
        <Trophy size={20} color="#fff" />
      </span>
      <div className="min-w-0 flex-1">
        <Text size="0.625rem" fw={700} tt="uppercase" style={{ letterSpacing: '0.07em', color: subtle }}>Session best</Text>
        <Text fw={800} truncate mt={2} style={{ color: '#fff' }}>{best.movementName} · {best.resultLabel}</Text>
      </div>
      <div className="flex-none text-right">
        <Text fw={800} style={{ color: '#fff' }}>{best.e1rmLabel}</Text>
        <Text size="0.625rem" fw={700} tt="uppercase" style={{ letterSpacing: '0.05em', color: subtle }}>
          e1RM{best.rir != null ? ` · RIR ${best.rir}` : ''}
        </Text>
      </div>
    </div>
  )
}

export function ExerciseCard({ exercise }: { exercise: SummaryExercise }) {
  const [open, setOpen] = useState(exercise.defaultOpen)
  return (
    <div className="relative overflow-hidden rounded-xl" style={{ border: '1px solid var(--mantine-color-default-border)' }}>
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: TONE_TEXT[exercise.accentTone] }} />
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-3 py-3 pl-4 pr-3.5 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Text fw={800} truncate>{exercise.name}</Text>
            <span style={tagStyle(exercise.accentTone)}>{exercise.tagLabel}</span>
            {exercise.hitEveryTarget ? (
              <span className="inline-flex items-center gap-1" style={hitStyle}>
                <Check size={11} />Hit every target
              </span>
            ) : null}
          </div>
          <Caption mt={2} truncate>{exercise.targetSummary} · {exercise.volumeLabel}</Caption>
        </div>
        <div className="hidden flex-none text-right sm:block">
          <Text size="sm" fw={700}>{exercise.bestSetLabel}</Text>
          <Caption>best set</Caption>
        </div>
        <ChevronDown
          size={18}
          color="var(--mantine-color-dimmed)"
          className="flex-none"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
        />
      </button>
      {open ? (
        <div className="pb-3 pl-4 pr-3.5">
          <div className="grid grid-cols-[2rem_1fr_3rem] gap-3 px-2 pb-1 sm:grid-cols-[2.25rem_1fr_5.5rem]">
            <SectionLabel>Set</SectionLabel>
            <SectionLabel>Result</SectionLabel>
            <SectionLabel ta="center">RIR</SectionLabel>
          </div>
          {exercise.sets.map((set, index) => (
            <div
              key={`${set.index}-${index}`}
              className="grid grid-cols-[2rem_1fr_3rem] items-center gap-3 rounded-lg px-2 py-2 sm:grid-cols-[2.25rem_1fr_5.5rem]"
              style={set.isTop ? { backgroundColor: 'var(--vf-action-soft)' } : undefined}
            >
              <Text size="sm" fw={700} tone="dimmed">{set.index}</Text>
              <span className="flex min-w-0 items-center gap-2">
                <Text size="sm" fw={700} truncate tone={set.isTop ? 'action' : undefined}>{set.resultLabel}</Text>
                {set.isTop ? (
                  <span className="inline-flex items-center gap-1" style={topPillStyle}>
                    <Star size={10} fill="currentColor" stroke="none" />Top set
                  </span>
                ) : null}
              </span>
              <span className="justify-self-center" style={rirPillStyle(set.rirTone)}>{set.rir ?? '—'}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function NotesCard({ notes }: { notes: string }) {
  return (
    <Panel surface="inset" p="sm">
      <div className="flex items-start gap-3">
        <FileText size={16} color="var(--mantine-color-dimmed)" className="mt-0.5 flex-none" />
        <div>
          <SectionLabel>Session notes</SectionLabel>
          <Text size="sm" tone="dimmed" mt={2}>{notes}</Text>
        </div>
      </div>
    </Panel>
  )
}

export function StatusBlock({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'danger' }) {
  return (
    <div className="p-4 sm:p-5">
      <Panel
        p="sm"
        style={{
          borderColor: tone === 'danger' ? 'var(--vf-danger-border)' : 'var(--mantine-color-default-border)',
          backgroundColor: tone === 'danger' ? 'var(--vf-danger-soft)' : 'var(--vf-surface-2)',
        }}
      >
        <Text size="sm" tone={tone === 'danger' ? 'danger' : 'dimmed'}>{children}</Text>
      </Panel>
    </div>
  )
}

function tagStyle(tone: AccentTone): CSSProperties {
  return {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    padding: '3px 7px',
    borderRadius: 5,
    whiteSpace: 'nowrap',
    flex: 'none',
    color: TONE_TEXT[tone],
    backgroundColor: TONE_SOFT[tone],
  }
}

const hitStyle: CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  color: 'var(--vf-success-text)',
  backgroundColor: 'var(--vf-success-soft)',
  padding: '3px 8px',
  borderRadius: 99,
  whiteSpace: 'nowrap',
}

const topPillStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--vf-action-text)',
  backgroundColor: 'var(--vf-action-soft)',
  padding: '3px 8px',
  borderRadius: 99,
  whiteSpace: 'nowrap',
  flex: 'none',
}

function rirPillStyle(tone: EffortTone): CSSProperties {
  return {
    fontSize: 12.5,
    fontWeight: 700,
    padding: '4px 0',
    width: 44,
    textAlign: 'center',
    borderRadius: 99,
    color: TONE_TEXT[tone],
    backgroundColor: TONE_SOFT[tone],
  }
}
