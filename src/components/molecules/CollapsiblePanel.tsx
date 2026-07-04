import { Collapse, UnstyledButton } from '@mantine/core'
import { ChevronDown } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Caption, Text } from '~/components/atoms'
import { Panel, type PanelProps } from './Panel'

export interface CollapsiblePanelProps extends Omit<PanelProps, 'title' | 'children'> {
  title: string
  /** Node rendered before the title, e.g. a status dot. */
  leading?: ReactNode
  /** Dimmed one-line teaser under the title. */
  summary?: ReactNode
  defaultOpened?: boolean
  children: ReactNode
}

/** Panel whose header row toggles an expandable body — progressive-disclosure drawer. */
export function CollapsiblePanel({
  title,
  leading,
  summary,
  defaultOpened = false,
  children,
  ...panelProps
}: CollapsiblePanelProps) {
  const [opened, setOpened] = useState(defaultOpened)
  const contentId = useId()
  return (
    <Panel p={0} {...panelProps}>
      <UnstyledButton
        type="button"
        aria-expanded={opened}
        aria-controls={contentId}
        onClick={() => setOpened((current) => !current)}
        className="flex w-full items-center gap-3"
        /* Inline padding: UnstyledButton's unlayered `padding: 0` reset beats layered Tailwind utilities. */
        style={{ padding: '14px 16px' }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {leading}
            <Text size="sm" fw={800}>
              {title}
            </Text>
          </div>
          {summary ? (
            /* 16px = leading dot (8px) + gap (8px), so the summary lines up under the title text. */
            <Caption truncate style={leading ? { paddingLeft: 16 } : undefined}>
              {summary}
            </Caption>
          ) : null}
        </div>
        <ChevronDown
          size={16}
          color="var(--mantine-color-dimmed)"
          style={{
            flexShrink: 0,
            transform: opened ? 'rotate(180deg)' : 'none',
            transition: 'transform 150ms ease',
          }}
        />
      </UnstyledButton>
      <Collapse expanded={opened} id={contentId}>
        <div className="px-4 pb-4 pt-1">{children}</div>
      </Collapse>
    </Panel>
  )
}
