import { Heading, Panel, SectionLabel, Text } from '~/components'
import { useExperienceMode } from '~/domains/account/components'
import { programLoadReferenceCopy } from '@sheetless/domain/program/program-loads'
import { stateChangeProvenance } from '@sheetless/domain/program/load-trace'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import type { ProgramInstance, ProgramStateOverview } from '~/domains/program'

const NUMERIC = { fontVariantNumeric: 'tabular-nums' } as const

/**
 * The four numbers every planned load is a share of.
 *
 * Guided lists lift and value. Full adds the provenance of the last change, because in Full the
 * question is not just "what is it" but "what moved it". The heading copy comes from
 * `programLoadReferenceCopy` so it stays the single source of the Guided/Full vocabulary split.
 */
export function ProgramReferenceTable({
  states,
  program,
}: {
  states: ProgramStateOverview[]
  program: ProgramInstance
}) {
  const { mode, isFull } = useExperienceMode()
  const copy = programLoadReferenceCopy(mode, program.rounding)

  return (
    <section data-testid="program-reference-table">
      <div className="flex items-baseline justify-between gap-3">
        <Heading order={2} size="h4" lh={1.2}>
          {copy.label}
        </Heading>
        {isFull ? <SectionLabel>{program.units}</SectionLabel> : null}
      </div>

      {states.length ? (
        <div className="mt-3 hidden md:block">
          {states.map((state, index) => {
            const provenance = isFull ? stateChangeProvenance(state, state.units ?? program.units) : null
            return (
              <div
                key={state.stateKey}
                className="flex items-center justify-between gap-3 py-3"
                style={{ borderTop: index ? '1px solid var(--mantine-color-default-border)' : undefined }}
              >
                <div className="min-w-0">
                  <Text size="sm" fw={600} truncate>
                    {state.movementName}
                  </Text>
                  {provenance ? (
                    <Text component="p" mt={1} size="xs" tone="dimmed" style={NUMERIC} lineClamp={2}>
                      {provenance}
                    </Text>
                  ) : null}
                  {state.pendingDecision ? (
                    <Text component="p" mt={1} size="xs" fw={600} tone="warning">
                      pending review
                    </Text>
                  ) : null}
                </div>
                <Text size="md" fw={800} className="shrink-0" style={NUMERIC}>
                  {formatWeight(state.value, state.units ?? program.units)}
                </Text>
              </div>
            )
          })}
        </div>
      ) : (
        <Text mt="sm" size="sm" tone="dimmed">
          No reference numbers yet — they appear once the programme has its starting weights.
        </Text>
      )}

      {/* Phone shows the same four numbers as tiles (04c) — same heading above, so the
          Guided/Full vocabulary string appears exactly once at every width. */}
      {states.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2 md:hidden">
          {states.slice(0, 4).map((state) => (
            <Panel key={state.stateKey} surface="inset" p="sm" className="min-w-0">
              <Text size="xs" fw={600} tone="dimmed" truncate>
                {state.movementName}
              </Text>
              <Text mt={2} size="md" fw={800} style={NUMERIC}>
                {formatWeight(state.value, state.units ?? program.units)}
              </Text>
            </Panel>
          ))}
        </div>
      ) : null}

      <Text component="p" mt="sm" size="sm" tone="dimmed" lh={1.5}>
        {copy.caption}
      </Text>

      {program.lastLoadResetAt ? (
        <Text component="p" mt={4} size="xs" tone="dimmed">
          Return reset recorded {program.lastLoadResetAt.slice(0, 10)}. Historical workouts retain their
          original results.
        </Text>
      ) : null}
    </section>
  )
}
