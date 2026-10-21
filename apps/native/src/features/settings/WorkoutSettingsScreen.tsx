import { SettingsEditor } from './SettingsEditor'
import { WorkoutPreferences } from './preferences/WorkoutPreferences'

export function WorkoutSettingsScreen() {
  return <SettingsEditor title="Workout settings" section="workouts">
    {({ draft, disabled }) => <WorkoutPreferences autoStartTimer={draft.values.autoStartTimer}
      defaultRestSeconds={draft.values.defaultRestSeconds} disabled={disabled}
      onAutoStartTimerChange={draft.setAutoStartTimer} onDefaultRestSecondsChange={draft.setDefaultRestSeconds} />}
  </SettingsEditor>
}
