import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui'
import { useStore } from '@/state/store'
import { LIFT_IDS, LIFT_LABELS } from '@/engine/types'

export function ProgressScreen() {
  const state = useStore((s) => s.state)!
  const recentSessions = [...state.sessionLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6)

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Progress</h1>
      <p className="mb-4 text-sm text-slate-400">Training maxes, recent sessions, and comeback signals.</p>

      <div className="space-y-4">
        {LIFT_IDS.map((lift) => {
          const ls = state.lifts[lift]
          const data = ls.history.map((h) => ({ date: h.date.slice(5), tm: h.toTM, band: h.band }))
          return (
            <Card key={lift}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="font-semibold">{LIFT_LABELS[lift]}</h2>
                <span className="text-lg font-bold text-indigo-300">{ls.trainingMax ?? '-'} kg</span>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip contentStyle={{ background: '#020617', border: '1px solid #334155', borderRadius: 8 }} />
                    <Line type="monotone" dataKey="tm" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {[...ls.history].reverse().slice(0, 4).map((h, i) => (
                  <li key={`${h.date}-${i}`} className="flex justify-between text-slate-400">
                    <span>
                      {h.date} / <span className="text-slate-500">{h.band}</span>
                    </span>
                    <span className="tabular-nums">
                      {h.fromTM > 0 ? `${h.fromTM} to ` : ''}
                      {h.toTM} kg
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )
        })}
      </div>

      <Card className="mt-4">
        <h2 className="mb-3 font-semibold">Recent Sessions</h2>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-slate-400">No logged sessions yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recentSessions.map((session) => (
              <li key={session.id} className="flex items-center justify-between gap-3">
                <span>
                  {session.date} / {session.sessionType}
                </span>
                <span className="text-right text-slate-400">
                  R{session.readinessScore ?? '-'} / {session.accessories.length} accessories
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
