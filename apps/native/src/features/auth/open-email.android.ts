import { startActivityAsync } from 'expo-intent-launcher'

/** Android's inbox category opens an email app, rather than composing a message. */
export async function openEmailApp(): Promise<boolean> {
  await startActivityAsync('android.intent.action.MAIN', { category: 'android.intent.category.APP_EMAIL' })
  return true
}
