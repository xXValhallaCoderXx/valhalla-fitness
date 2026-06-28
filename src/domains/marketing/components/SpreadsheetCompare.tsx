import { AlertTriangle, ArrowRight, Check, CheckCircle2 } from 'lucide-react'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import { comparisonCopy } from '~/domains/marketing/lib/marketing-content'

const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace'

type Cell = { value: string; error?: boolean; muted?: boolean }
const sheetRows: { week: string; cells: Cell[] }[] = [
  { week: 'W1', cells: [{ value: '100' }, { value: '80' }, { value: '112' }] },
  { week: 'W2', cells: [{ value: '102.5' }, { value: '82.5' }, { value: '114' }] },
  { week: 'W3', cells: [{ value: '105' }, { value: '#REF!', error: true }, { value: '117' }] },
  { week: 'W4', cells: [{ value: '107.5' }, { value: '=B7', muted: true }, { value: '119' }] },
  { week: 'W5', cells: [{ value: '110' }, { value: 'ERR', error: true }, { value: '??', muted: true }] },
]

const afterChips = ['Est. 1RM 108 kg', 'Fatigue Fresh', 'Working-load LP']

function SheetCell({ cell }: { cell: Cell }) {
  return (
    <div
      className="px-2 py-1.5"
      style={{
        borderTop: '1px solid var(--mantine-color-default-border)',
        backgroundColor: cell.error ? 'var(--vf-danger-soft)' : undefined,
        color: cell.error
          ? 'var(--vf-danger-text)'
          : cell.muted
            ? 'var(--mantine-color-dimmed)'
            : 'var(--mantine-color-text)',
        fontWeight: cell.error ? 700 : 500,
      }}
    >
      {cell.value}
    </div>
  )
}

export function SpreadsheetCompare() {
  return (
    <section className="px-4 py-12 md:px-6 md:py-20">
      <div className="mx-auto max-w-[1120px]">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>{comparisonCopy.eyebrow}</SectionLabel>
          <Heading order={2} size="2rem" lh={1.1} mt="xs">
            {comparisonCopy.heading}
          </Heading>
          <Text component="p" tone="dimmed" fw={600} mt="sm" className="mx-auto" maw="38rem">
            {comparisonCopy.subhead}
          </Text>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 md:gap-9">
          {/* Before — the spreadsheet */}
          <div className="min-w-0 flex-1 basis-[22rem] md:max-w-[28rem]">
            <div className="mb-3 inline-flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-sm"
                style={{ backgroundColor: 'var(--vf-danger-text)' }}
              />
              <Caption fw={800} tt="uppercase" tone="danger">
                {comparisonCopy.beforeLabel}
              </Caption>
            </div>
            <Panel p={0} className="overflow-hidden">
              <Caption
                component="div"
                fw={700}
                className="px-3 py-2"
                style={{
                  backgroundColor: 'var(--vf-surface-3)',
                  borderBottom: '1px solid var(--mantine-color-default-border)',
                }}
              >
                Lifting Log 2024.xlsx
              </Caption>
              <div
                className="flex items-center gap-2 px-3 py-1.5"
                style={{
                  fontFamily: mono,
                  fontSize: '0.66rem',
                  color: 'var(--mantine-color-dimmed)',
                  backgroundColor: 'var(--vf-surface-2)',
                  borderBottom: '1px solid var(--mantine-color-default-border)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                <span
                  className="rounded-sm px-1.5 italic"
                  style={{ border: '1px solid var(--mantine-color-default-border)' }}
                >
                  fx
                </span>
                =ROUND(B7*(1+0.0333*C7)/2.5)*2.5
              </div>
              <div style={{ fontFamily: mono, fontSize: '0.72rem' }}>
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: '2.2rem repeat(3, 1fr)',
                    backgroundColor: 'var(--vf-surface-2)',
                    color: 'var(--mantine-color-dimmed)',
                    fontWeight: 700,
                  }}
                >
                  <div className="px-2 py-1.5" />
                  <div className="px-2 py-1.5">SQUAT</div>
                  <div className="px-2 py-1.5">BENCH</div>
                  <div className="px-2 py-1.5">e1RM</div>
                </div>
                {sheetRows.map((row) => (
                  <div key={row.week} className="grid" style={{ gridTemplateColumns: '2.2rem repeat(3, 1fr)' }}>
                    <div
                      className="px-2 py-1.5"
                      style={{
                        borderTop: '1px solid var(--mantine-color-default-border)',
                        backgroundColor: 'var(--vf-surface-2)',
                        color: 'var(--mantine-color-dimmed)',
                        fontWeight: 700,
                      }}
                    >
                      {row.week}
                    </div>
                    {row.cells.map((cell, i) => (
                      <SheetCell key={i} cell={cell} />
                    ))}
                  </div>
                ))}
              </div>
            </Panel>
            <div className="mt-3 flex items-center gap-2">
              <AlertTriangle color="var(--vf-danger-text)" size={15} className="shrink-0" />
              <Caption fw={600}>{comparisonCopy.beforeFootnote}</Caption>
            </div>
          </div>

          {/* Bridge */}
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{
                backgroundColor: 'var(--vf-action-soft)',
                border: '1px solid var(--vf-action-border)',
              }}
            >
              <ArrowRight color="var(--vf-action-text)" size={20} />
            </div>
            <Caption fw={700} tone="action" className="max-w-[6rem] text-center">
              {comparisonCopy.bridge}
            </Caption>
          </div>

          {/* After — Sheetless */}
          <div className="min-w-0 flex-1 basis-[22rem] md:max-w-[28rem]">
            <div className="mb-3 inline-flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-sm"
                style={{ backgroundColor: 'var(--vf-action-text)' }}
              />
              <Caption fw={800} tt="uppercase" tone="action">
                {comparisonCopy.afterLabel}
              </Caption>
            </div>
            <Panel p={0} className="overflow-hidden">
              <div
                className="flex items-center justify-between gap-3 px-4 py-3"
                style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
              >
                <Heading order={3} size="0.95rem" lh={1.2}>
                  Squat · Week 4
                </Heading>
                <span
                  className="rounded-full px-2.5 py-1"
                  style={{
                    backgroundColor: 'var(--vf-success-soft)',
                    border: '1px solid var(--vf-success-border)',
                  }}
                >
                  <Caption fw={800} tt="uppercase" tone="success">
                    On track
                  </Caption>
                </span>
              </div>
              <div className="p-4">
                <SectionLabel>Next session</SectionLabel>
                <Heading order={3} size="1.85rem" lh={1.1} mt={4}>
                  90 kg{' '}
                  <Text component="span" inherit tone="dimmed">
                    × 5
                  </Text>
                </Heading>
                <div className="mt-4 grid gap-3">
                  <div className="flex gap-2.5">
                    <CheckCircle2 color="var(--vf-success-text)" size={17} className="mt-0.5 shrink-0" />
                    <Text component="p" size="sm" tone="dimmed" fw={600}>
                      You hit <b style={{ color: 'var(--mantine-color-text)' }}>87.5 × 5 at RIR 1–2</b> — clean
                      reps with effort to spare.
                    </Text>
                  </div>
                  <div className="flex gap-2.5">
                    <CheckCircle2 color="var(--vf-success-text)" size={17} className="mt-0.5 shrink-0" />
                    <Text component="p" size="sm" tone="dimmed" fw={600}>
                      That clears the progression rule, so we{' '}
                      <b style={{ color: 'var(--mantine-color-text)' }}>add 2.5 kg</b> next time.
                    </Text>
                  </div>
                </div>
                <div
                  className="mt-4 flex flex-wrap gap-2 pt-4"
                  style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
                >
                  {afterChips.map((chip) => (
                    <span key={chip} className="vf-chip">
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </Panel>
            <div className="mt-3 flex items-center gap-2">
              <Check color="var(--vf-action-text)" size={15} className="shrink-0" />
              <Caption fw={600}>{comparisonCopy.afterFootnote}</Caption>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
