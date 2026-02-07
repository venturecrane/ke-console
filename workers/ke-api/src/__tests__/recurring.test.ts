import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateMonthlyExpenses,
  generateAllFamilyExpenses,
} from '../services/activity';

// ============================================================================
// Mock helpers
// ============================================================================

// Mock generateId to return predictable IDs
vi.mock('../utils', () => ({
  generateId: vi.fn().mockReturnValue('mock-uuid-001'),
}));

interface MockCallTracker {
  prepareIndex: number;
  calls: Array<{
    sql: string;
    boundArgs: unknown[];
    returnType: 'all' | 'first' | 'run';
    returnValue: unknown;
  }>;
}

function createRecurringMockDb(tracker: MockCallTracker) {
  const runFn = vi.fn().mockImplementation(() => {
    return Promise.resolve({ success: true });
  });

  const firstFn = vi.fn().mockImplementation(() => {
    const call = tracker.calls[tracker.prepareIndex - 1];
    return Promise.resolve(call?.returnValue ?? null);
  });

  const allFn = vi.fn().mockImplementation(() => {
    const call = tracker.calls[tracker.prepareIndex - 1];
    return Promise.resolve(call?.returnValue ?? { results: [] });
  });

  const bindFn = vi.fn().mockImplementation((...args: unknown[]) => {
    const call = tracker.calls[tracker.prepareIndex - 1];
    if (call) {
      call.boundArgs = args;
    }
    return { run: runFn, first: firstFn, all: allFn };
  });

  const prepareFn = vi.fn().mockImplementation((sql: string) => {
    const call = tracker.calls[tracker.prepareIndex];
    if (call) {
      call.sql = sql;
    }
    tracker.prepareIndex++;
    return { bind: bindFn, all: allFn, first: firstFn, run: runFn };
  });

  return {
    db: { prepare: prepareFn } as unknown as D1Database,
    prepareFn,
    bindFn,
    runFn,
    firstFn,
    allFn,
  };
}

// ============================================================================
// generateMonthlyExpenses — creates expenses from templates
// ============================================================================

describe('generateMonthlyExpenses', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-10T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates expenses from active fixed expense templates', async () => {
    const fixedExpenses = {
      results: [
        {
          id: 'fixed-001',
          family_id: 'fam-001',
          created_by: 'user-001',
          description: 'Monthly tuition',
          amount_cents: 50000,
          category: 'school',
          child_ids: '["child-001"]',
          link_url: null,
          memo: 'School payment',
          frequency: 'monthly',
          effective_from: '2025-01-01',
          effective_until: null,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
          deleted_at: null,
        },
      ],
    };

    // Track prepare calls:
    // 1. SELECT fixed_expenses (all) -> returns templates
    // 2. SELECT expenses for idempotency check (first) -> null (no existing)
    // 3. INSERT expense (run)
    // 4. INSERT activity_events (run)
    const tracker: MockCallTracker = {
      prepareIndex: 0,
      calls: [
        { sql: '', boundArgs: [], returnType: 'all', returnValue: fixedExpenses },
        { sql: '', boundArgs: [], returnType: 'first', returnValue: null },
        { sql: '', boundArgs: [], returnType: 'run', returnValue: { success: true } },
        { sql: '', boundArgs: [], returnType: 'run', returnValue: { success: true } },
      ],
    };

    const { db, prepareFn } = createRecurringMockDb(tracker);
    const generated = await generateMonthlyExpenses(db, 'fam-001');

    expect(generated.count).toBe(1);
    // First call: SELECT fixed_expenses
    expect(prepareFn.mock.calls[0][0]).toContain('fixed_expenses');
    // Second call: idempotency check
    expect(prepareFn.mock.calls[1][0]).toContain('SELECT id FROM expenses');
    // Third call: INSERT expense
    expect(prepareFn.mock.calls[2][0]).toContain('INSERT INTO expenses');
    // Fourth call: INSERT activity event
    expect(prepareFn.mock.calls[3][0]).toContain('INSERT INTO activity_events');
  });

  it('skips templates that already have expenses for this month (idempotency)', async () => {
    const fixedExpenses = {
      results: [
        {
          id: 'fixed-001',
          family_id: 'fam-001',
          created_by: 'user-001',
          description: 'Monthly tuition',
          amount_cents: 50000,
          category: 'school',
          child_ids: null,
          link_url: null,
          memo: null,
          frequency: 'monthly',
          effective_from: '2025-01-01',
          effective_until: null,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
          deleted_at: null,
        },
      ],
    };

    // Track prepare calls:
    // 1. SELECT fixed_expenses (all) -> returns templates
    // 2. SELECT expenses for idempotency check (first) -> FOUND (already exists)
    const tracker: MockCallTracker = {
      prepareIndex: 0,
      calls: [
        { sql: '', boundArgs: [], returnType: 'all', returnValue: fixedExpenses },
        { sql: '', boundArgs: [], returnType: 'first', returnValue: { id: 'existing-exp-001' } },
      ],
    };

    const { db, prepareFn } = createRecurringMockDb(tracker);
    const generated = await generateMonthlyExpenses(db, 'fam-001');

    expect(generated.count).toBe(0);
    // Only 2 prepare calls: SELECT fixed_expenses + idempotency check
    // No INSERT calls
    expect(prepareFn).toHaveBeenCalledTimes(2);
  });

  it('running twice in same month does not create duplicates', async () => {
    const fixedExpenses = {
      results: [
        {
          id: 'fixed-001',
          family_id: 'fam-001',
          created_by: 'user-001',
          description: 'Monthly tuition',
          amount_cents: 50000,
          category: 'school',
          child_ids: null,
          link_url: null,
          memo: null,
          frequency: 'monthly',
          effective_from: '2025-01-01',
          effective_until: null,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
          deleted_at: null,
        },
      ],
    };

    // First run: no existing expense
    const tracker1: MockCallTracker = {
      prepareIndex: 0,
      calls: [
        { sql: '', boundArgs: [], returnType: 'all', returnValue: fixedExpenses },
        { sql: '', boundArgs: [], returnType: 'first', returnValue: null },
        { sql: '', boundArgs: [], returnType: 'run', returnValue: { success: true } },
        { sql: '', boundArgs: [], returnType: 'run', returnValue: { success: true } },
      ],
    };

    const { db: db1 } = createRecurringMockDb(tracker1);
    const firstRun = await generateMonthlyExpenses(db1, 'fam-001');
    expect(firstRun.count).toBe(1);

    // Second run: existing expense found (simulating the one just created)
    const tracker2: MockCallTracker = {
      prepareIndex: 0,
      calls: [
        { sql: '', boundArgs: [], returnType: 'all', returnValue: fixedExpenses },
        { sql: '', boundArgs: [], returnType: 'first', returnValue: { id: 'mock-uuid-001' } },
      ],
    };

    const { db: db2 } = createRecurringMockDb(tracker2);
    const secondRun = await generateMonthlyExpenses(db2, 'fam-001');
    expect(secondRun.count).toBe(0);
  });

  it('handles multiple templates, skipping ones with existing expenses', async () => {
    const fixedExpenses = {
      results: [
        {
          id: 'fixed-001',
          family_id: 'fam-001',
          created_by: 'user-001',
          description: 'Tuition',
          amount_cents: 50000,
          category: 'school',
          child_ids: null,
          link_url: null,
          memo: null,
          frequency: 'monthly',
          effective_from: '2025-01-01',
          effective_until: null,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
          deleted_at: null,
        },
        {
          id: 'fixed-002',
          family_id: 'fam-001',
          created_by: 'user-001',
          description: 'Soccer',
          amount_cents: 15000,
          category: 'activities',
          child_ids: null,
          link_url: null,
          memo: null,
          frequency: 'monthly',
          effective_from: '2025-06-01',
          effective_until: null,
          created_at: '2025-06-01T00:00:00.000Z',
          updated_at: '2025-06-01T00:00:00.000Z',
          deleted_at: null,
        },
      ],
    };

    // Template 1: already has an expense -> skip
    // Template 2: no expense yet -> create
    const tracker: MockCallTracker = {
      prepareIndex: 0,
      calls: [
        { sql: '', boundArgs: [], returnType: 'all', returnValue: fixedExpenses },
        // Idempotency check for fixed-001: exists
        { sql: '', boundArgs: [], returnType: 'first', returnValue: { id: 'existing-001' } },
        // Idempotency check for fixed-002: not exists
        { sql: '', boundArgs: [], returnType: 'first', returnValue: null },
        // INSERT expense for fixed-002
        { sql: '', boundArgs: [], returnType: 'run', returnValue: { success: true } },
        // INSERT activity for fixed-002
        { sql: '', boundArgs: [], returnType: 'run', returnValue: { success: true } },
      ],
    };

    const { db } = createRecurringMockDb(tracker);
    const generated = await generateMonthlyExpenses(db, 'fam-001');

    expect(generated.count).toBe(1);
  });

  it('returns 0 when family has no active fixed expense templates', async () => {
    const tracker: MockCallTracker = {
      prepareIndex: 0,
      calls: [
        { sql: '', boundArgs: [], returnType: 'all', returnValue: { results: [] } },
      ],
    };

    const { db } = createRecurringMockDb(tracker);
    const generated = await generateMonthlyExpenses(db, 'fam-001');

    expect(generated.count).toBe(0);
  });
});

// ============================================================================
// generateAllFamilyExpenses — iterates all families with templates
// ============================================================================

describe('generateAllFamilyExpenses', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-10T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('iterates all families with active templates', async () => {
    const families = {
      results: [
        { id: 'fam-001' },
        { id: 'fam-002' },
      ],
    };

    // For each family, generateMonthlyExpenses will:
    // 1. SELECT fixed_expenses (all) -> empty results (simplify)
    // So total calls: 1 (families query) + 1 per family (fixed_expenses query) = 3
    const tracker: MockCallTracker = {
      prepareIndex: 0,
      calls: [
        // Query for families with active templates
        { sql: '', boundArgs: [], returnType: 'all', returnValue: families },
        // Family 1: fixed_expenses query -> no templates
        { sql: '', boundArgs: [], returnType: 'all', returnValue: { results: [] } },
        // Family 2: fixed_expenses query -> no templates
        { sql: '', boundArgs: [], returnType: 'all', returnValue: { results: [] } },
      ],
    };

    const { db } = createRecurringMockDb(tracker);
    const result = await generateAllFamilyExpenses(db);

    expect(result.familiesProcessed).toBe(2);
    expect(result.totalGenerated).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('isolated failure: one family failing does not block others', async () => {
    const families = {
      results: [
        { id: 'fam-fail' },
        { id: 'fam-ok' },
      ],
    };

    // We need a more specialized mock for this test.
    // Family 1 will throw, family 2 will succeed.
    let callIndex = 0;

    const allFn = vi.fn().mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // First call: return families list
        return Promise.resolve(families);
      }
      if (callIndex === 2) {
        // Second call: family fam-fail's fixed_expenses query -> throw
        throw new Error('D1 connection error for fam-fail');
      }
      if (callIndex === 3) {
        // Third call: family fam-ok's fixed_expenses query -> empty (success)
        return Promise.resolve({ results: [] });
      }
      return Promise.resolve({ results: [] });
    });

    const bindFn = vi.fn().mockReturnValue({
      all: allFn,
      first: vi.fn().mockResolvedValue(null),
      run: vi.fn().mockResolvedValue({ success: true }),
    });

    const prepareFn = vi.fn().mockReturnValue({
      bind: bindFn,
      all: allFn,
      first: vi.fn().mockResolvedValue(null),
      run: vi.fn().mockResolvedValue({ success: true }),
    });
    const db = { prepare: prepareFn } as unknown as D1Database;

    const result = await generateAllFamilyExpenses(db);

    // fam-fail should have errored, fam-ok should have succeeded
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('fam-fail');
    expect(result.familiesProcessed).toBe(1); // Only fam-ok was successful
  });

  it('returns zero totals when no families have templates', async () => {
    const tracker: MockCallTracker = {
      prepareIndex: 0,
      calls: [
        { sql: '', boundArgs: [], returnType: 'all', returnValue: { results: [] } },
      ],
    };

    const { db } = createRecurringMockDb(tracker);
    const result = await generateAllFamilyExpenses(db);

    expect(result.familiesProcessed).toBe(0);
    expect(result.totalGenerated).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('accumulates totalGenerated across families', async () => {
    const families = {
      results: [
        { id: 'fam-001' },
        { id: 'fam-002' },
      ],
    };

    const fixedExpenseFam1 = {
      results: [
        {
          id: 'fixed-001',
          family_id: 'fam-001',
          created_by: 'user-001',
          description: 'Tuition',
          amount_cents: 50000,
          category: 'school',
          child_ids: null,
          link_url: null,
          memo: null,
          frequency: 'monthly',
          effective_from: '2025-01-01',
          effective_until: null,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
          deleted_at: null,
        },
      ],
    };

    const fixedExpenseFam2 = {
      results: [
        {
          id: 'fixed-002',
          family_id: 'fam-002',
          created_by: 'user-002',
          description: 'Daycare',
          amount_cents: 80000,
          category: 'childcare',
          child_ids: null,
          link_url: null,
          memo: null,
          frequency: 'monthly',
          effective_from: '2025-03-01',
          effective_until: null,
          created_at: '2025-03-01T00:00:00.000Z',
          updated_at: '2025-03-01T00:00:00.000Z',
          deleted_at: null,
        },
      ],
    };

    // Calls:
    // 1. SELECT families (all)
    // -- Family 1 --
    // 2. SELECT fixed_expenses for fam-001 (all)
    // 3. Idempotency check for fixed-001 (first) -> null
    // 4. INSERT expense (run)
    // 5. INSERT activity (run)
    // -- Family 2 --
    // 6. SELECT fixed_expenses for fam-002 (all)
    // 7. Idempotency check for fixed-002 (first) -> null
    // 8. INSERT expense (run)
    // 9. INSERT activity (run)
    const tracker: MockCallTracker = {
      prepareIndex: 0,
      calls: [
        { sql: '', boundArgs: [], returnType: 'all', returnValue: families },
        { sql: '', boundArgs: [], returnType: 'all', returnValue: fixedExpenseFam1 },
        { sql: '', boundArgs: [], returnType: 'first', returnValue: null },
        { sql: '', boundArgs: [], returnType: 'run', returnValue: { success: true } },
        { sql: '', boundArgs: [], returnType: 'run', returnValue: { success: true } },
        { sql: '', boundArgs: [], returnType: 'all', returnValue: fixedExpenseFam2 },
        { sql: '', boundArgs: [], returnType: 'first', returnValue: null },
        { sql: '', boundArgs: [], returnType: 'run', returnValue: { success: true } },
        { sql: '', boundArgs: [], returnType: 'run', returnValue: { success: true } },
      ],
    };

    const { db } = createRecurringMockDb(tracker);
    const result = await generateAllFamilyExpenses(db);

    expect(result.familiesProcessed).toBe(2);
    expect(result.totalGenerated).toBe(2);
    expect(result.errors).toHaveLength(0);
  });
});
