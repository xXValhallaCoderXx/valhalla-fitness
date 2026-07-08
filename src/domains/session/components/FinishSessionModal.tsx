import { Button, Modal, TextInput } from '@mantine/core'
import { useState } from 'react'
import { Caption, SectionLabel } from '~/components'
import {
  REFLECTION_MAX_LENGTH,
  SESSION_RPE_MAX,
  SESSION_RPE_MIN,
  reflectionImprovePrompt,
  reflectionWinPrompt,
  sessionRpeEndLabels,
  sessionRpeQuestion,
} from '~/domains/session/lib/session-reflection'
import { StatusPanel } from './LiveSessionControls'
import { insetFieldStyles } from './form-styles'

export type FinishReflection = {
  sessionRpe: number | null
  reflectionWin: string | null
  reflectionImprove: string | null
}

const EFFORT_OPTIONS = Array.from(
  { length: SESSION_RPE_MAX - SESSION_RPE_MIN + 1 },
  (_, index) => SESSION_RPE_MIN + index,
)

/**
 * The one moment we ask how the workout felt. Everything here is optional —
 * the primary button always finishes immediately, rating or no rating.
 */
export function FinishSessionModal({
  open,
  incompleteSetCount,
  isPending,
  onCancel,
  onFinish,
}: {
  open: boolean
  incompleteSetCount: number
  isPending: boolean
  onCancel: () => void
  onFinish: (reflection: FinishReflection) => void
}) {
  const [effort, setEffort] = useState<number | null>(null)
  const [win, setWin] = useState('')
  const [improve, setImprove] = useState('')

  return (
    <Modal
      opened={open}
      onClose={() => {
        if (!isPending) onCancel()
      }}
      title="Nice work — how did it go?"
      size="sm"
      styles={{
        content: {
          border: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'var(--mantine-color-default)',
          color: 'var(--mantine-color-text)',
        },
        header: {
          backgroundColor: 'var(--mantine-color-default)',
          color: 'var(--mantine-color-text)',
        },
        title: {
          color: 'var(--mantine-color-text)',
          fontWeight: 700,
        },
        close: { color: 'var(--mantine-color-dimmed)' },
      }}
    >
      {/* The testid lives on the content, not the Modal root — the root has no
          bounding box, so Playwright would report it hidden even when open. */}
      <div className="space-y-4" data-testid="finish-session-modal">
        {incompleteSetCount > 0 ? (
          // Plain div wrapper: space-y-4 puts its margin on the child, and
          // Mantine's unlayered Text reset would zero it on the panel itself.
          <div>
            <StatusPanel tone="warning">
              You have {incompleteSetCount} set{incompleteSetCount === 1 ? '' : 's'} left to log. Finishing now is fine —
              Sheetless only uses the sets you&apos;ve logged and won&apos;t make aggressive changes.
            </StatusPanel>
          </div>
        ) : null}

        <div>
          <SectionLabel>{sessionRpeQuestion}</SectionLabel>
          <div className="mt-1.5 grid grid-cols-5 gap-1.5">
            {EFFORT_OPTIONS.map((option) => {
              const selected = effort === option
              return (
                <button
                  key={option}
                  type="button"
                  aria-label={`Effort ${option} of ${SESSION_RPE_MAX}`}
                  aria-pressed={selected}
                  className="rounded-lg border py-2 transition"
                  style={{
                    borderColor: selected ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default-border)',
                    backgroundColor: selected ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default)',
                    color: selected ? 'white' : 'var(--mantine-color-text)',
                    fontSize: 'var(--mantine-font-size-sm)',
                    fontWeight: 700,
                  }}
                  onClick={() => setEffort(selected ? null : option)}
                >
                  {option}
                </button>
              )
            })}
          </div>
          <div className="mt-1 flex justify-between">
            <Caption size="0.625rem">{sessionRpeEndLabels.low}</Caption>
            <Caption size="0.625rem">{sessionRpeEndLabels.high}</Caption>
          </div>
        </div>

        <label className="grid gap-1">
          <SectionLabel>{reflectionWinPrompt}</SectionLabel>
          <TextInput
            value={win}
            onChange={(event) => setWin(event.target.value)}
            maxLength={REFLECTION_MAX_LENGTH}
            placeholder="Optional"
            styles={insetFieldStyles}
          />
        </label>
        <label className="grid gap-1">
          <SectionLabel>{reflectionImprovePrompt}</SectionLabel>
          <TextInput
            value={improve}
            onChange={(event) => setImprove(event.target.value)}
            maxLength={REFLECTION_MAX_LENGTH}
            placeholder="Optional"
            styles={insetFieldStyles}
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="default" disabled={isPending} onClick={onCancel}>
            Keep going
          </Button>
          <Button
            type="button"
            loading={isPending}
            onClick={() =>
              onFinish({
                sessionRpe: effort,
                reflectionWin: win.trim() || null,
                reflectionImprove: improve.trim() || null,
              })
            }
          >
            Finish workout
          </Button>
        </div>
      </div>
    </Modal>
  )
}
