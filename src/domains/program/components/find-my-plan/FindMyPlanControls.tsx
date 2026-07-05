import { Check, Sparkles, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Caption, Text } from '~/components'

export function ModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--vf-action-soft)', border: '1px solid var(--vf-action-border)' }}
        >
          <Sparkles size={16} color="var(--vf-action-text)" />
        </span>
        <Text component="span" fw={800}>
          Find my plan
        </Text>
      </div>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="flex h-8 w-8 items-center justify-center rounded-lg transition"
        style={{ color: 'var(--mantine-color-dimmed)' }}
      >
        <X size={18} />
      </button>
    </div>
  )
}

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--vf-surface-3)' }}>
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${pct}%`, backgroundColor: 'var(--vf-action-text)' }}
      />
    </div>
  )
}

export function OptionCard({
  selected,
  label,
  sub,
  onClick,
}: {
  selected: boolean
  label: string
  sub: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition"
      style={{
        borderColor: selected ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default-border)',
        backgroundColor: selected ? 'var(--vf-action-soft)' : 'var(--mantine-color-default)',
      }}
    >
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
        style={{
          borderColor: selected ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default-border)',
          backgroundColor: selected ? 'var(--mantine-primary-color-filled)' : 'transparent',
        }}
      >
        {selected ? <Check size={12} color="white" /> : null}
      </span>
      <span className="min-w-0">
        <Text component="span" size="sm" fw={700} className="block">
          {label}
        </Text>
        <Caption component="span" className="block">
          {sub}
        </Caption>
      </span>
    </button>
  )
}

export function Reassurance({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--vf-action-soft)' }}>
        {icon}
      </span>
      <Text component="span" size="sm" fw={600}>
        {children}
      </Text>
    </div>
  )
}
