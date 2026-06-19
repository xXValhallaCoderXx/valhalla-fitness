import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Field, NumberInput, Segmented, Select, Toggle } from '@/components/ui'
import { useStore } from '@/state/store'
import { LIFT_IDS, LIFT_LABELS, type SessionType } from '@/engine/types'
import { CYCLE_WEEKS, SESSION_LABELS } from '@/engine/program-config'
import type { PhaseId } from '@/state/types'

const SESSION_OPTIONS: SessionType[] = ['squat', 'bench', 'deadlift', 'assist', 'sport', 'z2', 'rest']
const DAYS = [
  ['0', 'Sun'],
  ['1', 'Mon'],
  ['2', 'Tue'],
  ['3', 'Wed'],
  ['4', 'Thu'],
  ['5', 'Fri'],
  ['6', 'Sat'],
] as const

export function Settings() {
  const navigate = useNavigate()
  const state = useStore((s) => s.state)!
  const setTrainingMax = useStore((s) => s.setTrainingMax)
  const setStartDate = useStore((s) => s.setStartDate)
  const setPhase = useStore((s) => s.setPhase)
  const setScheduleDay = useStore((s) => s.setScheduleDay)
  const updateRestTimers = useStore((s) => s.updateRestTimers)
  const loginSync = useStore((s) => s.loginSync)
  const pushSync = useStore((s) => s.pushSync)
  const pullSync = useStore((s) => s.pullSync)
  const syncNow = useStore((s) => s.syncNow)
  const exportJSON = useStore((s) => s.exportJSON)
  const importJSON = useStore((s) => s.importJSON)
  const resetAll = useStore((s) => s.resetAll)

  const [password, setPassword] = useState('')
  const [syncMsg, setSyncMsg] = useState('')
  const [importText, setImportText] = useState('')
  const [importMsg, setImportMsg] = useState('')

  function download() {
    const blob = new Blob([exportJSON()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workout-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function runSync(action: 'login' | 'push' | 'pull' | 'sync') {
    if (action === 'login') setSyncMsg((await loginSync(password)) ? 'Signed in.' : 'Login failed.')
    if (action === 'push') setSyncMsg((await pushSync()) ? 'Pushed local data.' : 'Push failed.')
    if (action === 'pull') setSyncMsg((await pullSync()) ? 'Pulled remote data.' : 'Pull failed.')
    if (action === 'sync') setSyncMsg(`Sync result: ${await syncNow()}.`)
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Settings</h1>

      <Card className="mb-4">
        <h2 className="mb-3 font-semibold">Program</h2>
        <div className="space-y-3">
          <Field label="Start date">
            <input
              type="date"
              value={state.config.startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-indigo-500"
            />
          </Field>
          <Field label="Phase">
            <Segmented
              value={state.config.phase}
              onChange={(phase) => setPhase(phase as PhaseId)}
              options={[
                { label: 'Rebuild', value: 1 },
                { label: 'Intensify', value: 2 },
                { label: 'Specialize', value: 3 },
              ]}
            />
          </Field>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Current pointer: Cycle {state.cyclePointer.cycleIndex + 1} / {CYCLE_WEEKS[state.cyclePointer.weekIndex]?.label}
        </p>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 font-semibold">Training Maxes</h2>
        <div className="space-y-3">
          {LIFT_IDS.map((lift) => (
            <Field key={lift} label={LIFT_LABELS[lift]}>
              <NumberInput value={state.lifts[lift].trainingMax ?? 0} onChange={(v) => Number.isFinite(v) && setTrainingMax(lift, v)} suffix="kg" />
            </Field>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 font-semibold">Weekly Schedule</h2>
        <div className="space-y-3">
          {DAYS.map(([day, label]) => (
            <Field key={day} label={label}>
              <Select value={state.config.schedule[day] ?? 'rest'} onChange={(e) => setScheduleDay(day, e.target.value as SessionType)}>
                {SESSION_OPTIONS.map((session) => (
                  <option key={session} value={session}>
                    {SESSION_LABELS[session]}
                  </option>
                ))}
              </Select>
            </Field>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 font-semibold">Rest Timers</h2>
        <div className="space-y-3">
          <Toggle checked={state.restTimerSettings.enabled} onChange={(enabled) => updateRestTimers({ enabled })} label="Enable rest timer" />
          <Field label="Main lift seconds">
            <NumberInput value={state.restTimerSettings.mainLiftSeconds} step={15} min={0} onChange={(mainLiftSeconds) => updateRestTimers({ mainLiftSeconds })} />
          </Field>
          <Field label="Accessory seconds">
            <NumberInput value={state.restTimerSettings.accessorySeconds} step={15} min={0} onChange={(accessorySeconds) => updateRestTimers({ accessorySeconds })} />
          </Field>
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 font-semibold">Vercel Sync</h2>
        <p className="mb-3 text-sm text-slate-400">
          Status: {state.syncMeta.status}
          {state.syncMeta.serverUpdatedAt ? ` / server ${state.syncMeta.serverUpdatedAt}` : ''}
        </p>
        <Field label="App password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-indigo-500"
          />
        </Field>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="subtle" onClick={() => void runSync('login')} disabled={!password}>
            Sign in
          </Button>
          <Button variant="subtle" onClick={() => void runSync('sync')}>
            Sync now
          </Button>
          <Button variant="ghost" onClick={() => void runSync('push')}>
            Push
          </Button>
          <Button variant="ghost" onClick={() => void runSync('pull')}>
            Pull
          </Button>
        </div>
        {(syncMsg || state.syncMeta.lastError) && <p className="mt-2 text-sm text-slate-400">{syncMsg || state.syncMeta.lastError}</p>}
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 font-semibold">Backup</h2>
        <Button variant="subtle" className="w-full" onClick={download}>
          Export backup
        </Button>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Paste backup JSON..."
          className="mt-3 h-24 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-indigo-500"
        />
        <Button variant="subtle" className="mt-2 w-full" onClick={() => setImportMsg(importJSON(importText) ? 'Imported.' : 'Invalid backup.')}>
          Import
        </Button>
        {importMsg && <p className="mt-2 text-sm text-slate-400">{importMsg}</p>}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Danger Zone</h2>
        <Button
          variant="danger"
          className="w-full"
          onClick={() => {
            if (confirm('Erase all data and start over?')) {
              void resetAll().then(() => navigate('/welcome', { replace: true }))
            }
          }}
        >
          Reset everything
        </Button>
      </Card>
    </div>
  )
}
