import * as Crypto from 'expo-crypto'

// Shared Sheetless packages generate clientMutationId idempotency tokens via
// crypto.randomUUID(). Hermes ships no Web Crypto, so expo-crypto backfills it.
const globalCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto

if (!globalCrypto) {
  ;(globalThis as { crypto?: unknown }).crypto = { randomUUID: () => Crypto.randomUUID() }
} else if (typeof globalCrypto.randomUUID !== 'function') {
  globalCrypto.randomUUID = () => Crypto.randomUUID()
}

export function newClientMutationId(): string {
  return (globalThis as unknown as { crypto: { randomUUID: () => string } }).crypto.randomUUID()
}
