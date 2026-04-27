import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { app } from '../index'
import { _resetJWKSCache } from '../middleware/auth'
import { generateRSAKeyPair, createSignedJWT, createJWKSResponse, type RSAKeySet } from './helpers/jwt'

// These tests verify route wiring and middleware behavior using Hono's app.request().
// They don't need a real D1 database — they test routing, auth middleware, and 404 handling.

const CLERK_DOMAIN = 'test.clerk.accounts.dev'

let keySet: RSAKeySet
let authToken: string

beforeAll(async () => {
  keySet = await generateRSAKeyPair('routes-key-1')
  const now = Math.floor(Date.now() / 1000)
  authToken = await createSignedJWT(
    { sub: 'test-user', exp: now + 3600, iss: `https://${CLERK_DOMAIN}` },
    keySet.privateKey,
    'routes-key-1'
  )
})

beforeEach(() => {
  _resetJWKSCache()
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() => Promise.resolve(createJWKSResponse([keySet.publicJWK])))
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

function makeRequest(path: string, options?: RequestInit) {
  return app.request(path, options, {
    DB: {} as D1Database, // stub — routes will fail at DB access, but we're testing routing/auth
    CLERK_DOMAIN,
  })
}

describe('Route wiring', () => {
  describe('Unprotected routes', () => {
    it('GET /health should not require auth', async () => {
      const res = await makeRequest('/health')
      // Will fail at DB access but should NOT return 401
      expect(res.status).not.toBe(401)
    })

    it('GET / should return API info', async () => {
      const res = await makeRequest('/')
      expect(res.status).toBe(200)
      const body = (await res.json()) as { name: string; endpoints: string[] }
      expect(body.name).toBe('ke-api')
      expect(body.endpoints).toContain('/health')
    })
  })

  describe('Auth middleware on protected routes', () => {
    it('POST /users/sync should return 401 without auth', async () => {
      const res = await makeRequest('/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com' }),
      })
      expect(res.status).toBe(401)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Missing authentication')
    })

    it('GET /me should return 401 without auth', async () => {
      const res = await makeRequest('/me')
      expect(res.status).toBe(401)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Missing authentication')
    })

    it('GET /families/some-id should return 401 without auth', async () => {
      const res = await makeRequest('/families/some-id')
      expect(res.status).toBe(401)
    })

    it('GET /expenses/some-id should return 401 without auth', async () => {
      const res = await makeRequest('/expenses/some-id')
      expect(res.status).toBe(401)
    })

    it('GET /families/some-id/activity should return 401 without auth', async () => {
      const res = await makeRequest('/families/some-id/activity')
      expect(res.status).toBe(401)
    })

    it('POST /families should return 401 without auth', async () => {
      const res = await makeRequest('/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Family' }),
      })
      expect(res.status).toBe(401)
    })

    it('POST /families/join should return 401 without auth', async () => {
      const res = await makeRequest('/families/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: 'ABC123' }),
      })
      expect(res.status).toBe(401)
    })
  })

  describe('Route ordering', () => {
    it('POST /families/join should not be captured by GET /families/:id', async () => {
      const res = await makeRequest('/families/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ inviteCode: 'ABC123' }),
      })
      // Should not return 404 (route exists) — will fail at DB access, which is expected
      expect(res.status).not.toBe(404)
    })

    it('POST /families/:id/invite/email should resolve correctly (not captured by /:id/invite)', async () => {
      const res = await makeRequest('/families/test-id/invite/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ email: 'test@example.com' }),
      })
      // Should not return 404 — the route exists and should match
      expect(res.status).not.toBe(404)
    })
  })

  describe('404 handling', () => {
    it('Unknown route should return 404', async () => {
      const res = await makeRequest('/nonexistent')
      expect(res.status).toBe(404)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Not found')
    })

    it('Unknown method on known route should return 404', async () => {
      const res = await makeRequest('/health', { method: 'DELETE' })
      expect(res.status).toBe(404)
    })
  })
})
