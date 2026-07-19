import { ArrowRight, RotateCcw } from 'lucide-react'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import {
  buildIntensityRamp,
  buildPhaseChangeLine,
  type TemplatePhase,
  type TemplateStructureMode,
} from '~/domains/program/lib/template-start-phases'
import type { ProgramSetupPreviewWeek } from '~/shared/types'

/** "Base phase" → "Base". */
function shortPhaseName(label: string) {
  return label.replace(/\s+phase$/i, '')
}

function representativeRole(week: ProgramSetupPreviewWeek, role: 'main' | 'variation') {
  for (const session of week.sessions) {
    const movement = session.movements.find((item) => item.role === role)
    if (movement) return movement
  }
  return undefined
}

/**
 * The "Programme blocks" card at the top of the overview: an intensity ramp + clickable Base/Peak
 * phase cards + the Base→Peak change line for phased programmes, or a "one repeating week" strip for
 * weekly ones. Returns null for multi-layout `cycle` programmes (the week-plan layout tabs cover those).
 */
export function ProgrammeBlocksCard({
  mode,
  phases,
  activePhaseKey,
  weeks,
  onSelectPhase,
}: {
  mode: TemplateStructureMode
  phases: TemplatePhase[]
  activePhaseKey: string
  weeks: ProgramSetupPreviewWeek[]
  onSelectPhase: (firstWeekIndex: number) => void
}) {
  if (mode === 'weekly') return <ProgrammeWeeklyStrip weeks={weeks} />
  if (mode !== 'phased' || phases.length < 2) return null
  return <ProgrammeBlockTimeline phases={phases} activePhaseKey={activePhaseKey} weeks={weeks} onSelectPhase={onSelectPhase} />
}

function ProgrammeBlockTimeline({
  phases,
  activePhaseKey,
  weeks,
  onSelectPhase,
}: {
  phases: TemplatePhase[]
  activePhaseKey: string
  weeks: ProgramSetupPreviewWeek[]
  onSelectPhase: (firstWeekIndex: number) => void
}) {
  const ramp = buildIntensityRamp(weeks)

  return (
    <Panel p={0}>
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <SectionLabel>Programme blocks</SectionLabel>
          <Caption>
            {weeks.length} weeks · {phases.length} phases
          </Caption>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <Caption fw={700}>{ramp.hasRealIntensity ? `${ramp.startLabel} intensity` : 'Lower intensity'}</Caption>
            <Caption fw={700} tone="action">{ramp.hasRealIntensity ? `${ramp.endLabel} intensity` : 'Higher intensity'}</Caption>
          </div>
          <svg viewBox="0 0 1000 120" preserveAspectRatio="none" style={{ width: '100%', height: 104, display: 'block' }} aria-hidden="true">
            <defs>
              <linearGradient id="vf-ramp-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: 'var(--vf-action-text)', stopOpacity: 0.16 }} />
                <stop offset="1" style={{ stopColor: 'var(--vf-action-text)', stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            <path d={ramp.areaPath} fill="url(#vf-ramp-gradient)" />
            <path
              d={ramp.linePath}
              fill="none"
              style={{ stroke: 'var(--vf-action-text)' }}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {phases.map((phase) => {
            const main = representativeRole(phase.representativeWeek, 'main')
            const variation = representativeRole(phase.representativeWeek, 'variation')
            const active = phase.phaseKey === activePhaseKey
            return (
              <button
                key={phase.phaseKey}
                type="button"
                onClick={() => onSelectPhase(phase.firstWeekIndex)}
                className="rounded-xl border p-3 transition"
                style={{
                  borderColor: active ? 'var(--vf-action-border)' : 'var(--mantine-color-default-border)',
                  backgroundColor: active ? 'var(--vf-action-soft)' : 'var(--mantine-color-default)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: active ? 'var(--vf-action-text)' : 'var(--mantine-color-dimmed)' }}
                    />
                    <Text size="sm" fw={800}>{phase.phaseLabel}</Text>
                  </div>
                  <Caption fw={700} tone={active ? 'action' : 'dimmed'}>{phase.weekRange}</Caption>
                </div>
                <div className="mt-2.5 flex gap-2">
                  {main ? <PhaseSchemeTile label="Main" value={main.targetSummary} /> : null}
                  {variation ? <PhaseSchemeTile label="Variation" value={variation.targetSummary} /> : null}
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-3 grid gap-2">
          {phases.slice(0, -1).map((phase, index) => (
            <PhaseChangeLineRow key={phase.phaseKey} fromPhase={phase} toPhase={phases[index + 1]!} />
          ))}
        </div>
      </div>
    </Panel>
  )
}

function PhaseSchemeTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="min-w-0 flex-1 rounded-lg border p-2"
      style={{ borderColor: 'var(--mantine-color-default-border)', backgroundColor: 'var(--vf-surface-2)' }}
    >
      <SectionLabel size="0.5625rem">{label}</SectionLabel>
      <Text mt={2} size="sm" fw={800} truncate>{value}</Text>
    </div>
  )
}

function PhaseChangeLineRow({ fromPhase, toPhase }: { fromPhase: TemplatePhase; toPhase: TemplatePhase }) {
  const changeLine = buildPhaseChangeLine(fromPhase, toPhase)
  if (!changeLine.entries.length && !changeLine.accessoriesUnchanged) return null

  return (
    <Panel surface="inset" p="sm">
      <SectionLabel>
        {shortPhaseName(fromPhase.phaseLabel)} → {shortPhaseName(toPhase.phaseLabel)}
      </SectionLabel>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {changeLine.entries.map((entry) => (
          <span key={`${entry.label}-${entry.from}-${entry.to}`} className="inline-flex items-center gap-1.5">
            <Text component="span" size="xs" fw={800}>{entry.label}</Text>
            <Caption component="span">{entry.from}</Caption>
            <ArrowRight size={12} color="var(--vf-action-text)" />
            <Text component="span" size="xs" fw={800} tone="action">{entry.to}</Text>
          </span>
        ))}
        {changeLine.accessoriesUnchanged ? <Caption component="span">Accessories stay put</Caption> : null}
      </div>
    </Panel>
  )
}

function ProgrammeWeeklyStrip({ weeks }: { weeks: ProgramSetupPreviewWeek[] }) {
  const week = weeks[0]
  if (!week) return null

  return (
    <Panel p={0}>
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <SectionLabel>Programme structure</SectionLabel>
          <Caption>{weeks.length} weeks</Caption>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--vf-action-soft)' }}
          >
            <RotateCcw size={22} color="var(--vf-action-text)" />
          </div>
          <div className="min-w-0">
            <Text size="md" fw={800}>One repeating week — no phases</Text>
            <Text size="sm" tone="dimmed">{week.summary}</Text>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {week.sessions.map((session) => (
            <div
              key={session.id}
              className="min-w-0 rounded-xl border p-3"
              style={{ borderColor: 'var(--mantine-color-default-border)', backgroundColor: 'var(--vf-surface-2)' }}
            >
              <SectionLabel size="0.5625rem">{session.label}</SectionLabel>
              <Text mt={2} size="sm" fw={800} truncate>{session.title}</Text>
              <Caption lineClamp={2}>{session.movementSummary}</Caption>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}
