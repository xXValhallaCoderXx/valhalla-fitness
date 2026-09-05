import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useStableMutationRequest } from '../src/lib/useStableMutationRequest'

describe('useStableMutationRequest', () => {
  it('reuses one token while the intent is unchanged, so a retry is idempotent', () => {
    const { result } = renderHook(() => useStableMutationRequest())
    const first = result.current.requestIdFor({ timeZone: 'Asia/Singapore' })
    const retry = result.current.requestIdFor({ timeZone: 'Asia/Singapore' })
    expect(retry).toBe(first)
  })

  it('issues a fresh token when the intent changes', () => {
    const { result } = renderHook(() => useStableMutationRequest())
    const first = result.current.requestIdFor({ timeZone: 'Asia/Singapore' })
    const second = result.current.requestIdFor({ timeZone: 'Europe/Lisbon' })
    expect(second).not.toBe(first)
  })

  it('treats a null time zone as its own intent rather than collapsing onto undefined', () => {
    const { result } = renderHook(() => useStableMutationRequest())
    const withNull = result.current.requestIdFor({ timeZone: null })
    const withUndefined = result.current.requestIdFor({ timeZone: undefined })
    expect(withUndefined).not.toBe(withNull)
  })

  it('issues a new token after a confirmed success clears the prior attempt', () => {
    const { result } = renderHook(() => useStableMutationRequest())
    const first = result.current.requestIdFor({ movementId: 'squat' })
    result.current.clearRequest(first)
    expect(result.current.requestIdFor({ movementId: 'squat' })).not.toBe(first)
  })

  it('ignores a clear for a superseded token so the in-flight retry keeps its id', () => {
    const { result } = renderHook(() => useStableMutationRequest())
    const stale = result.current.requestIdFor({ movementId: 'squat' })
    const current = result.current.requestIdFor({ movementId: 'bench' })
    result.current.clearRequest(stale)
    expect(result.current.requestIdFor({ movementId: 'bench' })).toBe(current)
  })

  it('clears unconditionally when called without a token', () => {
    const { result } = renderHook(() => useStableMutationRequest())
    const first = result.current.requestIdFor({ movementId: 'squat' })
    result.current.clearRequest()
    expect(result.current.requestIdFor({ movementId: 'squat' })).not.toBe(first)
  })
})
