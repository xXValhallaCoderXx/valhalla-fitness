/**
 * Supabase client for the native spike.
 *
 * Native (Android/iOS): session storage uses Supabase's documented
 * "LargeSecureStore" pattern — the session JSON is AES-256-CTR encrypted with
 * a random per-key 256-bit key held in expo-secure-store, and the ciphertext
 * lives in AsyncStorage (SecureStore has a ~2KB value limit, sessions are
 * bigger).
 *
 * Web: supabase-js's default browser storage (localStorage) is used — no
 * storage override is passed.
 */
import * as aesjs from 'aes-js'
import * as Crypto from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState, Platform } from 'react-native'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** SecureStore keys may only contain [A-Za-z0-9._-]; sanitize whatever supabase-js passes. */
function secureKeyFor(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_')
}

/**
 * AES-256-CTR encrypted AsyncStorage, with the encryption key in SecureStore.
 * Implements the (async) Storage contract supabase-js expects.
 */
class LargeSecureStore {
  private async encrypt(key: string, value: string): Promise<string> {
    // 256-bit key from expo-crypto (do NOT rely on global crypto on native).
    const encryptionKey = Crypto.getRandomBytes(32)
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1))
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value))
    await SecureStore.setItemAsync(secureKeyFor(key), aesjs.utils.hex.fromBytes(encryptionKey))
    return aesjs.utils.hex.fromBytes(encryptedBytes)
  }

  private async decrypt(key: string, hexCiphertext: string): Promise<string | null> {
    const hexKey = await SecureStore.getItemAsync(secureKeyFor(key))
    if (!hexKey) return null
    const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(hexKey), new aesjs.Counter(1))
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(hexCiphertext))
    return aesjs.utils.utf8.fromBytes(decryptedBytes)
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key)
    if (encrypted === null) return null
    return this.decrypt(key, encrypted)
  }

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await this.encrypt(key, value)
    await AsyncStorage.setItem(key, encrypted)
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key)
    await SecureStore.deleteItemAsync(secureKeyFor(key))
  }
}

/** Human-readable description of the session storage backend, for the proof panel. */
export const storageBackendLabel =
  Platform.OS === 'web'
    ? 'web default (supabase-js localStorage)'
    : 'LargeSecureStore (AES key in SecureStore + ciphertext in AsyncStorage)'

let client: SupabaseClient | null = null

/**
 * Lazy singleton — throws a clear error at first use if the EXPO_PUBLIC_* env
 * vars are missing (rather than crashing at import time).
 */
export function getSupabase(): SupabaseClient {
  if (client) return client

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL and/or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copy .env.example to .env in apps/native, fill in values from `supabase status`, ' +
        'then restart the dev server with `expo start -c`.',
    )
  }

  client = createClient(url, anonKey, {
    auth: {
      // On web, pass no storage override so supabase-js uses its browser default.
      ...(Platform.OS === 'web' ? {} : { storage: new LargeSecureStore() }),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })

  if (Platform.OS !== 'web') {
    // supabase-js only refreshes tokens while told the app is in the
    // foreground; wire that to AppState (native only — web handles this itself).
    AppState.addEventListener('change', (state) => {
      if (!client) return
      if (state === 'active') {
        client.auth.startAutoRefresh()
      } else {
        client.auth.stopAutoRefresh()
      }
    })
    client.auth.startAutoRefresh()
  }

  return client
}
