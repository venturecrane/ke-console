import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import type { AppType } from '../types'
import {
  authMiddleware,
  _base64urlDecode,
  _verifyJWT,
  _resetJWKSCache,
  _resetAudienceWarning,
} from '../middleware/auth'
import {
  base64urlEncode,
  encodeJWTPart,
  generateRSAKeyPair,
  createSignedJWT,
  createJWKSResponse,
  type RSAKeySet,
} from './helpers/jwt'

// ============================================================================
// Test app: minimal Hono app with authMiddleware
// ============================================================================

function createTestApp() {
  const app = new Hono<AppType>()

  app.use('/protected/*', authMiddleware)

  app.get('/protected/resource', (c) => {
    return c.json({ userId: c.get('userId'), ok: true })
  })

  app.get('/public', (c) => {
    return c.json({ ok: true })
  })

  return app
}

function makeRequest(
  app: ReturnType<typeof createTestApp>,
  path: string,
  options?: {
    headers?: Record<string, string>
    clerkDomain?: string
    clerkIssuerUrl?: string
    clerkJwtAudience?: string
  }
) {
  const headers = options?.headers ?? {}
  return app.request(
    path,
    { headers },
    {
      DB: {} as D1Database,
      CLERK_DOMAIN: options?.clerkDomain,
      CLERK_ISSUER_URL: options?.clerkIssuerUrl,
      CLERK_JWT_AUDIENCE: options?.clerkJwtAudience,
    }
  )
}

// ============================================================================
// base64urlDecode
// ============================================================================

describe('base64urlDecode', () => {
  it('decodes standard base64url strings', () => {
    // "hello" in base64url is "aGVsbG8"
    const result = _base64urlDecode('aGVsbG8')
    const text = new TextDecoder().decode(result)
    expect(text).toBe('hello')
  })

  it('handles base64url characters (- and _)', () => {
    // base64url uses - instead of + and _ instead of /
    // "?>" in standard base64 is "Pz4=" which in base64url is "Pz4"
    const result = _base64urlDecode('Pz4')
    const text = new TextDecoder().decode(result)
    expect(text).toBe('?>')
  })

  it('handles strings that need padding', () => {
    // "a" -> base64 "YQ==" -> base64url "YQ"
    const result = _base64urlDecode('YQ')
    const text = new TextDecoder().decode(result)
    expect(text).toBe('a')
  })

  it('decodes JSON payloads correctly', () => {
    const original = { sub: 'user_123', exp: 9999999999 }
    const json = JSON.stringify(original)
    const encoded = base64urlEncode(new TextEncoder().encode(json))
    const decoded = _base64urlDecode(encoded)
    const parsed = JSON.parse(new TextDecoder().decode(decoded))
    expect(parsed).toEqual(original)
  })
})

// ============================================================================
// verifyJWT
// ============================================================================

describe('verifyJWT', () => {
  let keySet: RSAKeySet
  const CLERK_DOMAIN = 'test.clerk.accounts.dev'

  beforeEach(async () => {
    _resetJWKSCache()
    keySet = await generateRSAKeyPair('key-1')

    // Mock global fetch to return a fresh JWKS response each time
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => Promise.resolve(createJWKSResponse([keySet.publicJWK])))
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('verifies a valid JWT and returns the payload', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'user_abc123',
      iss: `https://${CLERK_DOMAIN}`,
      exp: now + 3600,
      iat: now,
    }

    const token = await createSignedJWT(payload, keySet.privateKey, 'key-1')
    const result = await _verifyJWT(token, CLERK_DOMAIN)

    expect(result.sub).toBe('user_abc123')
    expect(result.iss).toBe(`https://${CLERK_DOMAIN}`)
    expect(result.exp).toBe(now + 3600)
  })

  it('rejects tokens with invalid format (not 3 parts)', async () => {
    await expect(_verifyJWT('only.two', CLERK_DOMAIN)).rejects.toThrow('Invalid JWT format')
    await expect(_verifyJWT('single', CLERK_DOMAIN)).rejects.toThrow('Invalid JWT format')
    await expect(_verifyJWT('a.b.c.d', CLERK_DOMAIN)).rejects.toThrow('Invalid JWT format')
    await expect(_verifyJWT('', CLERK_DOMAIN)).rejects.toThrow('Invalid JWT format')
  })

  it('rejects tokens with unsupported algorithm', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = { sub: 'user_123', exp: now + 3600 }

    // Create a token with HS256 header but RS256 signature (header claim mismatch)
    const header = { alg: 'HS256', typ: 'JWT', kid: 'key-1' }
    const headerB64 = encodeJWTPart(header)
    const payloadB64 = encodeJWTPart(payload)
    const fakeToken = `${headerB64}.${payloadB64}.fakesignature`

    await expect(_verifyJWT(fakeToken, CLERK_DOMAIN)).rejects.toThrow(
      'Unsupported algorithm: HS256'
    )
  })

  it('rejects tokens with missing kid in header', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = { sub: 'user_123', exp: now + 3600 }

    const header = { alg: 'RS256', typ: 'JWT' } // no kid
    const headerB64 = encodeJWTPart(header)
    const payloadB64 = encodeJWTPart(payload)
    const fakeToken = `${headerB64}.${payloadB64}.fakesignature`

    await expect(_verifyJWT(fakeToken, CLERK_DOMAIN)).rejects.toThrow('Missing kid in JWT header')
  })

  it('rejects expired tokens', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'user_abc123',
      iss: `https://${CLERK_DOMAIN}`,
      exp: now - 100, // expired 100 seconds ago
      iat: now - 3700,
    }

    const token = await createSignedJWT(payload, keySet.privateKey, 'key-1')

    await expect(_verifyJWT(token, CLERK_DOMAIN)).rejects.toThrow('JWT expired')
  })

  it('rejects tokens not yet valid (nbf in the future beyond skew)', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'user_abc123',
      iss: `https://${CLERK_DOMAIN}`,
      exp: now + 7200,
      nbf: now + 120, // not valid for 2 minutes (beyond 30s skew tolerance)
      iat: now,
    }

    const token = await createSignedJWT(payload, keySet.privateKey, 'key-1')

    await expect(_verifyJWT(token, CLERK_DOMAIN)).rejects.toThrow('JWT not yet valid')
  })

  it('accepts tokens with nbf within clock skew tolerance (30s)', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'user_abc123',
      iss: `https://${CLERK_DOMAIN}`,
      exp: now + 7200,
      nbf: now + 20, // 20 seconds in the future, within 30s skew tolerance
      iat: now,
    }

    const token = await createSignedJWT(payload, keySet.privateKey, 'key-1')
    const result = await _verifyJWT(token, CLERK_DOMAIN)

    expect(result.sub).toBe('user_abc123')
  })

  it('rejects tokens with missing sub claim', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: `https://${CLERK_DOMAIN}`,
      exp: now + 3600,
      iat: now,
      // no sub
    }

    const token = await createSignedJWT(payload, keySet.privateKey, 'key-1')

    await expect(_verifyJWT(token, CLERK_DOMAIN)).rejects.toThrow('Missing sub claim')
  })

  it('rejects tokens with wrong issuer when expectedIssuer is provided', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'user_abc123',
      iss: 'https://evil.clerk.accounts.dev',
      exp: now + 3600,
      iat: now,
    }

    const token = await createSignedJWT(payload, keySet.privateKey, 'key-1')

    await expect(_verifyJWT(token, CLERK_DOMAIN, `https://${CLERK_DOMAIN}`)).rejects.toThrow(
      'Invalid issuer'
    )
  })

  it('rejects tokens with missing iss claim when expectedIssuer is provided', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'user_abc123',
      exp: now + 3600,
      iat: now,
      // no iss
    }

    const token = await createSignedJWT(payload, keySet.privateKey, 'key-1')

    await expect(_verifyJWT(token, CLERK_DOMAIN, `https://${CLERK_DOMAIN}`)).rejects.toThrow(
      'Missing iss claim'
    )
  })

  it('accepts tokens with correct issuer when expectedIssuer is provided', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'user_abc123',
      iss: `https://${CLERK_DOMAIN}`,
      exp: now + 3600,
      iat: now,
    }

    const token = await createSignedJWT(payload, keySet.privateKey, 'key-1')
    const result = await _verifyJWT(token, CLERK_DOMAIN, `https://${CLERK_DOMAIN}`)

    expect(result.sub).toBe('user_abc123')
    expect(result.iss).toBe(`https://${CLERK_DOMAIN}`)
  })

  it('skips issuer validation when expectedIssuer is not provided', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'user_abc123',
      iss: 'https://any-issuer.example.com',
      exp: now + 3600,
      iat: now,
    }

    const token = await createSignedJWT(payload, keySet.privateKey, 'key-1')
    // No expectedIssuer argument — should succeed regardless of iss claim
    const result = await _verifyJWT(token, CLERK_DOMAIN)

    expect(result.sub).toBe('user_abc123')
  })

  it('rejects tokens with issuer substring match (not exact)', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'user_abc123',
      iss: `https://${CLERK_DOMAIN}/extra`,
      exp: now + 3600,
      iat: now,
    }

    const token = await createSignedJWT(payload, keySet.privateKey, 'key-1')

    await expect(_verifyJWT(token, CLERK_DOMAIN, `https://${CLERK_DOMAIN}`)).rejects.toThrow(
      'Invalid issuer'
    )
  })

  it('rejects tokens with invalid signature', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'user_abc123',
      iss: `https://${CLERK_DOMAIN}`,
      exp: now + 3600,
      iat: now,
    }

    // Sign with a different key pair (same kid, different key material)
    const wrongKeySet = await generateRSAKeyPair('key-1')
    const token = await createSignedJWT(payload, wrongKeySet.privateKey, 'key-1')

    // Mock returns the original key (not the one used to sign).
    // After signature fails, it will refetch JWKS (key rotation), but still get the same
    // original key, so verification fails again.
    // Need fresh Response per call since fetchJWKS reads the body
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => Promise.resolve(createJWKSResponse([keySet.publicJWK])))
    )

    await expect(_verifyJWT(token, CLERK_DOMAIN)).rejects.toThrow('Invalid JWT signature')
  })

  it('rejects tokens when signing key is not found in JWKS', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'user_abc123',
      iss: `https://${CLERK_DOMAIN}`,
      exp: now + 3600,
    }

    // Use a kid that does not exist in the JWKS
    const token = await createSignedJWT(payload, keySet.privateKey, 'unknown-key-id')

    // Need fresh Response per call since kid miss triggers a refetch
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => Promise.resolve(createJWKSResponse([keySet.publicJWK])))
    )

    await expect(_verifyJWT(token, CLERK_DOMAIN)).rejects.toThrow('Signing key not found in JWKS')
  })
})

// ============================================================================
// verifyJWT — audience claim validation
// ============================================================================

describe('verifyJWT audience validation', () => {
  let keySet: RSAKeySet
  const CLERK_DOMAIN = 'test.clerk.accounts.dev'
  const EXPECTED_AUD = 'ke-api'

  beforeEach(async () => {
    _resetJWKSCache()
    keySet = await generateRSAKeyPair('key-1')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => Promise.resolve(createJWKSResponse([keySet.publicJWK])))
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('accepts a JWT whose aud claim matches expectedAudience', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'user_aud_ok',
      iss: `https://${CLERK_DOMAIN}`,
      aud: EXPECTED_AUD,
      exp: now + 3600,
      iat: now,
    }

    const token = await createSignedJWT(payload, keySet.privateKey, 'key-1')
    const result = await _verifyJWT(token, CLERK_DOMAIN, `https://${CLERK_DOMAIN}`, EXPECTED_AUD)

    expect(result.sub).toBe('user_aud_ok')
    expect(result.aud).toBe(EXPECTED_AUD)
  })

  it('accepts a JWT whose aud array contains expectedAudience', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'user_aud_array',
      iss: `https://${CLERK_DOMAIN}`,
      aud: ['other-app', EXPECTED_AUD, 'yet-another-app'],
      exp: now + 3600,
      iat: now,
    }

    const token = await createSignedJWT(payload, keySet.privateKey, 'key-1')
    const result = await _verifyJWT(token, CLERK_DOMAIN, `https://${CLERK_DOMAIN}`, EXPECTED_AUD)

    expect(result.sub).toBe('user_aud_array')
  })

  it('rejects a JWT whose aud claim does not match expectedAudience', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'user_aud_wrong',
      iss: `https://${CLERK_DOMAIN}`,
      aud: 'some-other-app',
      exp: now + 3600,
      iat: now,
    }

    const token = await createSignedJWT(payload, keySet.privateKey, 'key-1')

    await expect(
      _verifyJWT(token, CLERK_DOMAIN, `https://${CLERK_DOMAIN}`, EXPECTED_AUD)
    ).rejects.toThrow('invalid audience')
  })

  it('rejects a JWT with no aud claim when expectedAudience is set', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'user_aud_missing',
      iss: `https://${CLERK_DOMAIN}`,
      exp: now + 3600,
      iat: now,
      // no aud
    }

    const token = await createSignedJWT(payload, keySet.privateKey, 'key-1')

    await expect(
      _verifyJWT(token, CLERK_DOMAIN, `https://${CLERK_DOMAIN}`, EXPECTED_AUD)
    ).rejects.toThrow('invalid audience')
  })

  it('rejects a JWT whose aud array does not contain expectedAudience', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'user_aud_array_miss',
      iss: `https://${CLERK_DOMAIN}`,
      aud: ['app-a', 'app-b'],
      exp: now + 3600,
      iat: now,
    }

    const token = await createSignedJWT(payload, keySet.privateKey, 'key-1')

    await expect(
      _verifyJWT(token, CLERK_DOMAIN, `https://${CLERK_DOMAIN}`, EXPECTED_AUD)
    ).rejects.toThrow('invalid audience')
  })

  it('skips audience validation when expectedAudience is not provided', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'user_aud_skip',
      iss: `https://${CLERK_DOMAIN}`,
      aud: 'anything-goes',
      exp: now + 3600,
      iat: now,
    }

    const token = await createSignedJWT(payload, keySet.privateKey, 'key-1')
    // No expectedAudience argument — should succeed regardless of aud claim
    const result = await _verifyJWT(token, CLERK_DOMAIN, `https://${CLERK_DOMAIN}`)

    expect(result.sub).toBe('user_aud_skip')
  })

  it('skips audience validation (and accepts missing aud) when expectedAudience is not provided', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'user_no_aud_no_check',
      iss: `https://${CLERK_DOMAIN}`,
      exp: now + 3600,
      iat: now,
    }

    const token = await createSignedJWT(payload, keySet.privateKey, 'key-1')
    const result = await _verifyJWT(token, CLERK_DOMAIN, `https://${CLERK_DOMAIN}`)

    expect(result.sub).toBe('user_no_aud_no_check')
  })
})

// ============================================================================
// JWKS fetching and caching
// ============================================================================

describe('JWKS fetching and caching', () => {
  let keySet: RSAKeySet
  const CLERK_DOMAIN = 'test.clerk.accounts.dev'

  beforeEach(async () => {
    _resetJWKSCache()
    keySet = await generateRSAKeyPair('key-1')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches JWKS on first JWT verification', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJWKSResponse([keySet.publicJWK]))
    vi.stubGlobal('fetch', fetchMock)

    const now = Math.floor(Date.now() / 1000)
    const token = await createSignedJWT(
      { sub: 'user_1', exp: now + 3600, iss: `https://${CLERK_DOMAIN}` },
      keySet.privateKey,
      'key-1'
    )

    await _verifyJWT(token, CLERK_DOMAIN)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(`https://${CLERK_DOMAIN}/.well-known/jwks.json`)
  })

  it('uses cached JWKS for subsequent verifications', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJWKSResponse([keySet.publicJWK]))
    vi.stubGlobal('fetch', fetchMock)

    const now = Math.floor(Date.now() / 1000)

    // First verification — triggers fetch
    const token1 = await createSignedJWT(
      { sub: 'user_1', exp: now + 3600, iss: `https://${CLERK_DOMAIN}` },
      keySet.privateKey,
      'key-1'
    )
    await _verifyJWT(token1, CLERK_DOMAIN)

    // Second verification — should use cache
    const token2 = await createSignedJWT(
      { sub: 'user_2', exp: now + 3600, iss: `https://${CLERK_DOMAIN}` },
      keySet.privateKey,
      'key-1'
    )
    await _verifyJWT(token2, CLERK_DOMAIN)

    expect(fetchMock).toHaveBeenCalledTimes(1) // only fetched once
  })

  it('throws when JWKS endpoint returns non-OK status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Not Found', { status: 404 })))

    const now = Math.floor(Date.now() / 1000)
    const token = await createSignedJWT(
      { sub: 'user_1', exp: now + 3600, iss: `https://${CLERK_DOMAIN}` },
      keySet.privateKey,
      'key-1'
    )

    await expect(_verifyJWT(token, CLERK_DOMAIN)).rejects.toThrow('Failed to fetch JWKS: 404')
  })

  it('ignores non-RSA or non-RS256 keys in JWKS response', async () => {
    const ecKey = {
      kty: 'EC',
      alg: 'ES256',
      kid: 'ec-key',
      crv: 'P-256',
      x: 'fake',
      y: 'fake',
    }
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          createJWKSResponse([ecKey as JsonWebKey & { kid: string }, keySet.publicJWK])
        )
    )

    const now = Math.floor(Date.now() / 1000)
    const token = await createSignedJWT(
      { sub: 'user_1', exp: now + 3600, iss: `https://${CLERK_DOMAIN}` },
      keySet.privateKey,
      'key-1'
    )

    // Should succeed because the valid RSA key-1 is present
    const result = await _verifyJWT(token, CLERK_DOMAIN)
    expect(result.sub).toBe('user_1')
  })
})

// ============================================================================
// Key rotation handling
// ============================================================================

describe('Key rotation handling', () => {
  const CLERK_DOMAIN = 'test.clerk.accounts.dev'

  beforeEach(() => {
    _resetJWKSCache()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('refetches JWKS when kid is not in cache (new key)', async () => {
    const oldKeySet = await generateRSAKeyPair('old-key')
    const newKeySet = await generateRSAKeyPair('new-key')

    let callCount = 0
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call: only old key
          return Promise.resolve(createJWKSResponse([oldKeySet.publicJWK]))
        }
        // Second call: new key added (rotation)
        return Promise.resolve(createJWKSResponse([oldKeySet.publicJWK, newKeySet.publicJWK]))
      })
    )

    // First: verify with old key to populate cache
    const now = Math.floor(Date.now() / 1000)
    const token1 = await createSignedJWT(
      { sub: 'user_1', exp: now + 3600, iss: `https://${CLERK_DOMAIN}` },
      oldKeySet.privateKey,
      'old-key'
    )
    await _verifyJWT(token1, CLERK_DOMAIN)

    // Second: verify with new key — cache miss triggers refetch
    const token2 = await createSignedJWT(
      { sub: 'user_2', exp: now + 3600, iss: `https://${CLERK_DOMAIN}` },
      newKeySet.privateKey,
      'new-key'
    )
    const result = await _verifyJWT(token2, CLERK_DOMAIN)

    expect(result.sub).toBe('user_2')
    expect(callCount).toBe(2)
  })

  it('refetches JWKS when signature verification fails with cached key', async () => {
    const keySetV1 = await generateRSAKeyPair('rotating-key')
    const keySetV2 = await generateRSAKeyPair('rotating-key') // same kid, different key material

    let callCount = 0
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve(createJWKSResponse([keySetV1.publicJWK]))
        }
        // After rotation, the JWKS endpoint serves the new key with same kid
        return Promise.resolve(createJWKSResponse([keySetV2.publicJWK]))
      })
    )

    // First: verify with v1 key
    const now = Math.floor(Date.now() / 1000)
    const token1 = await createSignedJWT(
      { sub: 'user_1', exp: now + 3600, iss: `https://${CLERK_DOMAIN}` },
      keySetV1.privateKey,
      'rotating-key'
    )
    await _verifyJWT(token1, CLERK_DOMAIN)
    expect(callCount).toBe(1)

    // Second: verify with v2 key — cached key will fail verification, triggering refetch
    const token2 = await createSignedJWT(
      { sub: 'user_2', exp: now + 3600, iss: `https://${CLERK_DOMAIN}` },
      keySetV2.privateKey,
      'rotating-key'
    )
    const result = await _verifyJWT(token2, CLERK_DOMAIN)

    expect(result.sub).toBe('user_2')
    expect(callCount).toBe(2) // refetched once after signature failure
  })

  it('refetches JWKS when cache has expired', async () => {
    const keySet = await generateRSAKeyPair('key-1')

    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(createJWKSResponse([keySet.publicJWK])))
    vi.stubGlobal('fetch', fetchMock)

    const now = Math.floor(Date.now() / 1000)

    // First verify to populate cache
    const token1 = await createSignedJWT(
      { sub: 'user_1', exp: now + 3600, iss: `https://${CLERK_DOMAIN}` },
      keySet.privateKey,
      'key-1'
    )
    await _verifyJWT(token1, CLERK_DOMAIN)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Advance time past TTL (1 hour)
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 61 * 60 * 1000)

    const token2 = await createSignedJWT(
      { sub: 'user_2', exp: Math.floor(Date.now() / 1000) + 3600, iss: `https://${CLERK_DOMAIN}` },
      keySet.privateKey,
      'key-1'
    )
    await _verifyJWT(token2, CLERK_DOMAIN)

    expect(fetchMock).toHaveBeenCalledTimes(2) // refetched because TTL expired

    vi.useRealTimers()
  })
})

// ============================================================================
// Auth middleware branching
// ============================================================================

describe('authMiddleware', () => {
  const CLERK_DOMAIN = 'test.clerk.accounts.dev'

  beforeEach(() => {
    _resetJWKSCache()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('JWT authentication path', () => {
    it('authenticates with a valid Bearer token and sets userId', async () => {
      const keySet = await generateRSAKeyPair('key-1')
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJWKSResponse([keySet.publicJWK])))

      const now = Math.floor(Date.now() / 1000)
      const token = await createSignedJWT(
        { sub: 'user_jwt_123', exp: now + 3600, iss: `https://${CLERK_DOMAIN}` },
        keySet.privateKey,
        'key-1'
      )

      const app = createTestApp()
      const res = await makeRequest(app, '/protected/resource', {
        headers: { Authorization: `Bearer ${token}` },
        clerkDomain: CLERK_DOMAIN,
      })

      expect(res.status).toBe(200)
      const body = (await res.json()) as { userId: string; ok: boolean }
      expect(body.userId).toBe('user_jwt_123')
      expect(body.ok).toBe(true)
    })

    it('returns 401 for an invalid Bearer token', async () => {
      const keySet = await generateRSAKeyPair('key-1')
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJWKSResponse([keySet.publicJWK])))

      const app = createTestApp()
      const res = await makeRequest(app, '/protected/resource', {
        headers: { Authorization: 'Bearer invalid.token.here' },
        clerkDomain: CLERK_DOMAIN,
      })

      expect(res.status).toBe(401)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Invalid or expired token')
    })

    it('returns 401 when token has wrong issuer', async () => {
      const keySet = await generateRSAKeyPair('key-1')
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJWKSResponse([keySet.publicJWK])))

      const now = Math.floor(Date.now() / 1000)
      const token = await createSignedJWT(
        { sub: 'user_wrong_iss', exp: now + 3600, iss: 'https://evil.clerk.accounts.dev' },
        keySet.privateKey,
        'key-1'
      )

      const app = createTestApp()
      const res = await makeRequest(app, '/protected/resource', {
        headers: { Authorization: `Bearer ${token}` },
        clerkDomain: CLERK_DOMAIN,
      })

      expect(res.status).toBe(401)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Invalid or expired token')
    })

    it('returns 401 when token has wrong issuer with explicit CLERK_ISSUER_URL', async () => {
      const keySet = await generateRSAKeyPair('key-1')
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJWKSResponse([keySet.publicJWK])))

      const now = Math.floor(Date.now() / 1000)
      const token = await createSignedJWT(
        { sub: 'user_wrong_iss', exp: now + 3600, iss: `https://${CLERK_DOMAIN}` },
        keySet.privateKey,
        'key-1'
      )

      const app = createTestApp()
      // CLERK_ISSUER_URL explicitly set to a different value than what's in the token
      const res = await makeRequest(app, '/protected/resource', {
        headers: { Authorization: `Bearer ${token}` },
        clerkDomain: CLERK_DOMAIN,
        clerkIssuerUrl: 'https://different-issuer.clerk.accounts.dev',
      })

      expect(res.status).toBe(401)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Invalid or expired token')
    })

    it('authenticates successfully when CLERK_ISSUER_URL matches token issuer', async () => {
      const keySet = await generateRSAKeyPair('key-1')
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJWKSResponse([keySet.publicJWK])))

      const now = Math.floor(Date.now() / 1000)
      const customIssuer = 'https://custom-clerk-issuer.example.com'
      const token = await createSignedJWT(
        { sub: 'user_custom_iss', exp: now + 3600, iss: customIssuer },
        keySet.privateKey,
        'key-1'
      )

      const app = createTestApp()
      const res = await makeRequest(app, '/protected/resource', {
        headers: { Authorization: `Bearer ${token}` },
        clerkDomain: CLERK_DOMAIN,
        clerkIssuerUrl: customIssuer,
      })

      expect(res.status).toBe(200)
      const body = (await res.json()) as { userId: string; ok: boolean }
      expect(body.userId).toBe('user_custom_iss')
      expect(body.ok).toBe(true)
    })

    it('returns 401 for an expired Bearer token', async () => {
      const keySet = await generateRSAKeyPair('key-1')
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJWKSResponse([keySet.publicJWK])))

      const now = Math.floor(Date.now() / 1000)
      const token = await createSignedJWT(
        { sub: 'user_exp', exp: now - 60, iss: `https://${CLERK_DOMAIN}` },
        keySet.privateKey,
        'key-1'
      )

      const app = createTestApp()
      const res = await makeRequest(app, '/protected/resource', {
        headers: { Authorization: `Bearer ${token}` },
        clerkDomain: CLERK_DOMAIN,
      })

      expect(res.status).toBe(401)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Invalid or expired token')
    })
  })

  describe('X-User-Id header is rejected (no fallback)', () => {
    it('returns 401 with X-User-Id when no Authorization header is present', async () => {
      const app = createTestApp()
      const res = await makeRequest(app, '/protected/resource', {
        headers: { 'X-User-Id': 'user_fallback_456' },
        clerkDomain: CLERK_DOMAIN,
      })

      expect(res.status).toBe(401)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Missing authentication')
    })

    it('returns 401 with X-User-Id when CLERK_DOMAIN is not set', async () => {
      const app = createTestApp()
      const res = await makeRequest(app, '/protected/resource', {
        headers: {
          Authorization: 'Bearer some.jwt.token',
          'X-User-Id': 'user_no_clerk',
        },
        // no clerkDomain
      })

      expect(res.status).toBe(401)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Missing authentication')
    })

    it('returns 401 with X-User-Id when Authorization header is not Bearer', async () => {
      const app = createTestApp()
      const res = await makeRequest(app, '/protected/resource', {
        headers: {
          Authorization: 'Basic dXNlcjpwYXNz',
          'X-User-Id': 'user_basic_auth',
        },
        clerkDomain: CLERK_DOMAIN,
      })

      expect(res.status).toBe(401)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Missing authentication')
    })
  })

  describe('Missing authentication', () => {
    it('returns 401 when no auth headers are provided', async () => {
      const app = createTestApp()
      const res = await makeRequest(app, '/protected/resource', {
        clerkDomain: CLERK_DOMAIN,
      })

      expect(res.status).toBe(401)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Missing authentication')
    })

    it('returns 401 when Authorization header is empty', async () => {
      const app = createTestApp()
      const res = await makeRequest(app, '/protected/resource', {
        headers: { Authorization: '' },
        clerkDomain: CLERK_DOMAIN,
      })

      expect(res.status).toBe(401)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Missing authentication')
    })
  })

  describe('JWT is the only auth path; X-User-Id is ignored', () => {
    it('uses JWT sub even when X-User-Id header is also present', async () => {
      const keySet = await generateRSAKeyPair('key-1')
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJWKSResponse([keySet.publicJWK])))

      const now = Math.floor(Date.now() / 1000)
      const token = await createSignedJWT(
        { sub: 'user_jwt_wins', exp: now + 3600, iss: `https://${CLERK_DOMAIN}` },
        keySet.privateKey,
        'key-1'
      )

      const app = createTestApp()
      const res = await makeRequest(app, '/protected/resource', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-User-Id': 'user_header_ignored',
        },
        clerkDomain: CLERK_DOMAIN,
      })

      expect(res.status).toBe(200)
      const body = (await res.json()) as { userId: string }
      expect(body.userId).toBe('user_jwt_wins')
    })

    it('returns 401 when JWT is invalid, even if X-User-Id is present', async () => {
      const keySet = await generateRSAKeyPair('key-1')
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJWKSResponse([keySet.publicJWK])))

      const app = createTestApp()
      const res = await makeRequest(app, '/protected/resource', {
        headers: {
          Authorization: 'Bearer invalid.jwt.token',
          'X-User-Id': 'user_fallback',
        },
        clerkDomain: CLERK_DOMAIN,
      })

      expect(res.status).toBe(401)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Invalid or expired token')
    })
  })

  describe('Public routes are unaffected', () => {
    it('does not apply auth to routes outside the middleware scope', async () => {
      const app = createTestApp()
      const res = await makeRequest(app, '/public')

      expect(res.status).toBe(200)
      const body = (await res.json()) as { ok: boolean }
      expect(body.ok).toBe(true)
    })
  })

  describe('CLERK_JWT_AUDIENCE enforcement', () => {
    beforeEach(() => {
      _resetAudienceWarning()
    })

    it('returns 200 when token aud matches CLERK_JWT_AUDIENCE', async () => {
      const keySet = await generateRSAKeyPair('key-1')
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJWKSResponse([keySet.publicJWK])))

      const now = Math.floor(Date.now() / 1000)
      const token = await createSignedJWT(
        {
          sub: 'user_aud_ok',
          exp: now + 3600,
          iss: `https://${CLERK_DOMAIN}`,
          aud: 'ke-api',
        },
        keySet.privateKey,
        'key-1'
      )

      const app = createTestApp()
      const res = await makeRequest(app, '/protected/resource', {
        headers: { Authorization: `Bearer ${token}` },
        clerkDomain: CLERK_DOMAIN,
        clerkJwtAudience: 'ke-api',
      })

      expect(res.status).toBe(200)
      const body = (await res.json()) as { userId: string; ok: boolean }
      expect(body.userId).toBe('user_aud_ok')
    })

    it('returns 401 when token aud does not match CLERK_JWT_AUDIENCE', async () => {
      const keySet = await generateRSAKeyPair('key-1')
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJWKSResponse([keySet.publicJWK])))

      const now = Math.floor(Date.now() / 1000)
      const token = await createSignedJWT(
        {
          sub: 'user_aud_mismatch',
          exp: now + 3600,
          iss: `https://${CLERK_DOMAIN}`,
          aud: 'other-app',
        },
        keySet.privateKey,
        'key-1'
      )

      const app = createTestApp()
      const res = await makeRequest(app, '/protected/resource', {
        headers: { Authorization: `Bearer ${token}` },
        clerkDomain: CLERK_DOMAIN,
        clerkJwtAudience: 'ke-api',
      })

      expect(res.status).toBe(401)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Invalid or expired token')
    })

    it('returns 401 when CLERK_JWT_AUDIENCE is set but the token has no aud claim', async () => {
      const keySet = await generateRSAKeyPair('key-1')
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJWKSResponse([keySet.publicJWK])))

      const now = Math.floor(Date.now() / 1000)
      const token = await createSignedJWT(
        {
          sub: 'user_aud_missing',
          exp: now + 3600,
          iss: `https://${CLERK_DOMAIN}`,
          // no aud
        },
        keySet.privateKey,
        'key-1'
      )

      const app = createTestApp()
      const res = await makeRequest(app, '/protected/resource', {
        headers: { Authorization: `Bearer ${token}` },
        clerkDomain: CLERK_DOMAIN,
        clerkJwtAudience: 'ke-api',
      })

      expect(res.status).toBe(401)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Invalid or expired token')
    })

    it('logs a single warning when CLERK_JWT_AUDIENCE is unset across multiple requests', async () => {
      const keySet = await generateRSAKeyPair('key-1')
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJWKSResponse([keySet.publicJWK])))
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const now = Math.floor(Date.now() / 1000)
      const token = await createSignedJWT(
        {
          sub: 'user_no_aud_check',
          exp: now + 3600,
          iss: `https://${CLERK_DOMAIN}`,
          aud: 'whatever',
        },
        keySet.privateKey,
        'key-1'
      )

      const app = createTestApp()
      // First request — warning is emitted
      await makeRequest(app, '/protected/resource', {
        headers: { Authorization: `Bearer ${token}` },
        clerkDomain: CLERK_DOMAIN,
      })
      // Second request — warning is NOT re-emitted
      await makeRequest(app, '/protected/resource', {
        headers: { Authorization: `Bearer ${token}` },
        clerkDomain: CLERK_DOMAIN,
      })

      const audienceWarnings = warnSpy.mock.calls.filter((call) =>
        String(call[0] ?? '').includes('CLERK_JWT_AUDIENCE')
      )
      expect(audienceWarnings).toHaveLength(1)
    })

    it('keeps existing behavior unchanged when CLERK_JWT_AUDIENCE is unset (token without aud passes)', async () => {
      const keySet = await generateRSAKeyPair('key-1')
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJWKSResponse([keySet.publicJWK])))

      const now = Math.floor(Date.now() / 1000)
      const token = await createSignedJWT(
        {
          sub: 'user_legacy',
          exp: now + 3600,
          iss: `https://${CLERK_DOMAIN}`,
          // no aud — legacy template
        },
        keySet.privateKey,
        'key-1'
      )

      const app = createTestApp()
      const res = await makeRequest(app, '/protected/resource', {
        headers: { Authorization: `Bearer ${token}` },
        clerkDomain: CLERK_DOMAIN,
        // no clerkJwtAudience
      })

      expect(res.status).toBe(200)
      const body = (await res.json()) as { userId: string }
      expect(body.userId).toBe('user_legacy')
    })
  })
})
