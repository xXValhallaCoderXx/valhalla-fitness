import AsyncStorage from '@react-native-async-storage/async-storage'
import { accountSessionFeedbackStorageKey } from '@sheetless/domain/feedback/post-workout'

// Retain successful sends/dismissals for this process even if local storage fails.
const handled = new Set<string>()
export async function readFeedbackHandled(accountId: string, sessionId: string) {
  const key = accountSessionFeedbackStorageKey(accountId, sessionId)
  if (handled.has(key)) return true
  const stored = await AsyncStorage.getItem(key)
  if (stored !== null) handled.add(key)
  return stored !== null
}
export async function markFeedbackHandled(accountId: string, sessionId: string) {
  const key = accountSessionFeedbackStorageKey(accountId, sessionId)
  handled.add(key)
  try {
    await AsyncStorage.setItem(key, new Date().toISOString())
    return true
  } catch {
    return false
  }
}
