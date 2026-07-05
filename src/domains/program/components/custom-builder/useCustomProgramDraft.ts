import { useState } from 'react'
import {
  accessoryMovementOptions,
  clampBuilderDayCount,
  loggerMovementOptions,
  resizeCustomSessions,
} from '~/domains/program/lib/custom-builder-ui'
import {
  createDefaultCustomProgramBuilderInput,
  MAX_ACCESSORIES_PER_DAY,
  MAX_LOGGER_EXERCISES_PER_DAY,
  type CustomProgramBuilderInput,
  type CustomProgramMethodology,
} from '~/domains/program/lib/custom-program-meta'

/** Draft state + all update handlers for the custom programme builder wizard. */
export function useCustomProgramDraft() {
  const [draft, setDraft] = useState<CustomProgramBuilderInput>(() => createDefaultCustomProgramBuilderInput())

  const updateDraft = (patch: Partial<CustomProgramBuilderInput>) => {
    setDraft((current) => ({ ...current, ...patch }))
  }

  const setMethodology = (methodology: CustomProgramMethodology) => {
    setDraft((current) => {
      const daysPerWeek = clampBuilderDayCount(current.daysPerWeek, 3)
      const next = createDefaultCustomProgramBuilderInput({ methodology, daysPerWeek })
      return {
        ...next,
        name: current.name,
        goal: current.goal,
      }
    })
  }

  const setDaysPerWeek = (daysPerWeek: number) => {
    setDraft((current) => {
      const nextDaysPerWeek = clampBuilderDayCount(daysPerWeek, current.daysPerWeek)
      return resizeCustomSessions(current, nextDaysPerWeek)
    })
  }

  const updateSession = (
    sessionIndex: number,
    patch: Partial<CustomProgramBuilderInput['sessions'][number]>,
  ) => {
    setDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session, index) =>
        index === sessionIndex ? { ...session, ...patch } : session,
      ),
    }))
  }

  const updateAccessory = (
    sessionIndex: number,
    accessoryIndex: number,
    patch: Partial<CustomProgramBuilderInput['sessions'][number]['accessories'][number]>,
  ) => {
    setDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session, index) =>
        index === sessionIndex
          ? {
              ...session,
              accessories: session.accessories.map((accessory, itemIndex) =>
                itemIndex === accessoryIndex ? { ...accessory, ...patch } : accessory,
              ),
            }
          : session,
      ),
    }))
  }

  const addAccessory = (sessionIndex: number) => {
    setDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session, index) =>
        index === sessionIndex && session.accessories.length < MAX_ACCESSORIES_PER_DAY
          ? {
              ...session,
              accessories: [
                ...session.accessories,
                {
                  movementId: accessoryMovementOptions[0]?.id ?? 'face_pull',
                  setCount: 3,
                  repMin: 10,
                  repMax: 15,
                  progressionMethod: 'history_only',
                },
              ],
            }
          : session,
      ),
    }))
  }

  const removeAccessory = (sessionIndex: number, accessoryIndex: number) => {
    setDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session, index) =>
        index === sessionIndex
          ? {
              ...session,
              accessories: session.accessories.filter((_, itemIndex) => itemIndex !== accessoryIndex),
            }
          : session,
      ),
    }))
  }

  const updateLoggerExercise = (
    sessionIndex: number,
    exerciseIndex: number,
    patch: Partial<CustomProgramBuilderInput['sessions'][number]['loggerExercises'][number]>,
  ) => {
    setDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session, index) =>
        index === sessionIndex
          ? {
              ...session,
              loggerExercises: session.loggerExercises.map((exercise, itemIndex) =>
                itemIndex === exerciseIndex ? { ...exercise, ...patch } : exercise,
              ),
            }
          : session,
      ),
    }))
  }

  const addLoggerExercise = (sessionIndex: number) => {
    setDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session, index) =>
        index === sessionIndex && session.loggerExercises.length < MAX_LOGGER_EXERCISES_PER_DAY
          ? {
              ...session,
              loggerExercises: [
                ...session.loggerExercises,
                {
                  movementId: loggerMovementOptions[0]?.id ?? 'squat',
                  setCount: 3,
                  repMin: 8,
                  repMax: 12,
                  targetRir: 2,
                },
              ],
            }
          : session,
      ),
    }))
  }

  const removeLoggerExercise = (sessionIndex: number, exerciseIndex: number) => {
    setDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session, index) =>
        index === sessionIndex
          ? {
              ...session,
              loggerExercises: session.loggerExercises.filter((_, itemIndex) => itemIndex !== exerciseIndex),
            }
          : session,
      ),
    }))
  }

  return {
    draft,
    updateDraft,
    setMethodology,
    setDaysPerWeek,
    updateSession,
    updateAccessory,
    addAccessory,
    removeAccessory,
    updateLoggerExercise,
    addLoggerExercise,
    removeLoggerExercise,
  }
}
