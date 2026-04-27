import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { app } from '../index'
import { _resetJWKSCache } from '../middleware/auth'
import { generateRSAKeyPair, createSignedJWT, createJWKSResponse, type RSAKeySet } from './helpers/jwt'

// ============================================================================
// Auto-Create Family Tests
//
// Tests for auto-creating a default family on user sync, backfilling existing
// users, and allowing join when user has an empty auto-created family.
// ============================================================================

const CLERK_DOMAIN = 'test.clerk.accounts.dev'

let keySet: RSAKeySet
const tokenCache = new Map<string, string>()

beforeAll(async () => {
  keySet = await generateRSAKeyPair('auto-family-key-1')
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

async function getToken(userId: string): Promise<string> {
  const cached = tokenCache.get(userId)
  if (cached) return cached

  const now = Math.floor(Date.now() / 1000)
  const token = await createSignedJWT(
    { sub: userId, exp: now + 3600, iss: `https://${CLERK_DOMAIN}` },
    keySet.privateKey,
    'auto-family-key-1'
  )
  tokenCache.set(userId, token)
  return token
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeAuthRequest(
  path: string,
  mockDb: unknown,
  userId: string = 'user-001',
  options?: RequestInit
) {
  const token = await getToken(userId)
  return app.request(
    path,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options?.headers || {}),
      },
    },
    {
      DB: mockDb as D1Database,
      CLERK_DOMAIN,
    }
  )
}

// ============================================================================
// POST /users/sync — Auto-create family
// ============================================================================

describe('Auto-create family on user sync', () => {
  it('creates both user and family for a new user', async () => {
    const preparedStatements: string[] = []

    const mockDb = {
      prepare: vi.fn().mockImplementation((sql: string) => {
        preparedStatements.push(sql)
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null), // no existing user, no existing family
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        }
      }),
    }

    const res = await makeAuthRequest('/users/sync', mockDb, 'new-user-001', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@test.com', name: 'New User' }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; action: string; userId: string }
    expect(body.success).toBe(true)
    expect(body.action).toBe('created')

    // Verify INSERT INTO users was called
    const userInsert = preparedStatements.find(
      (s) => s.includes('INSERT INTO users') && s.includes('VALUES')
    )
    expect(userInsert).toBeDefined()

    // Verify INSERT INTO families was called
    const familyInsert = preparedStatements.find(
      (s) => s.includes('INSERT INTO families') && s.includes('parent_a_id')
    )
    expect(familyInsert).toBeDefined()
  })

  it('creates family for existing user who has no family', async () => {
    let prepareCallIndex = 0
    const preparedStatements: string[] = []

    const mockDb = {
      prepare: vi.fn().mockImplementation((sql: string) => {
        prepareCallIndex++
        preparedStatements.push(sql)
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockImplementation(() => {
              // 1: SELECT id FROM users — user exists
              if (prepareCallIndex === 1) return Promise.resolve({ id: 'existing-user' })
              // 2: UPDATE users — no return needed
              // 3: SELECT id FROM families — no active family
              if (prepareCallIndex === 3) return Promise.resolve(null)
              return Promise.resolve(null)
            }),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        }
      }),
    }

    const res = await makeAuthRequest('/users/sync', mockDb, 'existing-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'existing@test.com', name: 'Existing User' }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; action: string }
    expect(body.success).toBe(true)
    expect(body.action).toBe('updated')

    // Verify family creation was attempted
    const familyInsert = preparedStatements.find(
      (s) => s.includes('INSERT INTO families') && s.includes('parent_a_id')
    )
    expect(familyInsert).toBeDefined()
  })

  it('does NOT create a second family for user who already has one', async () => {
    let prepareCallIndex = 0
    const preparedStatements: string[] = []

    const mockDb = {
      prepare: vi.fn().mockImplementation((sql: string) => {
        prepareCallIndex++
        preparedStatements.push(sql)
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockImplementation(() => {
              // 1: SELECT id FROM users — user exists
              if (prepareCallIndex === 1) return Promise.resolve({ id: 'existing-user' })
              // 2: UPDATE users — no return needed
              // 3: SELECT id FROM families — has active family
              if (prepareCallIndex === 3) return Promise.resolve({ id: 'fam-existing' })
              return Promise.resolve(null)
            }),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        }
      }),
    }

    const res = await makeAuthRequest('/users/sync', mockDb, 'existing-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'existing@test.com', name: 'Existing User' }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; action: string }
    expect(body.success).toBe(true)
    expect(body.action).toBe('updated')

    // Verify NO family INSERT was called (only SELECT on families, no INSERT)
    const familyInsert = preparedStatements.find((s) => s.includes('INSERT INTO families'))
    expect(familyInsert).toBeUndefined()
  })
})

// ============================================================================
// POST /families/join — Join with auto-created empty family
// ============================================================================

describe('Join family with auto-created empty family', () => {
  const TARGET_FAMILY = {
    id: 'fam-target',
    name: 'Target Family',
    parent_a_id: 'user-creator',
    parent_b_id: null,
    parent_a_ratio: 0.5,
    status: null,
    invite_code: 'TESTCODE',
    invite_expires_at: new Date(Date.now() + 86400000).toISOString(),
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }

  it('deletes empty auto-created family and allows join', async () => {
    let prepareCallIndex = 0
    const preparedStatements: string[] = []

    // User has an empty auto-created family and wants to join another
    const autoCreatedFamily = {
      id: 'fam-auto',
      name: null,
      parent_a_id: 'user-joiner',
      parent_b_id: null,
      parent_a_ratio: 0.5,
      status: null,
      invite_code: null,
      invite_expires_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }

    const mockDb = {
      prepare: vi.fn().mockImplementation((sql: string) => {
        prepareCallIndex++
        preparedStatements.push(sql)
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockImplementation(() => {
              // 1: SELECT id FROM users — user exists
              if (prepareCallIndex === 1) return Promise.resolve({ id: 'user-joiner' })
              // 2: SELECT * FROM families WHERE (parent_a_id = ? ...) — auto-created family
              if (prepareCallIndex === 2) return Promise.resolve(autoCreatedFamily)
              // 3: COUNT expenses — 0
              if (prepareCallIndex === 3) return Promise.resolve({ cnt: 0 })
              // 4: COUNT children — 0
              if (prepareCallIndex === 4) return Promise.resolve({ cnt: 0 })
              // 5: COUNT payments — 0
              if (prepareCallIndex === 5) return Promise.resolve({ cnt: 0 })
              // 6: DELETE FROM families (run, not first)
              // 7: SELECT * FROM families WHERE invite_code — target family
              if (prepareCallIndex === 7) return Promise.resolve(TARGET_FAMILY)
              // 8: UPDATE families SET parent_b_id (run, not first)
              // 9: UPDATE pending_invites (run, not first)
              // 10: SELECT * FROM families WHERE id — updated target family
              if (prepareCallIndex === 10) {
                return Promise.resolve({ ...TARGET_FAMILY, parent_b_id: 'user-joiner' })
              }
              return Promise.resolve(null)
            }),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        }
      }),
    }

    const res = await makeAuthRequest('/families/join', mockDb, 'user-joiner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode: 'TESTCODE' }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; family: { parent_b_id: string } }
    expect(body.success).toBe(true)
    expect(body.family.parent_b_id).toBe('user-joiner')

    // Verify the auto-created family was deleted
    const deleteStatement = preparedStatements.find((s) => s.includes('DELETE FROM families'))
    expect(deleteStatement).toBeDefined()
  })

  it('rejects join when user has non-empty family (has expenses)', async () => {
    let prepareCallIndex = 0

    const familyWithData = {
      id: 'fam-nonempty',
      name: null,
      parent_a_id: 'user-busy',
      parent_b_id: null,
      parent_a_ratio: 0.5,
      status: null,
      invite_code: null,
      invite_expires_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }

    const mockDb = {
      prepare: vi.fn().mockImplementation(() => {
        prepareCallIndex++
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockImplementation(() => {
              // 1: user exists
              if (prepareCallIndex === 1) return Promise.resolve({ id: 'user-busy' })
              // 2: existing family found
              if (prepareCallIndex === 2) return Promise.resolve(familyWithData)
              // 3: COUNT expenses — 1 (non-empty!)
              if (prepareCallIndex === 3) return Promise.resolve({ cnt: 1 })
              return Promise.resolve(null)
            }),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        }
      }),
    }

    const res = await makeAuthRequest('/families/join', mockDb, 'user-busy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode: 'TESTCODE' }),
    })

    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('User already belongs to a family')
  })

  it('rejects join when user has family with partner', async () => {
    let prepareCallIndex = 0

    const familyWithPartner = {
      id: 'fam-partner',
      name: 'Family With Partner',
      parent_a_id: 'user-partnered',
      parent_b_id: 'user-other',
      parent_a_ratio: 0.5,
      status: null,
      invite_code: null,
      invite_expires_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }

    const mockDb = {
      prepare: vi.fn().mockImplementation(() => {
        prepareCallIndex++
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockImplementation(() => {
              // 1: user exists
              if (prepareCallIndex === 1) return Promise.resolve({ id: 'user-partnered' })
              // 2: existing family with partner
              if (prepareCallIndex === 2) return Promise.resolve(familyWithPartner)
              return Promise.resolve(null)
            }),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        }
      }),
    }

    const res = await makeAuthRequest('/families/join', mockDb, 'user-partnered', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode: 'TESTCODE' }),
    })

    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('User already belongs to a family')
  })
})
