// Local-day helpers. Sessions key off the device's local weekday, never UTC.

export function nowISO(): string {
  return new Date().toISOString()
}

/** Local calendar date as YYYY-MM-DD (no timezone drift). */
export function todayLocalISO(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 0=Sunday … 6=Saturday. */
export function localWeekday(d: Date = new Date()): number {
  return d.getDay()
}

/** Whole-day difference between two YYYY-MM-DD strings (b - a). */
export function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`)
  const db = new Date(`${b}T00:00:00`)
  return Math.round((db.getTime() - da.getTime()) / 86_400_000)
}
