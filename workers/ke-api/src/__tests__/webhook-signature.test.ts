import { describe, it, expect } from 'vitest'
import { hexToBytes, timingSafeEqual } from '../utils'

// ============================================================================
// timingSafeEqual — constant-time byte comparison
// ============================================================================

describe('timingSafeEqual', () => {
  it('returns true for equal byte arrays', () => {
    const a = new Uint8Array([1, 2, 3, 4, 5])
    const b = new Uint8Array([1, 2, 3, 4, 5])
    expect(timingSafeEqual(a, b)).toBe(true)
  })

  it('returns true for two empty arrays', () => {
    expect(timingSafeEqual(new Uint8Array(), new Uint8Array())).toBe(true)
  })

  it('returns false for arrays differing by one byte', () => {
    const a = new Uint8Array([1, 2, 3, 4, 5])
    const b = new Uint8Array([1, 2, 3, 4, 6])
    expect(timingSafeEqual(a, b)).toBe(false)
  })

  it('returns false for arrays differing in the first byte', () => {
    const a = new Uint8Array([0, 2, 3, 4, 5])
    const b = new Uint8Array([1, 2, 3, 4, 5])
    expect(timingSafeEqual(a, b)).toBe(false)
  })

  it('returns false for arrays of different lengths', () => {
    const a = new Uint8Array([1, 2, 3])
    const b = new Uint8Array([1, 2, 3, 4])
    expect(timingSafeEqual(a, b)).toBe(false)
  })

  it('returns false when one array is empty and the other is not', () => {
    expect(timingSafeEqual(new Uint8Array(), new Uint8Array([1]))).toBe(false)
    expect(timingSafeEqual(new Uint8Array([1]), new Uint8Array())).toBe(false)
  })

  it('returns false for same-length arrays with all bytes different', () => {
    const a = new Uint8Array([1, 2, 3, 4])
    const b = new Uint8Array([5, 6, 7, 8])
    expect(timingSafeEqual(a, b)).toBe(false)
  })

  it('handles full byte range (0-255) correctly', () => {
    const a = new Uint8Array([0, 127, 255])
    const b = new Uint8Array([0, 127, 255])
    expect(timingSafeEqual(a, b)).toBe(true)

    const c = new Uint8Array([0, 128, 255])
    expect(timingSafeEqual(a, c)).toBe(false)
  })
})

// ============================================================================
// hexToBytes — hex string decoder used by Stripe signature path
// ============================================================================

describe('hexToBytes', () => {
  it('decodes lowercase hex correctly', () => {
    const result = hexToBytes('00ff10')
    expect(result).toEqual(new Uint8Array([0x00, 0xff, 0x10]))
  })

  it('decodes uppercase hex correctly', () => {
    const result = hexToBytes('00FF10')
    expect(result).toEqual(new Uint8Array([0x00, 0xff, 0x10]))
  })

  it('decodes an empty string to an empty array', () => {
    expect(hexToBytes('')).toEqual(new Uint8Array())
  })

  it('returns null for odd-length input', () => {
    expect(hexToBytes('abc')).toBeNull()
  })

  it('returns null for non-hex characters', () => {
    expect(hexToBytes('zz')).toBeNull()
    expect(hexToBytes('xy')).toBeNull()
  })

  it('round-trips through HMAC-style hex encoding', () => {
    const original = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x00, 0x12])
    const hex = Array.from(original)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    const decoded = hexToBytes(hex)
    expect(decoded).not.toBeNull()
    expect(timingSafeEqual(original, decoded!)).toBe(true)
  })
})

// ============================================================================
// Integration: simulates the Stripe HMAC verification compare step
// ============================================================================

describe('Stripe-style HMAC compare', () => {
  it('accepts a matching hex-encoded signature', async () => {
    const secret = 'whsec_test_secret'
    const payload = 't=12345.{"hello":"world"}'

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const sigBytes = new Uint8Array(
      await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
    )
    const sigHex = Array.from(sigBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const decoded = hexToBytes(sigHex)
    expect(decoded).not.toBeNull()
    expect(timingSafeEqual(sigBytes, decoded!)).toBe(true)
  })

  it('rejects a tampered hex-encoded signature', async () => {
    const secret = 'whsec_test_secret'
    const payload = 't=12345.{"hello":"world"}'

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const sigBytes = new Uint8Array(
      await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
    )
    // Flip one byte in the otherwise-correct signature.
    const tampered = new Uint8Array(sigBytes)
    tampered[0] ^= 0x01
    expect(timingSafeEqual(sigBytes, tampered)).toBe(false)
  })
})
