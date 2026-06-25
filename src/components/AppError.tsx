import type { ErrorComponentProps } from '@tanstack/react-router'
import { getApiErrorMessage } from '~/shared/lib/api-error'

export function AppError({ error }: ErrorComponentProps) {
  const message = getApiErrorMessage(error, 'The screen could not load.')

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5">
      <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] p-5">
        <p className="text-xs font-semibold uppercase text-[var(--mantine-color-danger-filled)]">Something broke</p>
        <h1 className="mt-2 text-lg font-bold">The screen could not load.</h1>
        <p className="mt-2 text-sm text-[var(--mantine-color-dimmed)]">{message}</p>
      </div>
    </main>
  )
}
