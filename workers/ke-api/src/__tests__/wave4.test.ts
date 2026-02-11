import { describe, it, expect, vi } from 'vitest'
import { app } from '../index'

// ============================================================================
// Wave 4 Feature Tests
// ============================================================================

// Helper to make authenticated requests with a mock DB
function makeAuthRequest(
  path: string,
  mockDb: unknown,
  userId: string = 'user-001',
  options?: RequestInit
) {
  return app.request(
    path,
    {
      ...options,
      headers: {
        'X-User-Id': userId,
        ...(options?.headers || {}),
      },
    },
    {
      DB: mockDb as D1Database,
    }
  )
}

// ============================================================================
// #106: Expense child_id filter
// ============================================================================

describe('Expense child_id filter (#106)', () => {
  it('builds query with child_id LIKE filter when child_id param provided', async () => {
    // Track all SQL queries
    const queries: string[] = []
    let prepareCallIndex = 0

    const mockDb = {
      prepare: vi.fn().mockImplementation((sql: string) => {
        queries.push(sql)
        prepareCallIndex++
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockImplementation(() => {
              // First call: get family
              if (prepareCallIndex === 1) {
                return Promise.resolve({
                  id: 'fam-001',
                  parent_a_id: 'user-001',
                  parent_b_id: 'user-002',
                  parent_a_ratio: 0.5,
                })
              }
              // Second call: getFamilyTier subscription check
              if (prepareCallIndex === 2) {
                return Promise.resolve({ plan: 'pro', status: 'active' })
              }
              // Fourth call (count query result)
              if (prepareCallIndex === 4) {
                return Promise.resolve({ count: 1 })
              }
              return Promise.resolve(null)
            }),
            all: vi.fn().mockResolvedValue({
              results: [
                {
                  id: 'exp-001',
                  family_id: 'fam-001',
                  description: 'Piano lessons',
                  amount_cents: 5000,
                  status: 'posted',
                  paid_by: 'user-001',
                  created_by: 'user-001',
                  child_ids: '["child-001","child-002"]',
                  expense_date: '2026-02-01',
                  category: 'activities',
                  deleted_at: null,
                  questioned_at: null,
                  resolved_at: null,
                },
              ],
            }),
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        }
      }),
    }

    const res = await makeAuthRequest('/families/fam-001/expenses?child_id=child-001', mockDb)

    expect(res.status).toBe(200)

    // Verify the main SELECT query includes the LIKE filter
    const selectQuery = queries.find((q) => q.startsWith('SELECT * FROM expenses'))
    expect(selectQuery).toBeDefined()
    expect(selectQuery).toContain('child_ids LIKE')

    // Verify the COUNT query also includes the LIKE filter
    const countQuery = queries.find((q) => q.startsWith('SELECT COUNT'))
    expect(countQuery).toBeDefined()
    expect(countQuery).toContain('child_ids LIKE')
  })

  it('does not add child_id filter when child_id param not provided', async () => {
    const queries: string[] = []
    let prepareCallIndex = 0

    const mockDb = {
      prepare: vi.fn().mockImplementation((sql: string) => {
        queries.push(sql)
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
              if (prepareCallIndex === 4) {
                return Promise.resolve({ count: 0 })
              }
              return Promise.resolve(null)
            }),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        }
      }),
    }

    const res = await makeAuthRequest('/families/fam-001/expenses', mockDb)

    expect(res.status).toBe(200)

    // Verify the SELECT query does NOT include child_ids LIKE
    const selectQuery = queries.find((q) => q.startsWith('SELECT * FROM expenses'))
    expect(selectQuery).toBeDefined()
    expect(selectQuery).not.toContain('child_ids LIKE')
  })

  it('BR-059: expenses with multiple children appear if any match', async () => {
    // This test verifies the LIKE pattern works for multi-child expenses
    // The SQL pattern '%"child-001"%' will match '["child-001","child-002"]'
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
              if (prepareCallIndex === 4) {
                return Promise.resolve({ count: 2 })
              }
              return Promise.resolve(null)
            }),
            all: vi.fn().mockResolvedValue({
              results: [
                {
                  id: 'exp-001',
                  child_ids: '["child-001","child-002"]',
                  status: 'posted',
                  description: 'Both children',
                  amount_cents: 5000,
                  paid_by: 'user-001',
                  expense_date: '2026-02-01',
                  category: 'activities',
                },
                {
                  id: 'exp-002',
                  child_ids: '["child-001"]',
                  status: 'posted',
                  description: 'Child 1 only',
                  amount_cents: 3000,
                  paid_by: 'user-001',
                  expense_date: '2026-02-01',
                  category: 'school',
                },
              ],
            }),
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        }
      }),
    }

    const res = await makeAuthRequest('/families/fam-001/expenses?child_id=child-001', mockDb)

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      expenses: Array<{ id: string }>
      pagination: { total: number }
    }
    // Both expenses should be returned since both contain child-001
    expect(body.expenses).toHaveLength(2)
    expect(body.pagination.total).toBe(2)
  })
})

// ============================================================================
// #107: Balance Breakdown Audit Trail
// ============================================================================

describe('Balance Breakdown (#107)', () => {
  it('returns correct included/excluded split based on status', async () => {
    let prepareCallIndex = 0

    const mockDb = {
      prepare: vi.fn().mockImplementation(() => {
        prepareCallIndex++
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockImplementation(() => {
              // 1: family
              if (prepareCallIndex === 1) {
                return Promise.resolve({
                  id: 'fam-001',
                  parent_a_id: 'user-001',
                  parent_b_id: 'user-002',
                  parent_a_ratio: 0.5,
                })
              }
              // 2: parentA user
              if (prepareCallIndex === 2) {
                return Promise.resolve({ id: 'user-001', name: 'Alice', email: 'alice@test.com' })
              }
              // 3: parentB user
              if (prepareCallIndex === 3) {
                return Promise.resolve({ id: 'user-002', name: 'Bob', email: 'bob@test.com' })
              }
              return Promise.resolve(null)
            }),
            all: vi.fn().mockImplementation(() => {
              // 4: included expenses (posted, resolved, resolved_creator_decided)
              if (prepareCallIndex === 4) {
                return Promise.resolve({
                  results: [
                    {
                      id: 'exp-001',
                      description: 'Piano lessons',
                      amount_cents: 10000,
                      expense_date: '2026-02-01',
                      paid_by: 'user-001',
                      category: 'activities',
                      status: 'posted',
                    },
                  ],
                })
              }
              // 5: excluded expenses
              if (prepareCallIndex === 5) {
                return Promise.resolve({
                  results: [
                    {
                      id: 'exp-002',
                      description: 'Disputed item',
                      amount_cents: 5000,
                      expense_date: '2026-02-02',
                      paid_by: 'user-002',
                      category: 'school',
                      status: 'questioned',
                    },
                  ],
                })
              }
              // 6: payments
              if (prepareCallIndex === 6) {
                return Promise.resolve({
                  results: [
                    {
                      id: 'pay-001',
                      amount_cents: 3000,
                      payment_date: '2026-02-05',
                      paid_by: 'user-001',
                      notes: 'Venmo',
                    },
                  ],
                })
              }
              return Promise.resolve({ results: [] })
            }),
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        }
      }),
    }

    const res = await makeAuthRequest('/families/fam-001/balance/breakdown', mockDb)

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      balance: {
        total_cents: number
        direction: string
        parent_a_name: string
        parent_b_name: string
      }
      included_expenses: Array<{
        id: string
        parent_a_share_cents: number
        parent_b_share_cents: number
        net_impact_cents: number
      }>
      excluded_expenses: Array<{ id: string; exclusion_reason: string }>
      payments: Array<{ id: string; paid_by_name: string }>
    }

    // Check balance structure
    expect(body.balance.parent_a_name).toBe('Alice')
    expect(body.balance.parent_b_name).toBe('Bob')

    // Check included expenses
    expect(body.included_expenses).toHaveLength(1)
    expect(body.included_expenses[0].id).toBe('exp-001')
    // With 50/50 ratio, 10000 cents -> a_share = floor(10000 * 0.5) = 5000, b_share = 5000
    expect(body.included_expenses[0].parent_a_share_cents).toBe(5000)
    expect(body.included_expenses[0].parent_b_share_cents).toBe(5000)
    // A paid 10000 but owes 5000, so net_impact = -(10000 - 5000) = -5000 (B owes A)
    expect(body.included_expenses[0].net_impact_cents).toBe(-5000)

    // Check excluded expenses
    expect(body.excluded_expenses).toHaveLength(1)
    expect(body.excluded_expenses[0].id).toBe('exp-002')
    expect(body.excluded_expenses[0].exclusion_reason).toBe('Expense is currently questioned')

    // Check payments
    expect(body.payments).toHaveLength(1)
    expect(body.payments[0].id).toBe('pay-001')
    expect(body.payments[0].paid_by_name).toBe('Alice')
  })

  it('returns 404 for non-existent family', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
      }),
    }

    const res = await makeAuthRequest('/families/fam-nonexistent/balance/breakdown', mockDb)

    expect(res.status).toBe(404)
  })

  it('returns 403 for non-member', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({
            id: 'fam-001',
            parent_a_id: 'user-other',
            parent_b_id: 'user-another',
            parent_a_ratio: 0.5,
          }),
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
      }),
    }

    const res = await makeAuthRequest('/families/fam-001/balance/breakdown', mockDb)

    expect(res.status).toBe(403)
  })

  it('exclusion reasons match expected strings', async () => {
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
                return Promise.resolve({ id: 'user-001', name: 'Alice', email: 'alice@test.com' })
              }
              if (prepareCallIndex === 3) {
                return Promise.resolve({ id: 'user-002', name: 'Bob', email: 'bob@test.com' })
              }
              return Promise.resolve(null)
            }),
            all: vi.fn().mockImplementation(() => {
              // included: empty
              if (prepareCallIndex === 4) {
                return Promise.resolve({ results: [] })
              }
              // excluded: all statuses
              if (prepareCallIndex === 5) {
                return Promise.resolve({
                  results: [
                    { id: 'e1', description: 'Q', amount_cents: 100, status: 'questioned' },
                    {
                      id: 'e2',
                      description: 'PS',
                      amount_cents: 200,
                      status: 'pending_satisfaction',
                    },
                    { id: 'e3', description: 'RP', amount_cents: 300, status: 'resolved_personal' },
                    { id: 'e4', description: 'RD', amount_cents: 400, status: 'resolved_deleted' },
                    { id: 'e5', description: 'CU', amount_cents: 500, status: 'closed_unresolved' },
                  ],
                })
              }
              // payments: empty
              if (prepareCallIndex === 6) {
                return Promise.resolve({ results: [] })
              }
              return Promise.resolve({ results: [] })
            }),
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        }
      }),
    }

    const res = await makeAuthRequest('/families/fam-001/balance/breakdown', mockDb)

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      excluded_expenses: Array<{ id: string; exclusion_reason: string }>
    }

    expect(body.excluded_expenses).toHaveLength(5)
    expect(body.excluded_expenses[0].exclusion_reason).toBe('Expense is currently questioned')
    expect(body.excluded_expenses[1].exclusion_reason).toBe('Awaiting satisfaction')
    expect(body.excluded_expenses[2].exclusion_reason).toBe('Resolved as personal expense')
    expect(body.excluded_expenses[3].exclusion_reason).toBe('Resolved by deletion')
    expect(body.excluded_expenses[4].exclusion_reason).toBe('Closed unresolved')
  })

  it('direction is settled when balance is zero', async () => {
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
                return Promise.resolve({ id: 'user-001', name: 'Alice', email: 'alice@test.com' })
              }
              if (prepareCallIndex === 3) {
                return Promise.resolve({ id: 'user-002', name: 'Bob', email: 'bob@test.com' })
              }
              return Promise.resolve(null)
            }),
            all: vi.fn().mockImplementation(() => {
              // All empty - balance is 0
              return Promise.resolve({ results: [] })
            }),
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        }
      }),
    }

    const res = await makeAuthRequest('/families/fam-001/balance/breakdown', mockDb)

    expect(res.status).toBe(200)
    const body = (await res.json()) as { balance: { direction: string; total_cents: number } }
    expect(body.balance.direction).toBe('settled')
    expect(body.balance.total_cents).toBe(0)
  })
})

// ============================================================================
// #108: Leave Family
// ============================================================================

describe('Leave Family (#108)', () => {
  it('parent_a leaving sets parent_a_id to null', async () => {
    let prepareCallIndex = 0
    const updateQueries: string[] = []

    const mockDb = {
      prepare: vi.fn().mockImplementation((sql: string) => {
        prepareCallIndex++
        if (sql.includes('UPDATE families SET parent_a_id = NULL')) {
          updateQueries.push(sql)
        }
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockImplementation(() => {
              // 1: get family
              if (prepareCallIndex === 1) {
                return Promise.resolve({
                  id: 'fam-001',
                  parent_a_id: 'user-001',
                  parent_b_id: 'user-002',
                  parent_a_ratio: 0.5,
                })
              }
              // 3: re-fetch family (parent_a now null)
              if (prepareCallIndex === 3) {
                return Promise.resolve({
                  parent_a_id: null,
                  parent_b_id: 'user-002',
                })
              }
              // 5: get actor name for notification
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

    const res = await makeAuthRequest('/families/fam-001/leave', mockDb, 'user-001', {
      method: 'POST',
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; family_archived: boolean }
    expect(body.success).toBe(true)
    expect(body.family_archived).toBe(false)
    // Verify the UPDATE query was called to set parent_a_id to NULL
    expect(updateQueries.length).toBeGreaterThanOrEqual(1)
  })

  it('parent_b leaving sets parent_b_id to null', async () => {
    let prepareCallIndex = 0
    const updateQueries: string[] = []

    const mockDb = {
      prepare: vi.fn().mockImplementation((sql: string) => {
        prepareCallIndex++
        if (sql.includes('UPDATE families SET parent_b_id = NULL')) {
          updateQueries.push(sql)
        }
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
              if (prepareCallIndex === 3) {
                return Promise.resolve({
                  parent_a_id: 'user-001',
                  parent_b_id: null,
                })
              }
              if (prepareCallIndex === 5) {
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

    const res = await makeAuthRequest('/families/fam-001/leave', mockDb, 'user-002', {
      method: 'POST',
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; family_archived: boolean }
    expect(body.success).toBe(true)
    expect(body.family_archived).toBe(false)
    expect(updateQueries.length).toBeGreaterThanOrEqual(1)
  })

  it('both parents leaving archives the family', async () => {
    let prepareCallIndex = 0
    const allQueries: string[] = []

    const mockDb = {
      prepare: vi.fn().mockImplementation((sql: string) => {
        prepareCallIndex++
        allQueries.push(sql)
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockImplementation(() => {
              if (prepareCallIndex === 1) {
                return Promise.resolve({
                  id: 'fam-001',
                  parent_a_id: 'user-001',
                  parent_b_id: null,
                  parent_a_ratio: 0.5,
                })
              }
              // re-fetch: both parents null
              if (prepareCallIndex === 3) {
                return Promise.resolve({
                  parent_a_id: null,
                  parent_b_id: null,
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

    const res = await makeAuthRequest('/families/fam-001/leave', mockDb, 'user-001', {
      method: 'POST',
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; family_archived: boolean }
    expect(body.success).toBe(true)
    expect(body.family_archived).toBe(true)

    // Verify archived query was executed
    const archiveQuery = allQueries.find((q) => q.includes("status = 'archived'"))
    expect(archiveQuery).toBeDefined()
  })

  it('non-member cannot leave family', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({
            id: 'fam-001',
            parent_a_id: 'user-other',
            parent_b_id: 'user-another',
            parent_a_ratio: 0.5,
          }),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      }),
    }

    const res = await makeAuthRequest('/families/fam-001/leave', mockDb, 'user-001', {
      method: 'POST',
    })

    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Not a member of this family')
  })

  it('returns 404 for non-existent family', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      }),
    }

    const res = await makeAuthRequest('/families/fam-nonexistent/leave', mockDb, 'user-001', {
      method: 'POST',
    })

    expect(res.status).toBe(404)
  })

  it('logs activity event family.member_left', async () => {
    let prepareCallIndex = 0
    const allQueries: string[] = []

    const mockDb = {
      prepare: vi.fn().mockImplementation((sql: string) => {
        prepareCallIndex++
        allQueries.push(sql)
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
              if (prepareCallIndex === 3) {
                return Promise.resolve({
                  parent_a_id: null,
                  parent_b_id: 'user-002',
                })
              }
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

    const res = await makeAuthRequest('/families/fam-001/leave', mockDb, 'user-001', {
      method: 'POST',
    })

    expect(res.status).toBe(200)

    // Verify activity_events INSERT was called
    const activityInsert = allQueries.find((q) => q.includes('INSERT INTO activity_events'))
    expect(activityInsert).toBeDefined()
  })
})
