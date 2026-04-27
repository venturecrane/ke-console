import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { centsToDollars } from '../calculations'
import { app } from '../index'
import { _resetJWKSCache } from '../middleware/auth'
import { generateRSAKeyPair, createSignedJWT, createJWKSResponse, type RSAKeySet } from './helpers/jwt'

// ============================================================================
// CSV Export Tests
// ============================================================================

const CLERK_DOMAIN = 'test.clerk.accounts.dev'

let keySet: RSAKeySet
const tokenCache = new Map<string, string>()

beforeAll(async () => {
  keySet = await generateRSAKeyPair('export-key-1')
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
    'export-key-1'
  )
  tokenCache.set(userId, token)
  return token
}

// Helper to make authenticated requests
async function makeRequest(path: string, options?: RequestInit) {
  const token = await getToken('user-001')
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
      DB: {} as D1Database, // stub
      CLERK_DOMAIN,
    }
  )
}

/** Make an authenticated request with a custom mock DB. */
async function makeAuthRequestWithDb(
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

describe('CSV Export', () => {
  describe('CSV header format', () => {
    it('GET /families/:id/expenses/export/csv requires auth', async () => {
      const res = await app.request(
        '/families/fam-001/expenses/export/csv',
        {},
        {
          DB: {} as D1Database,
          CLERK_DOMAIN,
        }
      )
      expect(res.status).toBe(401)
    })

    it('GET /families/:id/payments/export/csv requires auth', async () => {
      const res = await app.request(
        '/families/fam-001/payments/export/csv',
        {},
        {
          DB: {} as D1Database,
          CLERK_DOMAIN,
        }
      )
      expect(res.status).toBe(401)
    })

    it('expense export route is reachable with auth', async () => {
      const res = await makeRequest('/families/fam-001/expenses/export/csv')
      // Will fail at DB access, but should not return 401 or 404
      expect(res.status).not.toBe(401)
      expect(res.status).not.toBe(404)
    })

    it('payment export route is reachable with auth', async () => {
      const res = await makeRequest('/families/fam-001/payments/export/csv')
      // Will fail at DB access, but should not return 401 or 404
      expect(res.status).not.toBe(401)
      expect(res.status).not.toBe(404)
    })
  })

  describe('Cents-to-dollars conversion in CSV output', () => {
    it('converts 5000 cents to 50.00', () => {
      expect(centsToDollars(5000).toFixed(2)).toBe('50.00')
    })

    it('converts 12345 cents to 123.45', () => {
      expect(centsToDollars(12345).toFixed(2)).toBe('123.45')
    })

    it('converts 1 cent to 0.01', () => {
      expect(centsToDollars(1).toFixed(2)).toBe('0.01')
    })

    it('converts 0 cents to 0.00', () => {
      expect(centsToDollars(0).toFixed(2)).toBe('0.00')
    })

    it('converts 99999 cents to 999.99', () => {
      expect(centsToDollars(99999).toFixed(2)).toBe('999.99')
    })
  })

  describe('Free tier rejection', () => {
    it('returns 403 for free tier expense export', async () => {
      // Mock DB that returns family, no subscription (free tier)
      let prepareCallIndex = 0
      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                if (prepareCallIndex === 1) {
                  // First call: get family
                  return Promise.resolve({
                    id: 'fam-001',
                    parent_a_id: 'user-001',
                    parent_b_id: 'user-002',
                    parent_a_ratio: 0.5,
                  })
                }
                if (prepareCallIndex === 2) {
                  // Second call: check subscription (getFamilyTier)
                  return Promise.resolve(null) // no subscription = free tier
                }
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      const res = await makeAuthRequestWithDb('/families/fam-001/expenses/export/csv', mockDb)

      expect(res.status).toBe(403)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Pro tier required for CSV export')
    })

    it('returns 403 for free tier payment export', async () => {
      let prepareCallIndex = 0
      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                if (prepareCallIndex === 1) {
                  return Promise.resolve({
                    id: 'fam-001',
                    parent_a_id: 'user-001',
                    parent_b_id: 'user-002',
                    parent_a_ratio: 0.5,
                  })
                }
                if (prepareCallIndex === 2) {
                  return Promise.resolve(null) // free tier
                }
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      const res = await makeAuthRequestWithDb('/families/fam-001/payments/export/csv', mockDb)

      expect(res.status).toBe(403)
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Pro tier required for CSV export')
    })

    it('allows Pro tier expense export', async () => {
      let prepareCallIndex = 0
      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                if (prepareCallIndex === 1) {
                  return Promise.resolve({
                    id: 'fam-001',
                    parent_a_id: 'user-001',
                    parent_b_id: 'user-002',
                    parent_a_ratio: 0.5,
                  })
                }
                if (prepareCallIndex === 2) {
                  // Pro subscription exists
                  return Promise.resolve({ plan: 'pro', status: 'active' })
                }
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({
                results: [
                  {
                    id: 'exp-001',
                    description: 'Test Expense',
                    amount_cents: 5000,
                    category: 'school',
                    expense_date: '2026-02-01',
                    status: 'posted',
                    paid_by: 'user-001',
                    created_by: 'user-001',
                    payer_name: 'Alice',
                    payer_email: 'alice@test.com',
                    creator_name: 'Alice',
                    creator_email: 'alice@test.com',
                  },
                ],
              }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      const res = await makeAuthRequestWithDb('/families/fam-001/expenses/export/csv', mockDb)

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('text/csv')
      expect(res.headers.get('Content-Disposition')).toContain('attachment')

      const csv = await res.text()
      // Check CSV header
      expect(csv).toContain('Date,Description,Amount,Category,Paid By,Status,Created By')
      // Check data row with cents-to-dollars conversion
      expect(csv).toContain('50.00')
      expect(csv).toContain('Test Expense')
    })

    it('allows Pro tier payment export', async () => {
      let prepareCallIndex = 0
      const mockDb = {
        prepare: vi.fn().mockImplementation(() => {
          prepareCallIndex++
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockImplementation(() => {
                if (prepareCallIndex === 1) {
                  return Promise.resolve({
                    id: 'fam-001',
                    parent_a_id: 'user-001',
                    parent_b_id: 'user-002',
                    parent_a_ratio: 0.5,
                  })
                }
                if (prepareCallIndex === 2) {
                  return Promise.resolve({ plan: 'pro', status: 'active' })
                }
                return Promise.resolve(null)
              }),
              all: vi.fn().mockResolvedValue({
                results: [
                  {
                    id: 'pay-001',
                    payment_date: '2026-02-01',
                    amount_cents: 10000,
                    paid_by: 'user-001',
                    payer_name: 'Alice',
                    payer_email: 'alice@test.com',
                    notes: 'Venmo transfer',
                  },
                ],
              }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          }
        }),
      }

      const res = await makeAuthRequestWithDb('/families/fam-001/payments/export/csv', mockDb)

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('text/csv')

      const csv = await res.text()
      expect(csv).toContain('Date,Amount,Paid By,Method,Notes')
      expect(csv).toContain('100.00')
      expect(csv).toContain('Venmo transfer')
    })
  })
})
