import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { app } from '../index'
import { _resetJWKSCache } from '../middleware/auth'
import { generateRSAKeyPair, createSignedJWT, createJWKSResponse, type RSAKeySet } from './helpers/jwt'

// ============================================================================
// Integration Tests for Route Handlers
//
// These tests exercise actual HTTP request/response behavior through Hono's
// app.request(). They mock the D1 database layer but test everything above it:
// input parsing, auth checks, validation, response formatting, and status codes.
// ============================================================================

const CLERK_DOMAIN = 'test.clerk.accounts.dev'

// Module-level key set and token cache for fast test execution
let keySet: RSAKeySet
const tokenCache = new Map<string, string>()

// Generate key pair once before all tests
beforeAll(async () => {
  keySet = await generateRSAKeyPair('integration-key-1')
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

/** Create a valid JWT for the given userId. Caches tokens per userId for performance. */
async function getToken(userId: string): Promise<string> {
  const cached = tokenCache.get(userId)
  if (cached) return cached

  const now = Math.floor(Date.now() / 1000)
  const token = await createSignedJWT(
    { sub: userId, exp: now + 3600, iss: `https://${CLERK_DOMAIN}` },
    keySet.privateKey,
    'integration-key-1'
  )
  tokenCache.set(userId, token)
  return token
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Make an unauthenticated request (no auth headers). */
function makeRequest(path: string, mockDb: unknown, options?: RequestInit) {
  return app.request(path, options, {
    DB: mockDb as D1Database,
    CLERK_DOMAIN,
  })
}

/** Make an authenticated request using a JWT Bearer token. */
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

/** Minimal mock DB that returns null/empty for every query. */
function emptyMockDb() {
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
    }),
  }
}

// Reusable test data
const FAMILY = {
  id: 'fam-001',
  name: 'Test Family',
  parent_a_id: 'user-001',
  parent_b_id: 'user-002',
  parent_a_ratio: 0.5,
  status: null,
  invite_code: null,
  invite_expires_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const EXPENSE = {
  id: 'exp-001',
  family_id: 'fam-001',
  created_by: 'user-001',
  paid_by: 'user-001',
  fixed_expense_id: null,
  description: 'Piano lessons',
  amount_cents: 5000,
  category: 'activities',
  expense_date: '2026-02-01',
  child_ids: null,
  link_url: null,
  memo: null,
  status: 'posted',
  questioned_by: null,
  questioned_at: null,
  question_reason: null,
  question_note: null,
  resolved_at: null,
  resolution_action: null,
  satisfied_at: null,
  closed_unresolved_at: null,
  closed_unresolved_by: null,
  created_at: '2026-02-01T00:00:00.000Z',
  updated_at: '2026-02-01T00:00:00.000Z',
  deleted_at: null,
}

// ============================================================================
// Auth Enforcement
// ============================================================================

describe('Auth enforcement (integration)', () => {
  it('GET /me returns 401 without auth headers', async () => {
    const res = await makeRequest('/me', emptyMockDb())
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Missing authentication')
  })

  it('POST /families/:id/expenses returns 401 without auth', async () => {
    const res = await makeRequest('/families/fam-001/expenses', emptyMockDb(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Test', amount: 10, category: 'school' }),
    })
    expect(res.status).toBe(401)
  })

  it('GET /families/:id/balance returns 401 without auth', async () => {
    const res = await makeRequest('/families/fam-001/balance', emptyMockDb())
    expect(res.status).toBe(401)
  })

  it('POST /expenses/:id/question returns 401 without auth', async () => {
    const res = await makeRequest('/expenses/exp-001/question', emptyMockDb(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'wrong_amount' }),
    })
    expect(res.status).toBe(401)
  })

  it('POST /expenses/:id/resolve returns 401 without auth', async () => {
    const res = await makeRequest('/expenses/exp-001/resolve', emptyMockDb(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'keep' }),
    })
    expect(res.status).toBe(401)
  })

  it('POST /expenses/:id/satisfy returns 401 without auth', async () => {
    const res = await makeRequest('/expenses/exp-001/satisfy', emptyMockDb(), {
      method: 'POST',
    })
    expect(res.status).toBe(401)
  })

  it('Bearer token with invalid format returns 401', async () => {
    const res = await app.request(
      '/me',
      {
        headers: {
          Authorization: 'Bearer not-a-jwt',
        },
      },
      {
        DB: emptyMockDb() as unknown as D1Database,
        CLERK_DOMAIN: 'example.clerk.accounts.dev',
      }
    )
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Invalid or expired token')
  })

  it('X-User-Id header alone returns 401 (no fallback)', async () => {
    const res = await app.request(
      '/me',
      {
        headers: { 'X-User-Id': 'user-001' },
      },
      {
        DB: emptyMockDb() as unknown as D1Database,
        CLERK_DOMAIN,
      }
    )
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Missing authentication')
  })

  it('Bearer token with valid JWT grants access to protected routes', async () => {
    // Build a mock that returns a user for /me
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({
            id: 'user-001',
            email: 'alice@test.com',
            name: 'Alice',
            created_at: '2026-01-01T00:00:00.000Z',
          }),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      }),
    }

    const res = await makeAuthRequest('/me', mockDb, 'user-001')
    // Should NOT be 401 — auth passes via JWT
    expect(res.status).not.toBe(401)
  })
})

// ============================================================================
// Expense Creation (POST /families/:id/expenses)
// ============================================================================

describe('Expense creation (integration)', () => {
  it('returns 201 with valid body', async () => {
    let prepareCallIndex = 0

    const mockDb = {
      prepare: vi.fn().mockImplementation(() => {
        prepareCallIndex++
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockImplementation(() => {
              // 1: family lookup
              if (prepareCallIndex === 1) return Promise.resolve(FAMILY)
              // 3: fetch created expense
              if (prepareCallIndex === 3) return Promise.resolve({ ...EXPENSE, id: 'exp-new' })
              // 5: actor name for notification
              if (prepareCallIndex === 5) {
                return Promise.resolve({ name: 'Alice', email: 'alice@test.com' })
              }
              return Promise.resolve(null)
            }),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        }
      }),
    }

    const res = await makeAuthRequest('/families/fam-001/expenses', mockDb, 'user-001', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'School supplies',
        amount: 25.5,
        category: 'school',
        expenseDate: '2026-02-15',
      }),
    })

    expect(res.status).toBe(201)
    const body = (await res.json()) as { success: boolean; expense: { id: string } }
    expect(body.success).toBe(true)
    expect(body.expense).toBeDefined()
    expect(body.expense.id).toBe('exp-new')
  })

  it('returns 400 when description is missing', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(FAMILY),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      }),
    }

    const res = await makeAuthRequest('/families/fam-001/expenses', mockDb, 'user-001', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 25.5,
        category: 'school',
      }),
    })

    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Description is required')
  })

  it('returns 400 when amount is missing', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(FAMILY),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      }),
    }

    const res = await makeAuthRequest('/families/fam-001/expenses', mockDb, 'user-001', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'School supplies',
        category: 'school',
      }),
    })

    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Amount is required and must be a number')
  })

  it('returns 400 when category is invalid', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(FAMILY),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      }),
    }

    const res = await makeAuthRequest('/families/fam-001/expenses', mockDb, 'user-001', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'School supplies',
        amount: 25.5,
        category: 'invalid-category',
      }),
    })

    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toContain('Category is required')
  })

  it('returns 400 when description exceeds 200 characters', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(FAMILY),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      }),
    }

    const longDescription = 'A'.repeat(201)

    const res = await makeAuthRequest('/families/fam-001/expenses', mockDb, 'user-001', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: longDescription,
        amount: 25.5,
        category: 'school',
      }),
    })

    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Description must be 200 characters or less')
  })

  it('returns 400 when memo exceeds 500 characters', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(FAMILY),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      }),
    }

    const res = await makeAuthRequest('/families/fam-001/expenses', mockDb, 'user-001', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Test expense',
        amount: 25.5,
        category: 'school',
        memo: 'M'.repeat(501),
      }),
    })

    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Memo must be 500 characters or less')
  })

  it('returns 404 when family does not exist', async () => {
    const res = await makeAuthRequest(
      '/families/fam-nonexistent/expenses',
      emptyMockDb(),
      'user-001',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Test',
          amount: 10,
          category: 'school',
        }),
      }
    )

    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Family not found')
  })

  it('returns 403 when user is not a family member', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({
            ...FAMILY,
            parent_a_id: 'other-user-a',
            parent_b_id: 'other-user-b',
          }),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      }),
    }

    const res = await makeAuthRequest('/families/fam-001/expenses', mockDb, 'user-001', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Test',
        amount: 10,
        category: 'school',
      }),
    })

    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Not authorized to add expenses to this family')
  })
})

// ============================================================================
// Balance Endpoint (GET /families/:id/balance)
// ============================================================================

describe('Balance endpoint (integration)', () => {
  it('returns proper response structure with 200', async () => {
    let prepareCallIndex = 0

    const mockDb = {
      prepare: vi.fn().mockImplementation(() => {
        prepareCallIndex++
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockImplementation(() => {
              // 1: family lookup
              if (prepareCallIndex === 1) return Promise.resolve(FAMILY)
              return Promise.resolve(null)
            }),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        }
      }),
    }

    const res = await makeAuthRequest('/families/fam-001/balance', mockDb, 'user-001')

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      balance_cents: number
      payer_id: string | null
      payee_id: string | null
      parent_a_id: string
      parent_b_id: string | null
      breakdown: {
        total_expenses_cents: number
        included_expenses_count: number
        a_share_cents: number
        b_share_cents: number
        a_paid_cents: number
        b_paid_cents: number
        payments_a_to_b_cents: number
        payments_b_to_a_cents: number
        questioned_total_cents: number
        questioned_count: number
      }
      period: { start: string; end: string; label: string }
      current_period: {
        a_expenses_cents: number
        a_payments_cents: number
        b_expenses_cents: number
        b_payments_cents: number
      }
      prior_balance: {
        balance_cents: number
        payer_id: string | null
        payee_id: string | null
      }
    }

    // Verify all required top-level fields exist
    expect(body.balance_cents).toBeDefined()
    expect(typeof body.balance_cents).toBe('number')
    expect(body.parent_a_id).toBe('user-001')
    expect(body.parent_b_id).toBe('user-002')

    // Verify breakdown structure
    expect(body.breakdown).toBeDefined()
    expect(typeof body.breakdown.total_expenses_cents).toBe('number')
    expect(typeof body.breakdown.a_share_cents).toBe('number')
    expect(typeof body.breakdown.b_share_cents).toBe('number')
    expect(typeof body.breakdown.questioned_total_cents).toBe('number')
    expect(typeof body.breakdown.questioned_count).toBe('number')

    // Verify period structure
    expect(body.period).toBeDefined()
    expect(body.period.start).toBeDefined()
    expect(body.period.end).toBeDefined()
    expect(body.period.label).toBeDefined()

    // Verify current_period structure
    expect(body.current_period).toBeDefined()

    // Verify prior_balance structure
    expect(body.prior_balance).toBeDefined()
  })

  it('returns 404 when family does not exist', async () => {
    const res = await makeAuthRequest(
      '/families/fam-nonexistent/balance',
      emptyMockDb(),
      'user-001'
    )

    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Family not found')
  })

  it('returns 403 when user is not a family member', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({
            ...FAMILY,
            parent_a_id: 'other-user-a',
            parent_b_id: 'other-user-b',
          }),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      }),
    }

    const res = await makeAuthRequest('/families/fam-001/balance', mockDb, 'user-001')

    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: string }
    expect(body.error).toContain('Not authorized')
  })

  it('calculates correct balance with expenses and no payments', async () => {
    let prepareCallIndex = 0

    // Parent A paid $100 in posted expenses, 50-50 split => B owes A $50
    const postedExpense = {
      id: 'exp-001',
      amount_cents: 10000,
      paid_by: 'user-001',
      status: 'posted',
      expense_date: new Date().toISOString().split('T')[0],
    }

    const mockDb = {
      prepare: vi.fn().mockImplementation(() => {
        prepareCallIndex++
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockImplementation(() => {
              // 1: family lookup
              if (prepareCallIndex === 1) return Promise.resolve(FAMILY)
              return Promise.resolve(null)
            }),
            all: vi.fn().mockImplementation(() => {
              // 2: current period expenses
              if (prepareCallIndex === 2) {
                return Promise.resolve({ results: [postedExpense] })
              }
              // 3: prior period expenses
              if (prepareCallIndex === 3) {
                return Promise.resolve({ results: [] })
              }
              // 4: current period payments
              if (prepareCallIndex === 4) {
                return Promise.resolve({ results: [] })
              }
              // 5: prior period payments
              if (prepareCallIndex === 5) {
                return Promise.resolve({ results: [] })
              }
              // 6: all included expenses
              if (prepareCallIndex === 6) {
                return Promise.resolve({ results: [postedExpense] })
              }
              // 7: all payments
              if (prepareCallIndex === 7) {
                return Promise.resolve({ results: [] })
              }
              // 8: questioned expenses
              if (prepareCallIndex === 8) {
                return Promise.resolve({ results: [] })
              }
              return Promise.resolve({ results: [] })
            }),
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        }
      }),
    }

    const res = await makeAuthRequest('/families/fam-001/balance', mockDb, 'user-001')

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      balance_cents: number
      payer_id: string | null
      payee_id: string | null
    }

    // A paid $100, 50-50 split => B owes A $50
    expect(body.balance_cents).toBe(5000)
    expect(body.payer_id).toBe('user-002') // B is payer (B owes A)
    expect(body.payee_id).toBe('user-001') // A is payee
  })
})

// ============================================================================
// Dispute Lifecycle: Question -> Resolve -> Satisfy
// ============================================================================

describe('Dispute lifecycle (integration)', () => {
  describe('POST /expenses/:id/question', () => {
    it("returns success when questioning another user's posted expense", async () => {
      let prepareCallIndex = 0

      // user-002 is questioning user-001's expense
      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                // 1: expense lookup
                if (prepareCallIndex === 1) return Promise.resolve(EXPENSE)
                // 2: family lookup
                if (prepareCallIndex === 2) return Promise.resolve(FAMILY)
                // 4: updated expense after UPDATE
                if (prepareCallIndex === 4) {
                  return Promise.resolve({
                    ...EXPENSE,
                    status: 'questioned',
                    questioned_by: 'user-002',
                    question_reason: 'wrong_amount',
                  })
                }
                // 6: actor name for notification
                if (prepareCallIndex === 6) {
                  return Promise.resolve({ name: 'Bob', email: 'bob@test.com' })
                }
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      const res = await makeAuthRequest('/expenses/exp-001/question', mockDb, 'user-002', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'wrong_amount', note: 'Amount seems too high' }),
      })

      expect(res.status).toBe(200)
      const body = (await res.json()) as { success: boolean; expense: { status: string } }
      expect(body.success).toBe(true)
      expect(body.expense.status).toBe('questioned')
    })

    it('returns 400 when trying to question own expense', async () => {
      let prepareCallIndex = 0

      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                if (prepareCallIndex === 1) return Promise.resolve(EXPENSE) // created_by: user-001
                if (prepareCallIndex === 2) return Promise.resolve(FAMILY)
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      // user-001 tries to question their own expense
      const res = await makeAuthRequest('/expenses/exp-001/question', mockDb, 'user-001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'wrong_amount' }),
      })

      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Cannot question your own expense')
    })

    it('returns 400 with invalid reason', async () => {
      let prepareCallIndex = 0

      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                if (prepareCallIndex === 1) return Promise.resolve(EXPENSE)
                if (prepareCallIndex === 2) return Promise.resolve(FAMILY)
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      const res = await makeAuthRequest('/expenses/exp-001/question', mockDb, 'user-002', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'invalid_reason' }),
      })

      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string }
      expect(body.error).toContain('Valid reason is required')
    })

    it('returns 400 when expense is not in posted status', async () => {
      let prepareCallIndex = 0

      const questionedExpense = { ...EXPENSE, status: 'questioned' }

      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                if (prepareCallIndex === 1) return Promise.resolve(questionedExpense)
                if (prepareCallIndex === 2) return Promise.resolve(FAMILY)
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      const res = await makeAuthRequest('/expenses/exp-001/question', mockDb, 'user-002', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'wrong_amount' }),
      })

      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string }
      expect(body.error).toContain("Cannot question expense with status 'questioned'")
    })

    it('returns 404 when expense does not exist', async () => {
      const res = await makeAuthRequest(
        '/expenses/exp-nonexistent/question',
        emptyMockDb(),
        'user-002',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'wrong_amount' }),
        }
      )

      expect(res.status).toBe(404)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Expense not found')
    })
  })

  describe('POST /expenses/:id/resolve', () => {
    it('returns success when creator resolves with keep action', async () => {
      let prepareCallIndex = 0

      const questionedExpense = {
        ...EXPENSE,
        status: 'questioned',
        questioned_by: 'user-002',
        question_reason: 'wrong_amount',
      }

      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                // 1: expense lookup
                if (prepareCallIndex === 1) return Promise.resolve(questionedExpense)
                // 2: family lookup
                if (prepareCallIndex === 2) return Promise.resolve(FAMILY)
                // 4: updated expense
                if (prepareCallIndex === 4) {
                  return Promise.resolve({
                    ...questionedExpense,
                    status: 'pending_satisfaction',
                    resolution_action: 'keep',
                  })
                }
                // 6: actor name for notification
                if (prepareCallIndex === 6) {
                  return Promise.resolve({ name: 'Alice', email: 'alice@test.com' })
                }
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      // user-001 is the creator resolving
      const res = await makeAuthRequest('/expenses/exp-001/resolve', mockDb, 'user-001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'keep' }),
      })

      expect(res.status).toBe(200)
      const body = (await res.json()) as { success: boolean; expense: { status: string } }
      expect(body.success).toBe(true)
      expect(body.expense.status).toBe('pending_satisfaction')
    })

    it('returns 403 when non-creator tries to resolve', async () => {
      let prepareCallIndex = 0

      const questionedExpense = {
        ...EXPENSE,
        status: 'questioned',
        questioned_by: 'user-002',
        created_by: 'user-001',
      }

      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                if (prepareCallIndex === 1) return Promise.resolve(questionedExpense)
                if (prepareCallIndex === 2) return Promise.resolve(FAMILY)
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      // user-002 (not the creator) tries to resolve
      const res = await makeAuthRequest('/expenses/exp-001/resolve', mockDb, 'user-002', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'keep' }),
      })

      expect(res.status).toBe(403)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Only the expense creator can resolve')
    })

    it('returns 400 with invalid action', async () => {
      let prepareCallIndex = 0

      const questionedExpense = {
        ...EXPENSE,
        status: 'questioned',
        questioned_by: 'user-002',
      }

      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                if (prepareCallIndex === 1) return Promise.resolve(questionedExpense)
                if (prepareCallIndex === 2) return Promise.resolve(FAMILY)
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      const res = await makeAuthRequest('/expenses/exp-001/resolve', mockDb, 'user-001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invalid_action' }),
      })

      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string }
      expect(body.error).toContain('Valid action is required')
    })

    it('returns 400 when edit action has no newAmount', async () => {
      let prepareCallIndex = 0

      const questionedExpense = {
        ...EXPENSE,
        status: 'questioned',
        questioned_by: 'user-002',
      }

      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                if (prepareCallIndex === 1) return Promise.resolve(questionedExpense)
                if (prepareCallIndex === 2) return Promise.resolve(FAMILY)
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      const res = await makeAuthRequest('/expenses/exp-001/resolve', mockDb, 'user-001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit' }),
      })

      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string }
      expect(body.error).toContain('newAmount is required for edit action')
    })

    it('returns 400 when expense is not in questioned status', async () => {
      let prepareCallIndex = 0

      // Expense is still 'posted', not 'questioned'
      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                if (prepareCallIndex === 1) return Promise.resolve(EXPENSE) // status: 'posted'
                if (prepareCallIndex === 2) return Promise.resolve(FAMILY)
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      const res = await makeAuthRequest('/expenses/exp-001/resolve', mockDb, 'user-001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'keep' }),
      })

      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string }
      expect(body.error).toContain("Cannot resolve expense with status 'posted'")
    })
  })

  describe('POST /expenses/:id/satisfy', () => {
    it('returns success when questioner satisfies a pending_satisfaction expense', async () => {
      let prepareCallIndex = 0

      // resolved_at must be recent so applyTimeoutChecks does NOT auto-resolve
      const pendingExpense = {
        ...EXPENSE,
        status: 'pending_satisfaction',
        questioned_by: 'user-002',
        resolution_action: 'keep',
        resolved_at: new Date().toISOString(),
      }

      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                // 1: expense lookup
                if (prepareCallIndex === 1) return Promise.resolve(pendingExpense)
                // 2: family lookup
                if (prepareCallIndex === 2) return Promise.resolve(FAMILY)
                // 4: updated expense after UPDATE
                if (prepareCallIndex === 4) {
                  return Promise.resolve({
                    ...pendingExpense,
                    status: 'resolved',
                  })
                }
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      // user-002 is the questioner who satisfies
      const res = await makeAuthRequest('/expenses/exp-001/satisfy', mockDb, 'user-002', {
        method: 'POST',
      })

      expect(res.status).toBe(200)
      const body = (await res.json()) as { success: boolean; expense: { status: string } }
      expect(body.success).toBe(true)
      expect(body.expense.status).toBe('resolved')
    })

    it('returns 403 when non-questioner tries to satisfy', async () => {
      let prepareCallIndex = 0

      const pendingExpense = {
        ...EXPENSE,
        status: 'pending_satisfaction',
        questioned_by: 'user-002',
        resolved_at: new Date().toISOString(),
      }

      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                if (prepareCallIndex === 1) return Promise.resolve(pendingExpense)
                if (prepareCallIndex === 2) return Promise.resolve(FAMILY)
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      // user-001 (creator, not questioner) tries to satisfy
      const res = await makeAuthRequest('/expenses/exp-001/satisfy', mockDb, 'user-001', {
        method: 'POST',
      })

      expect(res.status).toBe(403)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Only the original questioner can mark as satisfied')
    })

    it('returns 400 when expense is not in pending_satisfaction status', async () => {
      let prepareCallIndex = 0

      // questioned_at must be recent so applyTimeoutChecks does NOT auto-close
      const questionedExpense = {
        ...EXPENSE,
        status: 'questioned',
        questioned_by: 'user-002',
        questioned_at: new Date().toISOString(),
      }

      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                if (prepareCallIndex === 1) return Promise.resolve(questionedExpense)
                if (prepareCallIndex === 2) return Promise.resolve(FAMILY)
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      const res = await makeAuthRequest('/expenses/exp-001/satisfy', mockDb, 'user-002', {
        method: 'POST',
      })

      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string }
      expect(body.error).toContain("Cannot satisfy expense with status 'questioned'")
    })
  })
})

// ============================================================================
// Expense Actions: Edit and Delete
// ============================================================================

describe('Expense edit and delete (integration)', () => {
  describe('PATCH /expenses/:id', () => {
    it('returns 400 with no fields to update', async () => {
      let prepareCallIndex = 0

      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                if (prepareCallIndex === 1) return Promise.resolve(EXPENSE)
                if (prepareCallIndex === 2) return Promise.resolve(FAMILY)
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      const res = await makeAuthRequest('/expenses/exp-001', mockDb, 'user-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('No fields to update')
    })

    it('returns 403 when non-creator tries to edit', async () => {
      let prepareCallIndex = 0

      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                if (prepareCallIndex === 1) return Promise.resolve(EXPENSE) // created_by: user-001
                if (prepareCallIndex === 2) return Promise.resolve(FAMILY)
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      // user-002 tries to edit user-001's expense
      const res = await makeAuthRequest('/expenses/exp-001', mockDb, 'user-002', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Updated' }),
      })

      expect(res.status).toBe(403)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Only the expense creator can edit')
    })
  })

  describe('DELETE /expenses/:id', () => {
    it('returns success when creator deletes posted expense', async () => {
      let prepareCallIndex = 0

      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                if (prepareCallIndex === 1) return Promise.resolve(EXPENSE) // created_by: user-001
                if (prepareCallIndex === 2) return Promise.resolve(FAMILY)
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      const res = await makeAuthRequest('/expenses/exp-001', mockDb, 'user-001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(200)
      const body = (await res.json()) as { success: boolean; id: string }
      expect(body.success).toBe(true)
      expect(body.id).toBe('exp-001')
    })

    it('returns 403 when non-creator tries to delete', async () => {
      let prepareCallIndex = 0

      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                if (prepareCallIndex === 1) return Promise.resolve(EXPENSE) // created_by: user-001
                if (prepareCallIndex === 2) return Promise.resolve(FAMILY)
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      // user-002 tries to delete user-001's expense
      const res = await makeAuthRequest('/expenses/exp-001', mockDb, 'user-002', {
        method: 'DELETE',
      })

      expect(res.status).toBe(403)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Only the expense creator can delete')
    })

    it('returns 400 when expense is not in posted status', async () => {
      let prepareCallIndex = 0

      const questionedExpense = { ...EXPENSE, status: 'questioned' }

      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                if (prepareCallIndex === 1) return Promise.resolve(questionedExpense)
                if (prepareCallIndex === 2) return Promise.resolve(FAMILY)
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      const res = await makeAuthRequest('/expenses/exp-001', mockDb, 'user-001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string }
      expect(body.error).toContain("Cannot delete expense with status 'questioned'")
    })
  })
})
