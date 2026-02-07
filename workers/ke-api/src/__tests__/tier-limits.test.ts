import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getFamilyTier,
  getHistoryCutoffDate,
  checkFixedExpenseLimit,
} from '../services/activity';

// ============================================================================
// getHistoryCutoffDate — pure function, returns YYYY-MM-DD
// ============================================================================

describe('getHistoryCutoffDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns correct date 3 months ago', () => {
    vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
    const result = getHistoryCutoffDate(3);
    expect(result).toBe('2026-03-15');
  });

  it('returns correct date 1 month ago', () => {
    vi.setSystemTime(new Date('2026-03-20T12:00:00.000Z'));
    const result = getHistoryCutoffDate(1);
    expect(result).toBe('2026-02-20');
  });

  it('handles year boundary (January minus 3 months = October of prior year)', () => {
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
    const result = getHistoryCutoffDate(3);
    expect(result).toBe('2025-10-15');
  });

  it('returns today for 0 months', () => {
    vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
    const result = getHistoryCutoffDate(0);
    expect(result).toBe('2026-06-15');
  });

  it('returns correct format YYYY-MM-DD', () => {
    vi.setSystemTime(new Date('2026-07-04T12:00:00.000Z'));
    const result = getHistoryCutoffDate(6);
    // 6 months before July = January
    expect(result).toBe('2026-01-04');
    // Verify format with regex
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ============================================================================
// getFamilyTier — returns plan and historyMonths
// ============================================================================

describe('getFamilyTier', () => {
  it('returns free tier when no subscription exists', async () => {
    const firstFn = vi.fn().mockResolvedValue(null);
    const bindFn = vi.fn().mockReturnValue({ first: firstFn });
    const prepareFn = vi.fn().mockReturnValue({ bind: bindFn });
    const db = { prepare: prepareFn } as unknown as D1Database;

    const result = await getFamilyTier(db, 'fam-001');

    expect(result.plan).toBe('free');
    expect(result.historyMonths).toBe(3);
    expect(prepareFn).toHaveBeenCalledTimes(1);
    expect(bindFn).toHaveBeenCalledWith('fam-001');
  });

  it('returns pro tier when active pro subscription exists', async () => {
    const firstFn = vi.fn().mockResolvedValue({ plan: 'pro', status: 'active' });
    const bindFn = vi.fn().mockReturnValue({ first: firstFn });
    const prepareFn = vi.fn().mockReturnValue({ bind: bindFn });
    const db = { prepare: prepareFn } as unknown as D1Database;

    const result = await getFamilyTier(db, 'fam-002');

    expect(result.plan).toBe('pro');
    expect(result.historyMonths).toBe(-1); // -1 means unlimited
    expect(prepareFn).toHaveBeenCalledTimes(1);
    expect(bindFn).toHaveBeenCalledWith('fam-002');
  });

  it('free tier has 3 month history limit', async () => {
    const firstFn = vi.fn().mockResolvedValue(null);
    const bindFn = vi.fn().mockReturnValue({ first: firstFn });
    const prepareFn = vi.fn().mockReturnValue({ bind: bindFn });
    const db = { prepare: prepareFn } as unknown as D1Database;

    const result = await getFamilyTier(db, 'fam-free');

    expect(result.historyMonths).toBe(3);
  });

  it('pro tier has unlimited history', async () => {
    const firstFn = vi.fn().mockResolvedValue({ plan: 'pro', status: 'active' });
    const bindFn = vi.fn().mockReturnValue({ first: firstFn });
    const prepareFn = vi.fn().mockReturnValue({ bind: bindFn });
    const db = { prepare: prepareFn } as unknown as D1Database;

    const result = await getFamilyTier(db, 'fam-pro');

    expect(result.historyMonths).toBe(-1);
  });
});

// ============================================================================
// checkFixedExpenseLimit — free tier: max 2, pro tier: unlimited
// ============================================================================

describe('checkFixedExpenseLimit', () => {
  function createMockDbForLimit(
    subscriptionResult: unknown | null,
    countResult: { count: number }
  ) {
    // We need two separate prepare calls:
    // 1. SELECT subscriptions (returns .first())
    // 2. SELECT COUNT fixed_expenses (returns .first())
    const firstSub = vi.fn().mockResolvedValue(subscriptionResult);
    const bindSub = vi.fn().mockReturnValue({ first: firstSub });

    const firstCount = vi.fn().mockResolvedValue(countResult);
    const bindCount = vi.fn().mockReturnValue({ first: firstCount });

    const prepareFn = vi.fn()
      .mockReturnValueOnce({ bind: bindSub })   // first call: subscription check
      .mockReturnValueOnce({ bind: bindCount }); // second call: count check

    return {
      db: { prepare: prepareFn } as unknown as D1Database,
      prepareFn,
    };
  }

  it('allows when free tier and 0 of 2 fixed expenses', async () => {
    const { db } = createMockDbForLimit(null, { count: 0 });

    const result = await checkFixedExpenseLimit(db, 'fam-001');

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(0);
    expect(result.limit).toBe(2);
  });

  it('allows when free tier and 1 of 2 fixed expenses', async () => {
    const { db } = createMockDbForLimit(null, { count: 1 });

    const result = await checkFixedExpenseLimit(db, 'fam-001');

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(1);
    expect(result.limit).toBe(2);
  });

  it('blocks when free tier at limit (2 of 2)', async () => {
    const { db } = createMockDbForLimit(null, { count: 2 });

    const result = await checkFixedExpenseLimit(db, 'fam-001');

    expect(result.allowed).toBe(false);
    expect(result.current).toBe(2);
    expect(result.limit).toBe(2);
  });

  it('blocks when free tier over limit (3 of 2)', async () => {
    const { db } = createMockDbForLimit(null, { count: 3 });

    const result = await checkFixedExpenseLimit(db, 'fam-001');

    expect(result.allowed).toBe(false);
    expect(result.current).toBe(3);
    expect(result.limit).toBe(2);
  });

  it('allows unlimited for pro tier (high count still allowed)', async () => {
    const { db } = createMockDbForLimit(
      { plan: 'pro', status: 'active' },
      { count: 50 }
    );

    const result = await checkFixedExpenseLimit(db, 'fam-pro');

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(50);
    expect(result.limit).toBe(-1); // -1 means unlimited
  });

  it('allows pro tier with 0 fixed expenses', async () => {
    const { db } = createMockDbForLimit(
      { plan: 'pro', status: 'active' },
      { count: 0 }
    );

    const result = await checkFixedExpenseLimit(db, 'fam-pro');

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(0);
    expect(result.limit).toBe(-1);
  });

  it('queries correct tables', async () => {
    const { db, prepareFn } = createMockDbForLimit(null, { count: 0 });

    await checkFixedExpenseLimit(db, 'fam-001');

    // First query should check subscriptions
    expect(prepareFn.mock.calls[0][0]).toContain('subscriptions');
    // Second query should check fixed_expenses count
    expect(prepareFn.mock.calls[1][0]).toContain('fixed_expenses');
  });
});
