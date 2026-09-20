import { Tabs } from '@mantine/core'
import type { ReactNode } from 'react'
import { useExperienceMode } from '~/domains/account/components'
import { HISTORY_TAB_VALUES, type HistoryTab } from '~/domains/history/lib/history-tabs'
import { insightTabLabel } from '~/domains/history/lib/insight-labels'

/**
 * The tab bar, as the comp's underline rail.
 *
 * Still a Mantine `Tabs` — it carries `role="tab"`, `aria-selected`, panel wiring and roving focus,
 * all of which the e2e reads. The icons the pill version had are gone: the design has none, and a
 * bare label is also a cleaner accessible name.
 */
export function InsightTabs({
  value,
  onChange,
  children,
}: {
  value: HistoryTab
  onChange: (tab: HistoryTab) => void
  children: ReactNode
}) {
  const { mode } = useExperienceMode()
  return (
    <Tabs
      variant="default"
      keepMounted={false}
      value={value}
      onChange={(next) => onChange((next as HistoryTab | null) ?? 'overview')}
      classNames={{
        // Still scrollable: six labels do not fit a phone, and the rail is the only way between tabs.
        list: 'mb-5 !flex !flex-nowrap overflow-x-auto px-0 no-scrollbar',
        // `vf-insight-tab` carries the active state. It cannot live in `styles` below: Mantine 9
        // resolves that prop into an inline style object, where a `[data-active]` selector has
        // nowhere to go. No `border-0` here either — `variant="default"` already gives every tab a
        // transparent 2px bottom border for exactly this, and zeroing it removes the underline.
        tab: 'vf-insight-tab !shrink-0 !rounded-none !px-0.5 !pb-3 !pt-2',
        panel: 'focus-visible:outline-none',
      }}
      styles={{
        // Gap goes here, not in `className`: Mantine ships its Tabs CSS unlayered, so it beats a
        // layered Tailwind utility and the labels run together. The list rule is Mantine's own —
        // drawing a second one here would double the hairline.
        list: { gap: '1.5rem', '--tab-border-color': 'var(--mantine-color-default-border)' },
      }}
    >
      <Tabs.List>
        {HISTORY_TAB_VALUES.map((tab) => (
          <Tabs.Tab key={tab} value={tab}>
            {insightTabLabel(tab, mode)}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {children}
    </Tabs>
  )
}
