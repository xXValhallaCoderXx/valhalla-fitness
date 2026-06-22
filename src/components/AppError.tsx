import type { ErrorComponentProps } from '@tanstack/react-router'
import { getApiErrorMessage } from '~/lib/api-error'

export function AppError({ error }: ErrorComponentProps) {
  const message = getApiErrorMessage(error, 'The screen could not load.')

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="text-xs font-semibold uppercase text-[var(--danger)]">Something broke</p>
        <h1 className="mt-2 text-lg font-bold">The screen could not load.</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{message}</p>
      </div>
    </main>
  )
}
