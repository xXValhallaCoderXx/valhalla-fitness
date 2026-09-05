/**
 * Rest-completion cue — the native replacement for the web's WebAudio beeps +
 * navigator.vibrate. Haptics-only v1: the backgrounded path's notification
 * (R2) carries the audible cue, so no bundled audio asset yet.
 */
import { Platform, Vibration } from 'react-native'
import * as Haptics from 'expo-haptics'

export function playRestCompleteCue() {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined') navigator.vibrate?.([120, 60, 120])
    return
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  Vibration.vibrate([0, 120, 60, 120])
}
