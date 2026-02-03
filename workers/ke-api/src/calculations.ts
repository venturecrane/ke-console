/**
 * KE-API Calculation Functions
 *
 * Pure functions for financial calculations.
 * Extracted for testability - all money math lives here.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Expense {
  id: string;
  amount_cents: number;
  paid_by: string;
  status: string;
}

export interface Payment {
  id: string;
  amount_cents: number;
  paid_by: string;
}

export interface BalanceCalculation {
  balance: number;
  totalExpensesCents: number;
  aShareCents: number;
  bShareCents: number;
  aPaidCents: number;
  bPaidCents: number;
  paymentsAToBCents: number;
  paymentsBToACents: number;
}

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert dollars to cents.
 * Uses Math.round to handle floating point precision.
 *
 * @param dollars - Amount in dollars (e.g., 12.50)
 * @returns Amount in cents (e.g., 1250)
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars.
 *
 * @param cents - Amount in cents (e.g., 1250)
 * @returns Amount in dollars (e.g., 12.50)
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

// ============================================================================
// SHARE SPLITTING
// ============================================================================

/**
 * Calculate each parent's share of an expense.
 * Uses floor for parent A to ensure exact split (no rounding errors).
 * Parent B gets the remainder.
 *
 * @param amountCents - Total expense amount in cents
 * @param parentARatio - Parent A's ratio (0 to 1, e.g., 0.6 for 60%)
 * @returns Object with aShare and bShare in cents
 */
export function calculateShares(
  amountCents: number,
  parentARatio: number
): { aShare: number; bShare: number } {
  const aShare = Math.floor(amountCents * parentARatio);
  const bShare = amountCents - aShare;
  return { aShare, bShare };
}

// ============================================================================
// BALANCE CALCULATION
// ============================================================================

/**
 * Calculate the running balance between two parents.
 *
 * Balance semantics:
 * - Positive balance: Parent A owes Parent B
 * - Negative balance: Parent B owes Parent A
 * - Zero: Parents are even
 *
 * @param expenses - Array of expenses to include
 * @param payments - Array of payments to include
 * @param parentAId - Parent A's user ID
 * @param parentBId - Parent B's user ID (or null if single parent)
 * @param parentARatio - Parent A's responsibility ratio (0 to 1)
 * @returns Balance calculation with all intermediate values
 */
export function calculateBalanceFromData(
  expenses: Expense[],
  payments: Payment[],
  parentAId: string,
  parentBId: string | null,
  parentARatio: number
): BalanceCalculation {
  let balance = 0;
  let totalExpensesCents = 0;
  let aShareCents = 0;
  let bShareCents = 0;
  let aPaidCents = 0;
  let bPaidCents = 0;

  for (const expense of expenses) {
    totalExpensesCents += expense.amount_cents;
    const { aShare, bShare } = calculateShares(expense.amount_cents, parentARatio);
    aShareCents += aShare;
    bShareCents += bShare;

    if (expense.paid_by === parentAId) {
      aPaidCents += expense.amount_cents;
      // Parent A paid the full amount but only owes aShare
      // So they overpaid by (amount - aShare), meaning B owes them
      // balance += aShare - expense.amount_cents (negative, B owes A)
      balance += (aShare - expense.amount_cents);
    } else if (expense.paid_by === parentBId) {
      bPaidCents += expense.amount_cents;
      // Parent B paid, but A still owes their share
      // So balance increases by A's share (positive, A owes B)
      balance += aShare;
    }
  }

  let paymentsAToBCents = 0;
  let paymentsBToACents = 0;

  for (const payment of payments) {
    if (payment.paid_by === parentAId) {
      // A paid B directly, reducing A's debt
      paymentsAToBCents += payment.amount_cents;
      balance -= payment.amount_cents;
    } else if (payment.paid_by === parentBId) {
      // B paid A directly, increasing A's debt (or reducing B's debt)
      paymentsBToACents += payment.amount_cents;
      balance += payment.amount_cents;
    }
  }

  return {
    balance,
    totalExpensesCents,
    aShareCents,
    bShareCents,
    aPaidCents,
    bPaidCents,
    paymentsAToBCents,
    paymentsBToACents,
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that a ratio is within valid bounds.
 *
 * @param ratio - The ratio to validate
 * @returns true if valid (0 <= ratio <= 1)
 */
export function isValidRatio(ratio: number): boolean {
  return ratio >= 0 && ratio <= 1;
}

/**
 * Validate that an amount in cents is positive.
 *
 * @param cents - Amount to validate
 * @returns true if valid (cents > 0)
 */
export function isValidAmount(cents: number): boolean {
  return Number.isInteger(cents) && cents > 0;
}
