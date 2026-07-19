import { Cloud, Dumbbell, Gauge, Scale, SlidersHorizontal, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import { prefersReducedMotion } from '~/shared/lib/reduced-motion'

export const settingsSections = [
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
  { id: 'body-strength', label: 'Body & Strength', icon: Scale },
  { id: 'programme-loads', label: 'Strength Estimates', icon: Gauge },
  { id: 'equipment', label: 'Equipment', icon: Dumbbell },
  { id: 'data-sync', label: 'Data & Sync', icon: Cloud },
  { id: 'account', label: 'Account', icon: User },
]

export const sectionIds = settingsSections.map((section) => section.id)

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  })
}

export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? '')
  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element))
    if (!elements.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-72px 0px -55% 0px', threshold: 0 },
    )
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [ids])
  return active
}

export function SettingsSidebar({ active }: { active: string }) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-0 flex flex-col gap-3">
        <Panel p="xs" className="flex flex-col">
          <SectionLabel className="px-2 pb-1 pt-1">Settings</SectionLabel>
          {settingsSections.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(event) => {
                  event.preventDefault()
                  scrollToSection(item.id)
                }}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors focus-visible:outline-none"
                style={{
                  backgroundColor: isActive ? 'var(--vf-action-soft)' : undefined,
                  color: isActive ? 'var(--vf-action-text)' : 'var(--mantine-color-dimmed)',
                }}
              >
                <Icon size={16} color="currentColor" />
                <Text component="span" size="sm" fw={700} c="currentColor">{item.label}</Text>
              </a>
            )
          })}
        </Panel>
        <Panel surface="inset" p="sm">
          <div className="flex items-center gap-2">
            <Cloud size={16} color="var(--vf-action-text)" />
            <Text size="sm" fw={800}>Local-first</Text>
          </div>
          <Caption mt={6} lh={1.45}>
            Changes save on this device and sync to your Supabase account automatically.
          </Caption>
        </Panel>
      </div>
    </aside>
  )
}
