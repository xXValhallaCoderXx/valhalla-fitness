import type { ProgramInstance } from '~/types/training'

export type TimelineSession = {
  label: string
  title: string
  mainMovement: string
  mainPrescription: string
  variationMovement: string
  variationPrescription: string
  accessoryPrescription: string
  progressionNote: string
  globalIndex: number
}

export type TimelineWeek = {
  index: number
  subtitle: string
  summary: string
  sessions: TimelineSession[]
}

export type ProgramTimelineModel = {
  totalWeeks: number
  daysPerWeek: number
  currentWeekIndex: number
  currentSessionInWeek: number
  description: string
  weeks: TimelineWeek[]
}

export function buildProgramTimeline(program: Pick<ProgramInstance, 'templateId' | 'currentWeekIndex'>) {
  if (program.templateId === 'bromley-bullmastiff') return buildBullmastiffTimeline(program.currentWeekIndex)
  return buildHealthy531Timeline(program.currentWeekIndex)
}

export function buildBullmastiffTimeline(currentSessionIndex: number): ProgramTimelineModel {
  const daysPerWeek = 4
  const totalWeeks = 18
  const currentWeekIndex = Math.min(Math.floor(currentSessionIndex / daysPerWeek), totalWeeks - 1)
  const currentSessionInWeek = currentSessionIndex % daysPerWeek
  const sessions = [
    { title: 'Squat', main: 'Squat', baseVariation: 'Front Squat', peakVariation: 'Pause Squat' },
    { title: 'Bench', main: 'Bench Press', baseVariation: 'Close-Grip Bench Press', peakVariation: 'Board Press' },
    { title: 'Deadlift', main: 'Deadlift', baseVariation: 'Stiff-Leg Deadlift', peakVariation: 'Low Trap Bar Deadlift' },
    { title: 'Overhead Press', main: 'Overhead Press', baseVariation: 'Behind-the-Neck Press', peakVariation: 'Seated Pin Press' },
  ]

  return {
    totalWeeks,
    daysPerWeek,
    currentWeekIndex,
    currentSessionInWeek,
    description: '18-week source structure: 9 base weeks, then 9 peak weeks. Each phase uses three 3-week waves; no fixed deload week is prescribed here, but each new wave resets as a recovery drop-off.',
    weeks: Array.from({ length: totalWeeks }, (_, weekIndex): TimelineWeek => {
      const isPeak = weekIndex >= 9
      const phaseWeekIndex = weekIndex % 9
      const waveIndex = Math.floor(phaseWeekIndex / 3)
      const weekInWave = phaseWeekIndex % 3
      const phaseLabel = isPeak ? 'Peak phase' : 'Base phase'
      const mainReps = isPeak ? [3, 2, 1][waveIndex] : [6, 5, 4][waveIndex]
      const mainSets = isPeak ? [5, 3, 1][weekInWave] : 4
      const mainPercent = isPeak ? [85, 88, 92][waveIndex] : [70, 75, 80][waveIndex]
      const variationSets = isPeak ? [4, 3, 2][weekInWave] : [3, 4, 5][weekInWave]
      const variationReps = isPeak ? [6, 5, 4][waveIndex] : [12, 10, 8][waveIndex]
      const variationPercent = isPeak ? [75, 80, 85][waveIndex] : [60, 65, 70][waveIndex]
      const subtitle = `${phaseLabel} · Wave ${waveIndex + 1}, week ${weekInWave + 1}`
      const nextWeek = weekIndex + 1
      const nextPhaseWeekIndex = nextWeek % 9
      const nextWaveIndex = Math.floor(nextPhaseWeekIndex / 3)
      const nextIsPeak = nextWeek >= 9
      const nextMainReps = nextIsPeak ? [3, 2, 1][nextWaveIndex] : [6, 5, 4][nextWaveIndex]
      const nextMainSets = nextIsPeak ? [5, 3, 1][nextPhaseWeekIndex % 3] : 4
      const nextMainPercent = nextIsPeak ? [85, 88, 92][nextWaveIndex] : [70, 75, 80][nextWaveIndex]
      const resetNote = weekInWave === 2 && weekIndex < totalWeeks - 1
        ? ` Next week starts a new wave: ${nextMainSets}x${nextMainReps}+ around ${nextMainPercent}%.`
        : ' Stay on this wave prescription; accepted plus-set decisions can move the actual load week to week.'

      return {
        index: weekIndex,
        subtitle,
        summary: `${mainSets}x${mainReps}+ main work around ${mainPercent}% with ${variationSets}x${variationReps} variation work around ${variationPercent}%.${resetNote}`,
        sessions: sessions.map((session, sessionIndex) => ({
          label: `S${sessionIndex + 1}`,
          title: session.title,
          mainMovement: session.main,
          mainPrescription: `${mainSets}x${mainReps}+ @ ${mainPercent}%`,
          variationMovement: isPeak ? session.peakVariation : session.baseVariation,
          variationPrescription: `${variationSets}x${variationReps} @ ${variationPercent}%`,
          accessoryPrescription: isPeak ? 'Reduced bodybuilding volume; keep reps clean and recoverable.' : 'Bodybuilding accessories after the main and variation work.',
          progressionNote: weekInWave === 2
            ? 'Log the final plus set honestly; extra reps over baseline drive the next load recommendation before the next wave reset.'
            : 'Log the final plus set honestly; extra reps over baseline drive the next load recommendation.',
          globalIndex: weekIndex * daysPerWeek + sessionIndex,
        })),
      }
    }),
  }
}

export function buildHealthy531Timeline(currentSessionIndex: number): ProgramTimelineModel {
  const daysPerWeek = 4
  const totalWeeks = 4
  const currentWeekIndex = Math.min(Math.floor(currentSessionIndex / daysPerWeek), totalWeeks - 1)
  const currentSessionInWeek = currentSessionIndex % daysPerWeek
  const weekPrescriptions = [
    { label: '5s week', main: '65%x5 · 75%x5 · 85%x5+' },
    { label: '3s week', main: '70%x3 · 80%x3 · 90%x3+' },
    { label: '5/3/1 week', main: '75%x5 · 85%x3 · 95%x1+' },
    { label: 'Deload', main: '40%x5 · 50%x5 · 60%x5' },
  ]
  const sessions = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press']

  return {
    totalWeeks,
    daysPerWeek,
    currentWeekIndex,
    currentSessionInWeek,
    description: '4-week 5/3/1 cycle with four main-lift sessions per week.',
    weeks: weekPrescriptions.map((week, weekIndex): TimelineWeek => ({
      index: weekIndex,
      subtitle: week.label,
      summary: week.main,
      sessions: sessions.map((session, sessionIndex) => ({
        label: `S${sessionIndex + 1}`,
        title: session,
        mainMovement: session,
        mainPrescription: week.main,
        variationMovement: 'FSL supplemental work',
        variationPrescription: weekIndex === 3 ? 'No FSL on deload week' : '5x5 @ first-set load',
        accessoryPrescription: '4x8-12 @ RIR 2 accessories',
        progressionNote: 'Top-set reps and RIR feed the cycle-level training-max recommendation.',
        globalIndex: weekIndex * daysPerWeek + sessionIndex,
      })),
    })),
  }
}
