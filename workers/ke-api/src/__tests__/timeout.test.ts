import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkAndApplyTimeout,
  checkAndApply30DayClosure,
  applyTimeoutChecks,
} from '../services/activity';
import type { Expense } from '../types';

// ============================================================================
// Mock D1Database helpers
// ============================================================================

function createMockDb() {
  const runFn = vi.fn().mockResolvedValue({ success: true });
  const bindFn = vi.fn().mockReturnValue({ run: runFn });
  const prepareFn = vi.fn().mockReturnValue({ bind: bindFn });

  return {
    db: { prepare: prepareFn } as unknown as D1Database,
    prepareFn,
    bindFn,
    runFn,
  };
}

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp-001',
    family_id: 'fam-001',
    created_by: 'user-001',
    paid_by: 'user-001',
    fixed_expense_id: null,
    description: 'Test expense',
    amount_cents: 5000,
    category: 'school',
    expense_date: '2026-01-15',
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
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-01-15T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

// ============================================================================
// checkAndApplyTimeout — 7-day timeout on pending_satisfaction expenses
// ============================================================================

describe('checkAndApplyTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('transitions to resolved_creator_decided at exactly 7 days', async () => {
    const resolvedAt = '2026-01-20T12:00:00.000Z';
    // Set "now" to exactly 7 days after resolved_at
    vi.setSystemTime(new Date('2026-01-27T12:00:00.000Z'));

    const expense = makeExpense({
      status: 'pending_satisfaction',
      resolved_at: resolvedAt,
    });

    const { db, prepareFn, bindFn, runFn } = createMockDb();
    const result = await checkAndApplyTimeout(db, expense);

    expect(result.status).toBe('resolved_creator_decided');
    // Should have called prepare twice: once for UPDATE, once for INSERT activity
    expect(prepareFn).toHaveBeenCalledTimes(2);
    // First call is the UPDATE statement
    expect(prepareFn.mock.calls[0][0]).toContain('UPDATE expenses SET status');
    expect(bindFn).toHaveBeenCalled();
    expect(runFn).toHaveBeenCalled();
  });

  it('transitions after more than 7 days', async () => {
    const resolvedAt = '2026-01-20T12:00:00.000Z';
    // Set "now" to 10 days after resolved_at
    vi.setSystemTime(new Date('2026-01-30T12:00:00.000Z'));

    const expense = makeExpense({
      status: 'pending_satisfaction',
      resolved_at: resolvedAt,
    });

    const { db } = createMockDb();
    const result = await checkAndApplyTimeout(db, expense);

    expect(result.status).toBe('resolved_creator_decided');
  });

  it('does NOT transition at 6 days', async () => {
    const resolvedAt = '2026-01-20T12:00:00.000Z';
    // Set "now" to 6 days after resolved_at
    vi.setSystemTime(new Date('2026-01-26T12:00:00.000Z'));

    const expense = makeExpense({
      status: 'pending_satisfaction',
      resolved_at: resolvedAt,
    });

    const { db, prepareFn } = createMockDb();
    const result = await checkAndApplyTimeout(db, expense);

    expect(result.status).toBe('pending_satisfaction');
    // Should NOT have called prepare at all (no DB writes)
    expect(prepareFn).not.toHaveBeenCalled();
  });

  it('creates an activity event on timeout', async () => {
    const resolvedAt = '2026-01-20T12:00:00.000Z';
    vi.setSystemTime(new Date('2026-01-27T12:00:00.000Z'));

    const expense = makeExpense({
      status: 'pending_satisfaction',
      resolved_at: resolvedAt,
    });

    const { db, prepareFn } = createMockDb();
    await checkAndApplyTimeout(db, expense);

    // Second prepare call should be the INSERT for activity_events
    expect(prepareFn).toHaveBeenCalledTimes(2);
    expect(prepareFn.mock.calls[1][0]).toContain('INSERT INTO activity_events');
  });

  it('returns non-pending_satisfaction expense unchanged', async () => {
    vi.setSystemTime(new Date('2026-01-27T12:00:00.000Z'));

    const expense = makeExpense({
      status: 'posted',
      resolved_at: null,
    });

    const { db, prepareFn } = createMockDb();
    const result = await checkAndApplyTimeout(db, expense);

    expect(result.status).toBe('posted');
    expect(result).toBe(expense); // Same object reference — no modification
    expect(prepareFn).not.toHaveBeenCalled();
  });

  it('returns questioned expense unchanged (not pending_satisfaction)', async () => {
    vi.setSystemTime(new Date('2026-01-27T12:00:00.000Z'));

    const expense = makeExpense({
      status: 'questioned',
      questioned_at: '2026-01-10T12:00:00.000Z',
    });

    const { db, prepareFn } = createMockDb();
    const result = await checkAndApplyTimeout(db, expense);

    expect(result.status).toBe('questioned');
    expect(prepareFn).not.toHaveBeenCalled();
  });
});

// ============================================================================
// checkAndApply30DayClosure — 30-day closure on questioned expenses
// ============================================================================

describe('checkAndApply30DayClosure', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('transitions questioned to closed_unresolved at exactly 30 days', async () => {
    const questionedAt = '2026-01-01T12:00:00.000Z';
    // Set "now" to exactly 30 days after questioned_at
    vi.setSystemTime(new Date('2026-01-31T12:00:00.000Z'));

    const expense = makeExpense({
      status: 'questioned',
      questioned_at: questionedAt,
    });

    const { db, prepareFn } = createMockDb();
    const result = await checkAndApply30DayClosure(db, expense);

    expect(result.status).toBe('closed_unresolved');
    expect(result.closed_unresolved_by).toBe('system');
    expect(result.closed_unresolved_at).toBeDefined();
    // Should have called prepare: once for UPDATE, once for INSERT activity
    expect(prepareFn).toHaveBeenCalledTimes(2);
    expect(prepareFn.mock.calls[0][0]).toContain('UPDATE expenses SET');
    expect(prepareFn.mock.calls[0][0]).toContain('closed_unresolved');
  });

  it('transitions after more than 30 days', async () => {
    const questionedAt = '2026-01-01T12:00:00.000Z';
    // Set "now" to 45 days after questioned_at
    vi.setSystemTime(new Date('2026-02-15T12:00:00.000Z'));

    const expense = makeExpense({
      status: 'questioned',
      questioned_at: questionedAt,
    });

    const { db } = createMockDb();
    const result = await checkAndApply30DayClosure(db, expense);

    expect(result.status).toBe('closed_unresolved');
  });

  it('does NOT transition at 29 days', async () => {
    const questionedAt = '2026-01-01T12:00:00.000Z';
    // Set "now" to 29 days after questioned_at
    vi.setSystemTime(new Date('2026-01-30T12:00:00.000Z'));

    const expense = makeExpense({
      status: 'questioned',
      questioned_at: questionedAt,
    });

    const { db, prepareFn } = createMockDb();
    const result = await checkAndApply30DayClosure(db, expense);

    expect(result.status).toBe('questioned');
    expect(prepareFn).not.toHaveBeenCalled();
  });

  it('creates an activity event on 30-day closure', async () => {
    const questionedAt = '2026-01-01T12:00:00.000Z';
    vi.setSystemTime(new Date('2026-01-31T12:00:00.000Z'));

    const expense = makeExpense({
      status: 'questioned',
      questioned_at: questionedAt,
    });

    const { db, prepareFn } = createMockDb();
    await checkAndApply30DayClosure(db, expense);

    // Second prepare call should be the INSERT for activity_events
    expect(prepareFn).toHaveBeenCalledTimes(2);
    expect(prepareFn.mock.calls[1][0]).toContain('INSERT INTO activity_events');
  });

  it('returns non-questioned expense unchanged', async () => {
    vi.setSystemTime(new Date('2026-02-15T12:00:00.000Z'));

    const expense = makeExpense({
      status: 'posted',
    });

    const { db, prepareFn } = createMockDb();
    const result = await checkAndApply30DayClosure(db, expense);

    expect(result.status).toBe('posted');
    expect(result).toBe(expense);
    expect(prepareFn).not.toHaveBeenCalled();
  });

  it('returns pending_satisfaction expense unchanged (not questioned)', async () => {
    vi.setSystemTime(new Date('2026-02-15T12:00:00.000Z'));

    const expense = makeExpense({
      status: 'pending_satisfaction',
      resolved_at: '2026-01-01T12:00:00.000Z',
    });

    const { db, prepareFn } = createMockDb();
    const result = await checkAndApply30DayClosure(db, expense);

    expect(result.status).toBe('pending_satisfaction');
    expect(prepareFn).not.toHaveBeenCalled();
  });
});

// ============================================================================
// applyTimeoutChecks — applies both checks
// ============================================================================

describe('applyTimeoutChecks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('applies 7-day timeout for pending_satisfaction', async () => {
    const resolvedAt = '2026-01-10T12:00:00.000Z';
    vi.setSystemTime(new Date('2026-01-17T12:00:00.000Z'));

    const expense = makeExpense({
      status: 'pending_satisfaction',
      resolved_at: resolvedAt,
    });

    const { db } = createMockDb();
    const result = await applyTimeoutChecks(db, expense);

    expect(result.status).toBe('resolved_creator_decided');
  });

  it('applies 30-day closure for questioned expenses', async () => {
    const questionedAt = '2025-12-15T12:00:00.000Z';
    vi.setSystemTime(new Date('2026-01-14T12:00:00.000Z'));

    const expense = makeExpense({
      status: 'questioned',
      questioned_at: questionedAt,
    });

    const { db } = createMockDb();
    const result = await applyTimeoutChecks(db, expense);

    expect(result.status).toBe('closed_unresolved');
  });

  it('returns posted expense untouched by either check', async () => {
    vi.setSystemTime(new Date('2026-02-01T12:00:00.000Z'));

    const expense = makeExpense({ status: 'posted' });

    const { db, prepareFn } = createMockDb();
    const result = await applyTimeoutChecks(db, expense);

    expect(result.status).toBe('posted');
    expect(prepareFn).not.toHaveBeenCalled();
  });
});
