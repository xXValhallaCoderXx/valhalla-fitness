import { useState } from 'react'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-slate-700/70 bg-slate-900/70 p-4 ${className}`}>{children}</div>
}

export function Collapsible({
  title,
  summary,
  children,
  defaultOpen = false,
  className = '',
}: {
  title: ReactNode
  summary?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className={`p-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block font-semibold">{title}</span>
          {summary && <span className="mt-0.5 block truncate text-sm text-slate-400">{summary}</span>}
        </span>
        <Glyph name={open ? 'chevron-up' : 'chevron-down'} className="h-5 w-5 shrink-0 text-slate-400" />
      </button>
      {open && <div className="border-t border-slate-800 px-4 py-4">{children}</div>}
    </Card>
  )
}

type Variant = 'primary' | 'ghost' | 'danger' | 'subtle' | 'success'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-indigo-500 text-white hover:bg-indigo-400 active:bg-indigo-600',
  subtle: 'bg-slate-800 text-slate-100 hover:bg-slate-700',
  ghost: 'bg-transparent text-slate-300 hover:bg-slate-800 border border-slate-700',
  danger: 'bg-red-500/90 text-white hover:bg-red-500',
  success: 'bg-emerald-500 text-white hover:bg-emerald-400',
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: { children: ReactNode; variant?: Variant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-lg px-4 py-3 font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function IconButton({
  label,
  children,
  className = '',
  ...props
}: { label: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition-colors hover:bg-slate-800 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  return (
    <div className="grid w-32 grid-cols-[2.5rem_1fr_2.5rem] items-center overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
      <button
        type="button"
        aria-label="decrease"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="h-10 text-xl leading-none text-white active:bg-slate-700"
      >
        -
      </button>
      <span className="text-center text-lg font-bold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="increase"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="h-10 text-xl leading-none text-white active:bg-slate-700"
      >
        +
      </button>
    </div>
  )
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${
            o.value === value ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-left"
    >
      <span className="text-sm font-medium">{label}</span>
      <span className={`h-6 w-11 rounded-full p-0.5 ${checked ? 'bg-indigo-500' : 'bg-slate-700'}`}>
        <span
          className={`block h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase text-slate-400">{label}</span>
      {children}
    </label>
  )
}

export function NumberInput({
  value,
  onChange,
  step = 2.5,
  suffix,
  ...props
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  suffix?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'step'>) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-lg tabular-nums outline-none focus:border-indigo-500"
        {...props}
      />
      {suffix && <span className="text-slate-400">{suffix}</span>}
    </div>
  )
}

export function Select({
  children,
  className = '',
  ...props
}: { children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-indigo-500 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

export function TextArea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-indigo-500 ${className}`}
      {...props}
    />
  )
}

export function Glyph({
  name,
  className = 'h-5 w-5',
}: {
  name:
    | 'today'
    | 'plan'
    | 'chart'
    | 'blocks'
    | 'mobility'
    | 'settings'
    | 'swap'
    | 'timer'
    | 'check'
    | 'plus'
    | 'chevron-down'
    | 'chevron-up'
  className?: string
}) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
  }
  const paths: Record<typeof name, ReactNode> = {
    today: (
      <>
        <path d="M6 3v18" />
        <path d="M18 3v18" />
        <path d="M3 8h18" />
        <path d="M3 16h18" />
      </>
    ),
    plan: (
      <>
        <path d="M5 4h14" />
        <path d="M5 9h14" />
        <path d="M5 14h10" />
        <path d="M5 19h7" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 4-4 3 3 5-7" />
      </>
    ),
    blocks: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </>
    ),
    mobility: (
      <>
        <path d="M12 4v5" />
        <path d="M8 20 12 9l4 11" />
        <path d="M5 12h14" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3" />
        <path d="M12 19v3" />
        <path d="m4.9 4.9 2.1 2.1" />
        <path d="m17 17 2.1 2.1" />
        <path d="M2 12h3" />
        <path d="M19 12h3" />
        <path d="m4.9 19.1 2.1-2.1" />
        <path d="m17 7 2.1-2.1" />
      </>
    ),
    swap: (
      <>
        <path d="M7 7h11l-3-3" />
        <path d="M17 17H6l3 3" />
      </>
    ),
    timer: (
      <>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 13V8" />
        <path d="M9 2h6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    'chevron-down': <path d="m6 9 6 6 6-6" />,
    'chevron-up': <path d="m18 15-6-6-6 6" />,
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} {...common}>
      {paths[name]}
    </svg>
  )
}
