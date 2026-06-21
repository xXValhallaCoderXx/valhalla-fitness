import { useEffect, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '~/lib/cn'

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn('mx-auto w-full max-w-6xl px-4 py-5 md:px-6', className)}>{children}</main>
}

export function PageHeader({
  title,
  eyebrow,
  actions,
  children,
}: {
  title: string
  eyebrow?: string
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-1 text-[10px] font-bold uppercase text-[var(--muted)]">{eyebrow}</p>
        ) : null}
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {children ? <div className="mt-1 text-sm text-[var(--muted)]">{children}</div> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4', className)}>
      {children}
    </section>
  )
}

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}) {
  const variants = {
    primary: 'bg-[var(--action)] text-white',
    secondary: 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]',
    danger: 'border border-red-900/40 bg-red-950/30 text-red-300',
    success: 'border border-emerald-700/40 bg-emerald-950/30 text-emerald-300',
    ghost: 'text-[var(--muted)] hover:text-[var(--text)]',
  }
  return (
    <button
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition active:scale-[0.99]',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  isPending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: ButtonVariant
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const titleId = useId()

  useEffect(() => {
    if (!open || isPending) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isPending, onCancel, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end bg-black/70 p-3 sm:items-center sm:justify-center"
      onClick={() => {
        if (!isPending) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md"
        onClick={(event) => event.stopPropagation()}
      >
        <Card className="space-y-4">
          <div>
            <h2 id={titleId} className="text-lg font-bold">
              {title}
            </h2>
            <div className="mt-2 text-sm text-[var(--muted)]">{children}</div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" disabled={isPending} onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button variant={confirmVariant} disabled={isPending} onClick={onConfirm}>
              {isPending ? 'Starting…' : confirmLabel}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--action)]',
        className,
      )}
      {...props}
    />
  )
}

export function Chip({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'action' | 'success' | 'warning' | 'danger'
  className?: string
}) {
  const tones = {
    neutral: 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]',
    action: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    danger: 'border-red-500/30 bg-red-500/10 text-red-300',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <Card className="flex min-h-64 flex-col items-center justify-center text-center">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-[var(--muted)]">{children}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  )
}
