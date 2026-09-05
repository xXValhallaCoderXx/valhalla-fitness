/**
 * Background half of the rest timer: a local notification scheduled at the
 * timer's wall-clock end, so rest still fires when the app is backgrounded or
 * the screen is off. The foreground pill + haptics remain the in-app surface —
 * the handler below suppresses the banner while the app is open.
 *
 * Everything no-ops on web (the expo export/Playwright loop) and degrades
 * silently when the user denies the notification permission.
 */
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'

const CHANNEL_ID = 'rest-timer'

let handlerInstalled = false
let permissionGranted: boolean | null = null

function installForegroundHandler() {
  if (handlerInstalled) return
  handlerInstalled = true
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  })
}

/**
 * Create the channel BEFORE requesting permission — Android 13's
 * POST_NOTIFICATIONS prompt only appears once a channel exists.
 */
export async function ensureRestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  if (permissionGranted !== null) return permissionGranted
  try {
    installForegroundHandler()
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Rest timer',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 120, 60, 120],
      })
    }
    const existing = await Notifications.getPermissionsAsync()
    if (existing.granted) {
      permissionGranted = true
      return true
    }
    const requested = await Notifications.requestPermissionsAsync()
    permissionGranted = requested.granted
    return requested.granted
  } catch {
    permissionGranted = false
    return false
  }
}

/** Schedule the rest-complete notification; returns its id, or null when unavailable. */
export async function scheduleRestEnd(endsAt: number, label: string | null): Promise<string | null> {
  if (Platform.OS === 'web') return null
  if (!(await ensureRestNotificationPermission())) return null
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rest complete',
        body: label ? `Back to ${label}.` : 'Time for the next set.',
        sound: true,
        vibrate: [0, 120, 60, 120],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(endsAt),
        channelId: CHANNEL_ID,
      },
    })
  } catch {
    return null
  }
}

export async function cancelRestEnd(id: string | null) {
  if (!id || Platform.OS === 'web') return
  try {
    await Notifications.cancelScheduledNotificationAsync(id)
  } catch {
    // Already delivered or cancelled — nothing to clean up.
  }
}
