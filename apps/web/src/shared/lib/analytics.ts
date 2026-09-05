/**
 * Thin, provider-agnostic analytics. Call sites use `track()` and never depend on a
 * concrete provider. Until a real sink is registered (e.g. PostHog) via
 * `setAnalyticsSink`, events are a no-op in production and `console.debug` in dev.
 * Always a no-op during SSR (no `window`).
 */
export type AnalyticsProps = Record<string, unknown>

type AnalyticsSink = (event: string, props?: AnalyticsProps) => void

let sink: AnalyticsSink | null = null

/** Register (or clear, with `null`) the real analytics provider — call once at app start. */
export function setAnalyticsSink(fn: AnalyticsSink | null) {
  sink = fn
}

export function track(event: string, props?: AnalyticsProps) {
  if (typeof window === 'undefined') return
  if (sink) {
    sink(event, props)
    return
  }
  if (import.meta.env.DEV) console.debug('[track]', event, props ?? {})
}
