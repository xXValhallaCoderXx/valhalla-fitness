import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="text-xs font-semibold uppercase text-[var(--muted)]">404</p>
        <h1 className="mt-2 text-lg font-bold">Screen not found</h1>
        <Link className="mt-4 inline-flex text-sm font-semibold text-[var(--action)]" to="/today">
          Go to Today
        </Link>
      </div>
    </main>
  )
}
