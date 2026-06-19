import { useStore } from '@/state/store'
import { Card } from '@/components/ui'
import { MOBILITY_CHECKLIST } from '@/engine/program-config'
import { todayLocalISO } from '@/lib/date'

function computeStreak(log: Record<string, string[]>, today: string): number {
  let streak = 0
  const d = new Date(`${today}T00:00:00`)
  // Count back from today while each day has at least one completed item.
  for (;;) {
    const key = todayLocalISO(d)
    if ((log[key]?.length ?? 0) > 0) {
      streak++
      d.setDate(d.getDate() - 1)
    } else break
  }
  return streak
}

export function Mobility() {
  const state = useStore((s) => s.state)!
  const toggle = useStore((s) => s.toggleMobilityItem)

  const today = todayLocalISO()
  const doneToday = new Set(state.mobility.log[today] ?? [])
  const streak = computeStreak(state.mobility.log, today)

  const splits = MOBILITY_CHECKLIST.filter((i) => i.group === 'splits')
  const prehab = MOBILITY_CHECKLIST.filter((i) => i.group === 'prehab')

  function group(title: string, items: typeof MOBILITY_CHECKLIST) {
    return (
      <Card className="mb-4">
        <h2 className="mb-3 font-semibold">{title}</h2>
        <ul className="space-y-2">
          {items.map((item) => {
            const checked = doneToday.has(item.id)
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggle(today, item.id)}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                      checked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-600'
                    }`}
                  >
                    {checked ? '✓' : ''}
                  </span>
                  <span className={checked ? 'text-slate-400 line-through' : ''}>{item.name}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Mobility & prehab</h1>
        <span className="text-sm text-slate-400">
          🔥 {streak} day{streak === 1 ? '' : 's'}
        </span>
      </div>
      <p className="mb-4 text-sm text-slate-400">
        Daily, on warm muscle. Splits = the backbone; shoulder prehab keeps the bench progressing.
      </p>
      {group('Splits / flexibility', splits)}
      {group('Shoulder prehab', prehab)}
    </div>
  )
}
