import { generateId } from '../utils'
import type { Expense, FixedExpense } from '../types'

// Generated expense detail (for email notifications)
export interface GeneratedExpenseDetail {
  family_id: string
  description: string
  amount_cents: number
}

// Create activity event
export async function createActivityEvent(
  db: D1Database,
  familyId: string,
  userId: string,
  eventType: string,
  targetType: string,
  targetId: string,
  beforeSnapshot: unknown | null,
  afterSnapshot: unknown | null,
  metadata?: unknown
): Promise<void> {
  const id = generateId()
  await db
    .prepare(
      `INSERT INTO activity_events (id, family_id, user_id, event_type, target_type, target_id, before_snapshot, after_snapshot, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(
      id,
      familyId,
      userId,
      eventType,
      targetType,
      targetId,
      beforeSnapshot ? JSON.stringify(beforeSnapshot) : null,
      afterSnapshot ? JSON.stringify(afterSnapshot) : null,
      metadata ? JSON.stringify(metadata) : null
    )
    .run()
}

// Check 7-day timeout and auto-resolve
export async function checkAndApplyTimeout(db: D1Database, expense: Expense): Promise<Expense> {
  if (expense.status !== 'pending_satisfaction') return expense

  const resolvedAt = new Date(expense.resolved_at!)
  const now = new Date()
  const daysDiff = (now.getTime() - resolvedAt.getTime()) / (1000 * 60 * 60 * 24)

  if (daysDiff >= 7) {
    await db
      .prepare(
        `UPDATE expenses SET status = 'resolved_creator_decided', updated_at = datetime('now') WHERE id = ?`
      )
      .bind(expense.id)
      .run()

    const updatedExpense = { ...expense, status: 'resolved_creator_decided' }

    // Log system timeout activity event
    await createActivityEvent(
      db,
      expense.family_id,
      'system',
      'expense.timeout',
      'expense',
      expense.id,
      expense,
      updatedExpense,
      { timeout_days: 7, resolved_at: expense.resolved_at }
    )

    return updatedExpense
  }

  return expense
}

// Check 30-day closure for questioned expenses
export async function checkAndApply30DayClosure(
  db: D1Database,
  expense: Expense
): Promise<Expense> {
  if (expense.status !== 'questioned') return expense

  const questionedAt = new Date(expense.questioned_at!)
  const now = new Date()
  const daysDiff = (now.getTime() - questionedAt.getTime()) / (1000 * 60 * 60 * 24)

  if (daysDiff >= 30) {
    const closedAt = now.toISOString()
    await db
      .prepare(
        `UPDATE expenses SET
        status = 'closed_unresolved',
        closed_unresolved_at = ?,
        closed_unresolved_by = 'system',
        updated_at = datetime('now')
       WHERE id = ?`
      )
      .bind(closedAt, expense.id)
      .run()

    const updatedExpense = {
      ...expense,
      status: 'closed_unresolved',
      closed_unresolved_at: closedAt,
      closed_unresolved_by: 'system',
    }

    // Log system closure activity event
    await createActivityEvent(
      db,
      expense.family_id,
      'system',
      'expense.closure',
      'expense',
      expense.id,
      expense,
      updatedExpense,
      { timeout_days: 30, questioned_at: expense.questioned_at }
    )

    return updatedExpense
  }

  return expense
}

// Apply all on-read timeout checks to an expense
export async function applyTimeoutChecks(db: D1Database, expense: Expense): Promise<Expense> {
  let result = await checkAndApplyTimeout(db, expense)
  result = await checkAndApply30DayClosure(db, result)
  return result
}

// Get family tier (free or pro)
export async function getFamilyTier(
  db: D1Database,
  familyId: string
): Promise<{ plan: 'free' | 'pro'; historyMonths: number }> {
  const subscription = await db
    .prepare(
      `SELECT plan, status FROM subscriptions WHERE family_id = ? AND status = 'active' AND plan = 'pro'`
    )
    .bind(familyId)
    .first<{ plan: string; status: string }>()

  const isPro = subscription !== null
  return {
    plan: isPro ? 'pro' : 'free',
    historyMonths: isPro ? -1 : 3, // -1 means unlimited
  }
}

// Get the date N months ago in YYYY-MM-DD format
export function getHistoryCutoffDate(months: number): string {
  const now = new Date()
  now.setMonth(now.getMonth() - months)
  return now.toISOString().split('T')[0]
}

// Check tier limit for fixed expenses
export async function checkFixedExpenseLimit(
  db: D1Database,
  familyId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  // Check if family has pro subscription
  const subscription = await db
    .prepare(`SELECT * FROM subscriptions WHERE family_id = ? AND status = 'active'`)
    .bind(familyId)
    .first()

  const isPro = subscription !== null
  const limit = isPro ? Infinity : 2

  // Count current active fixed expenses
  const result = await db
    .prepare(
      `SELECT COUNT(*) as count FROM fixed_expenses
     WHERE family_id = ? AND deleted_at IS NULL
     AND (effective_until IS NULL OR effective_until >= date('now'))`
    )
    .bind(familyId)
    .first<{ count: number }>()

  const current = result?.count || 0

  return {
    allowed: current < limit,
    current,
    limit: isPro ? -1 : 2, // -1 means unlimited
  }
}

// Generate monthly expenses from fixed expense templates
// Returns count of generated expenses AND their details (for notification emails)
export async function generateMonthlyExpenses(
  db: D1Database,
  familyId: string
): Promise<{ count: number; details: GeneratedExpenseDetail[] }> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-indexed
  const monthStr = `${year}-${month.toString().padStart(2, '0')}`

  // Get active fixed expenses for this family
  const fixedExpenses = await db
    .prepare(
      `SELECT * FROM fixed_expenses
     WHERE family_id = ?
     AND deleted_at IS NULL
     AND effective_from <= date('now')
     AND (effective_until IS NULL OR effective_until >= date('now'))`
    )
    .bind(familyId)
    .all<FixedExpense>()

  let generated = 0
  const details: GeneratedExpenseDetail[] = []

  for (const fixed of fixedExpenses.results || []) {
    // Check if expense already exists for this month
    const existingExpense = await db
      .prepare(
        `SELECT id FROM expenses
       WHERE fixed_expense_id = ?
       AND strftime('%Y-%m', expense_date) = ?
       AND deleted_at IS NULL`
      )
      .bind(fixed.id, monthStr)
      .first()

    if (existingExpense) {
      continue // Already generated for this month
    }

    // Create expense from template
    const expenseId = generateId()
    const expenseDate = `${monthStr}-01` // 1st of month

    await db
      .prepare(
        `INSERT INTO expenses (
        id, family_id, created_by, paid_by, fixed_expense_id, description, amount_cents,
        category, expense_date, child_ids, link_url, memo, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted', datetime('now'), datetime('now'))`
      )
      .bind(
        expenseId,
        fixed.family_id,
        fixed.created_by,
        fixed.created_by, // paid_by defaults to creator
        fixed.id,
        fixed.description,
        fixed.amount_cents,
        fixed.category,
        expenseDate,
        fixed.child_ids,
        fixed.link_url,
        fixed.memo
      )
      .run()

    // Log activity - include expense details for better activity feed display
    await createActivityEvent(
      db,
      fixed.family_id,
      fixed.created_by,
      'expense.generated',
      'expense',
      expenseId,
      null,
      {
        fixed_expense_id: fixed.id,
        description: fixed.description,
        amount_cents: fixed.amount_cents,
        category: fixed.category,
      }
    )

    generated++
    details.push({
      family_id: fixed.family_id,
      description: fixed.description,
      amount_cents: fixed.amount_cents,
    })
  }

  return { count: generated, details }
}

// Generate monthly expenses for ALL families (called by cron)
export async function generateAllFamilyExpenses(db: D1Database): Promise<{
  totalGenerated: number
  familiesProcessed: number
  errors: string[]
  generatedDetails: GeneratedExpenseDetail[]
}> {
  const errors: string[] = []
  let totalGenerated = 0
  let familiesProcessed = 0
  const generatedDetails: GeneratedExpenseDetail[] = []

  // Get all families that have at least one active fixed expense template
  const families = await db
    .prepare(
      `SELECT DISTINCT f.id FROM families f
     INNER JOIN fixed_expenses fe ON fe.family_id = f.id
     WHERE fe.deleted_at IS NULL
     AND fe.effective_from <= date('now')
     AND (fe.effective_until IS NULL OR fe.effective_until >= date('now'))`
    )
    .all<{ id: string }>()

  for (const family of families.results || []) {
    try {
      const result = await generateMonthlyExpenses(db, family.id)
      totalGenerated += result.count
      generatedDetails.push(...result.details)
      familiesProcessed++
    } catch (error) {
      // Isolated failure: one family failing doesn't block others
      errors.push(`Family ${family.id}: ${String(error)}`)
    }
  }

  return { totalGenerated, familiesProcessed, errors, generatedDetails }
}
