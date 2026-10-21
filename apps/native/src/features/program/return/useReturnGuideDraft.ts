import { useMemo, useState } from 'react'
import type { getReturnGuide } from '@sheetless/data/program/return-guide'
import { buildReturnPreview } from '@sheetless/domain/program/return-preview'
import { buildReturnOutlook } from '@sheetless/domain/program/return-outlook'
import { defaultReturnSettings, isReturnActive, returnSettingsSchema } from '@sheetless/domain/program/return-settings'
import type { ReturnSettings } from '@sheetless/domain/program/types'

export type ReturnGuideState = Awaited<ReturnType<typeof getReturnGuide>>
export type ReturnStep = 'start' | 'preview' | 'fineTune'
type RawStage = { workouts: string; percentage: string; counts: Record<string, string> }
type RawSettings = { stages: RawStage[]; minimumRir: string; defaultCap: string; caps: Record<string, string> }

const number = (text: string) => text.trim() && Number.isFinite(Number(text.replace(',', '.')))
  ? Number(text.replace(',', '.')) : null
const strings = (values: Record<string, number>) => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)]))
const numbers = (values: Record<string, string>) => Object.fromEntries(Object.entries(values)
  .filter(([, value]) => value.trim()).map(([key, value]) => [key, number(value)]))
function rawSettings(settings: ReturnSettings): RawSettings {
  return { stages: settings.stages.map(stage => ({ workouts: String(stage.workouts), percentage: String(stage.setFraction * 100), counts: strings(stage.setCounts) })),
    minimumRir: String(settings.minimumRir), defaultCap: String(settings.defaultCap), caps: strings(settings.caps) }
}

/** One open-guide draft. Raw edits survive step changes; only explicit reset adopts fresh values. */
export function useReturnGuideDraft(initial: ReturnGuideState) {
  const [state] = useState(initial)
  const program = state.program
  const editing = isReturnActive(program.returnPeriod)
  const [scheduledDate] = useState(() => new Date().toISOString().slice(0, 10))
  const initialSettings = useMemo(() => program.returnPeriod?.settings ?? defaultReturnSettings(program.templateDefinition!.daysPerWeek, program.rounding), [program])
  const [step, setStep] = useState<ReturnStep>(editing ? 'preview' : 'start')
  const [percentage, setPercentage] = useState(80)
  const [raw, setRaw] = useState(() => rawSettings(initialSettings))
  const [loads, setLoads] = useState<Record<string, string>>({})
  const [individual, setIndividual] = useState(false)
  const parsedSettings = useMemo(() => returnSettingsSchema.safeParse({
    stages: raw.stages.map(stage => ({ workouts: number(stage.workouts), setFraction: number(stage.percentage) === null ? null : number(stage.percentage)! / 100, setCounts: numbers(stage.counts) })),
    minimumRir: number(raw.minimumRir), defaultCap: number(raw.defaultCap), caps: numbers(raw.caps),
  }), [raw])
  const preview = useMemo(() => buildReturnPreview(program, {
    reduction: (100 - percentage) / 100, scheduledDate,
    settings: parsedSettings.success ? parsedSettings.data : initialSettings,
    values: Object.fromEntries(Object.entries(loads).map(([key, value]) => [key, number(value)])),
  }), [program, percentage, scheduledDate, parsedSettings, initialSettings, loads])
  const valid = parsedSettings.success && preview.canApply && preview.changes.every(change => change.after !== null && change.after <= 99999)
  const outlook = useMemo(() => valid ? buildReturnOutlook(program, preview, state.baseline) : null, [valid, program, preview, state.baseline])
  const updateStage = (index: number, patch: Partial<RawStage>) => setRaw(current => ({ ...current,
    stages: current.stages.map((stage, position) => position === index ? { ...stage, ...patch } : stage),
  }))

  return {
    state, program, editing, step, setStep, percentage, raw, loads, individual, setIndividual,
    preview, outlook, valid,
    loadText: (key: string, value: number | null) => loads[key] ?? (value === null ? '' : String(value)),
    setLoad: (key: string, value: string) => setLoads(current => ({ ...current, [key]: value })),
    setPercentage: (value: number) => { setPercentage(Math.min(100, Math.max(50, value))); setLoads({}) },
    setField: (key: 'minimumRir' | 'defaultCap', value: string) => setRaw(current => ({ ...current, [key]: value })),
    updateStage,
    setCap: (key: string, value: string) => setRaw(current => ({ ...current, caps: { ...current.caps, [key]: value } })),
    addStage: () => setRaw(current => current.stages.length >= 8 ? current : ({ ...current,
      stages: [...current.stages, { ...current.stages[current.stages.length - 1], workouts: String(program.templateDefinition!.daysPerWeek), counts: { ...current.stages[current.stages.length - 1].counts } }],
    })),
    reset: () => { setPercentage(80); setRaw(rawSettings(initialSettings)); setLoads({}) },
  }
}

export type ReturnGuideDraft = ReturnType<typeof useReturnGuideDraft>
