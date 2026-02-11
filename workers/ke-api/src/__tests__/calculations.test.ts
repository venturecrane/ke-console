import { describe, it, expect } from 'vitest'
import {
  dollarsToCents,
  centsToDollars,
  calculateShares,
  calculateBalanceFromData,
  isValidRatio,
  isValidAmount,
  type Expense,
  type Payment,
} from '../calculations'

// ============================================================================
// dollarsToCents
// ============================================================================

describe('dollarsToCents', () => {
  it('converts whole dollars correctly', () => {
    expect(dollarsToCents(1)).toBe(100)
    expect(dollarsToCents(10)).toBe(1000)
    expect(dollarsToCents(100)).toBe(10000)
  })

  it('converts dollars and cents correctly', () => {
    expect(dollarsToCents(1.5)).toBe(150)
    expect(dollarsToCents(12.99)).toBe(1299)
    expect(dollarsToCents(0.01)).toBe(1)
    expect(dollarsToCents(0.99)).toBe(99)
  })

  it('handles zero correctly', () => {
    expect(dollarsToCents(0)).toBe(0)
  })

  it('handles rounding edge cases', () => {
    // 0.005 should round to 1 cent (Math.round rounds 0.5 up)
    expect(dollarsToCents(0.005)).toBe(1)
    // 0.004 should round to 0 cents
    expect(dollarsToCents(0.004)).toBe(0)
    // 0.015 should round to 2 cents
    expect(dollarsToCents(0.015)).toBe(2)
    // Common floating point issue: 0.1 + 0.2 = 0.30000000000000004
    expect(dollarsToCents(0.1 + 0.2)).toBe(30)
  })

  it('handles large amounts correctly', () => {
    expect(dollarsToCents(1000)).toBe(100000)
    expect(dollarsToCents(9999.99)).toBe(999999)
  })
})

// ============================================================================
// centsToDollars
// ============================================================================

describe('centsToDollars', () => {
  it('converts cents to dollars correctly', () => {
    expect(centsToDollars(100)).toBe(1)
    expect(centsToDollars(150)).toBe(1.5)
    expect(centsToDollars(1299)).toBe(12.99)
    expect(centsToDollars(1)).toBe(0.01)
  })

  it('handles zero correctly', () => {
    expect(centsToDollars(0)).toBe(0)
  })
})

// ============================================================================
// calculateShares
// ============================================================================

describe('calculateShares', () => {
  it('splits 50-50 correctly', () => {
    const { aShare, bShare } = calculateShares(10000, 0.5)
    expect(aShare).toBe(5000)
    expect(bShare).toBe(5000)
    expect(aShare + bShare).toBe(10000) // No cents lost
  })

  it('splits 60-40 correctly', () => {
    const { aShare, bShare } = calculateShares(10000, 0.6)
    expect(aShare).toBe(6000)
    expect(bShare).toBe(4000)
    expect(aShare + bShare).toBe(10000)
  })

  it('handles odd amounts without losing cents', () => {
    // $100.01 at 50-50 split
    const { aShare, bShare } = calculateShares(10001, 0.5)
    expect(aShare).toBe(5000) // floor(10001 * 0.5) = 5000
    expect(bShare).toBe(5001) // remainder goes to B
    expect(aShare + bShare).toBe(10001) // No cents lost
  })

  it('handles 1 cent edge case', () => {
    const { aShare, bShare } = calculateShares(1, 0.5)
    expect(aShare).toBe(0) // floor(0.5) = 0
    expect(bShare).toBe(1) // remainder
    expect(aShare + bShare).toBe(1)
  })

  it('handles extreme ratios', () => {
    // 100% to parent A
    const full = calculateShares(10000, 1.0)
    expect(full.aShare).toBe(10000)
    expect(full.bShare).toBe(0)

    // 0% to parent A
    const none = calculateShares(10000, 0.0)
    expect(none.aShare).toBe(0)
    expect(none.bShare).toBe(10000)
  })

  it('handles non-round ratios', () => {
    // 33% ratio
    const { aShare, bShare } = calculateShares(10000, 0.33)
    expect(aShare).toBe(3300)
    expect(bShare).toBe(6700)
    expect(aShare + bShare).toBe(10000)
  })
})

// ============================================================================
// calculateBalanceFromData
// ============================================================================

describe('calculateBalanceFromData', () => {
  const parentAId = 'parent-a'
  const parentBId = 'parent-b'

  describe('single expense scenarios', () => {
    it('parent A pays, 50-50 split: B owes A half', () => {
      const expenses: Expense[] = [
        { id: '1', amount_cents: 10000, paid_by: parentAId, status: 'posted' },
      ]

      const result = calculateBalanceFromData(expenses, [], parentAId, parentBId, 0.5)

      // A paid $100, owes $50, so A overpaid by $50
      // Balance should be -5000 (negative = B owes A)
      expect(result.balance).toBe(-5000)
      expect(result.aPaidCents).toBe(10000)
      expect(result.aShareCents).toBe(5000)
      expect(result.bShareCents).toBe(5000)
    })

    it('parent B pays, 50-50 split: A owes B half', () => {
      const expenses: Expense[] = [
        { id: '1', amount_cents: 10000, paid_by: parentBId, status: 'posted' },
      ]

      const result = calculateBalanceFromData(expenses, [], parentAId, parentBId, 0.5)

      // B paid $100, A owes their share ($50)
      // Balance should be +5000 (positive = A owes B)
      expect(result.balance).toBe(5000)
      expect(result.bPaidCents).toBe(10000)
      expect(result.aShareCents).toBe(5000)
    })

    it('parent A pays, 60-40 split: B owes A 40%', () => {
      const expenses: Expense[] = [
        { id: '1', amount_cents: 10000, paid_by: parentAId, status: 'posted' },
      ]

      const result = calculateBalanceFromData(expenses, [], parentAId, parentBId, 0.6)

      // A paid $100, owes $60, so A overpaid by $40
      // Balance should be -4000 (negative = B owes A)
      expect(result.balance).toBe(-4000)
      expect(result.aShareCents).toBe(6000)
      expect(result.bShareCents).toBe(4000)
    })
  })

  describe('multiple expense scenarios', () => {
    it('both parents pay equal amounts at 50-50: balance is zero', () => {
      const expenses: Expense[] = [
        { id: '1', amount_cents: 10000, paid_by: parentAId, status: 'posted' },
        { id: '2', amount_cents: 10000, paid_by: parentBId, status: 'posted' },
      ]

      const result = calculateBalanceFromData(expenses, [], parentAId, parentBId, 0.5)

      // A paid $100, owes $100 (50% of $200)
      // B paid $100, owes $100 (50% of $200)
      // They're even
      expect(result.balance).toBe(0)
      expect(result.totalExpensesCents).toBe(20000)
    })

    it('A pays more than share, B pays less: B owes A', () => {
      const expenses: Expense[] = [
        { id: '1', amount_cents: 8000, paid_by: parentAId, status: 'posted' },
        { id: '2', amount_cents: 2000, paid_by: parentBId, status: 'posted' },
      ]

      const result = calculateBalanceFromData(expenses, [], parentAId, parentBId, 0.5)

      // Total: $100, each owes $50
      // A paid $80, B paid $20
      // A overpaid by $30, B underpaid by $30
      // Balance = -3000 (B owes A $30)
      expect(result.balance).toBe(-3000)
    })
  })

  describe('payment scenarios', () => {
    it('payment from A to B reduces A debt', () => {
      const expenses: Expense[] = [
        { id: '1', amount_cents: 10000, paid_by: parentBId, status: 'posted' },
      ]
      const payments: Payment[] = [{ id: 'p1', amount_cents: 2500, paid_by: parentAId }]

      const result = calculateBalanceFromData(expenses, payments, parentAId, parentBId, 0.5)

      // Before payment: A owes B $50 (balance = 5000)
      // After A pays B $25: A owes B $25 (balance = 2500)
      expect(result.balance).toBe(2500)
      expect(result.paymentsAToBCents).toBe(2500)
    })

    it('payment fully settles debt', () => {
      const expenses: Expense[] = [
        { id: '1', amount_cents: 10000, paid_by: parentBId, status: 'posted' },
      ]
      const payments: Payment[] = [{ id: 'p1', amount_cents: 5000, paid_by: parentAId }]

      const result = calculateBalanceFromData(expenses, payments, parentAId, parentBId, 0.5)

      // A owed B $50, paid $50
      expect(result.balance).toBe(0)
    })

    it('payment from B to A increases A debt (or decreases B debt)', () => {
      const expenses: Expense[] = [
        { id: '1', amount_cents: 10000, paid_by: parentAId, status: 'posted' },
      ]
      const payments: Payment[] = [{ id: 'p1', amount_cents: 2500, paid_by: parentBId }]

      const result = calculateBalanceFromData(expenses, payments, parentAId, parentBId, 0.5)

      // Before payment: B owes A $50 (balance = -5000)
      // After B pays A $25: B owes A $25 (balance = -2500)
      expect(result.balance).toBe(-2500)
      expect(result.paymentsBToACents).toBe(2500)
    })
  })

  describe('edge cases', () => {
    it('handles empty expenses and payments', () => {
      const result = calculateBalanceFromData([], [], parentAId, parentBId, 0.5)

      expect(result.balance).toBe(0)
      expect(result.totalExpensesCents).toBe(0)
      expect(result.aShareCents).toBe(0)
      expect(result.bShareCents).toBe(0)
    })

    it('handles single parent (no parent B)', () => {
      const expenses: Expense[] = [
        { id: '1', amount_cents: 10000, paid_by: parentAId, status: 'posted' },
      ]

      const result = calculateBalanceFromData(
        expenses,
        [],
        parentAId,
        null, // No parent B
        1.0 // A responsible for 100%
      )

      // A paid $100, owes $100, balance is 0
      expect(result.balance).toBe(0)
      expect(result.aShareCents).toBe(10000)
      expect(result.bShareCents).toBe(0)
    })

    it('handles very small amounts (1 cent)', () => {
      const expenses: Expense[] = [
        { id: '1', amount_cents: 1, paid_by: parentAId, status: 'posted' },
      ]

      const result = calculateBalanceFromData(expenses, [], parentAId, parentBId, 0.5)

      // 1 cent at 50%: A owes 0, B owes 1
      // A paid 1, A's share is 0, so A overpaid by 1
      expect(result.balance).toBe(-1)
      expect(result.aShareCents).toBe(0)
      expect(result.bShareCents).toBe(1)
    })

    it('handles large amounts', () => {
      const expenses: Expense[] = [
        { id: '1', amount_cents: 10000000, paid_by: parentAId, status: 'posted' }, // $100,000
      ]

      const result = calculateBalanceFromData(expenses, [], parentAId, parentBId, 0.5)

      expect(result.balance).toBe(-5000000) // B owes A $50,000
      expect(result.totalExpensesCents).toBe(10000000)
    })
  })

  describe('complex multi-period scenario', () => {
    it('simulates a month of shared expenses', () => {
      const expenses: Expense[] = [
        // Week 1: A pays groceries
        { id: '1', amount_cents: 15000, paid_by: parentAId, status: 'posted' },
        // Week 2: B pays soccer registration
        { id: '2', amount_cents: 20000, paid_by: parentBId, status: 'posted' },
        // Week 3: A pays doctor visit
        { id: '3', amount_cents: 7500, paid_by: parentAId, status: 'posted' },
        // Week 4: B pays tutoring
        { id: '4', amount_cents: 12000, paid_by: parentBId, status: 'posted' },
      ]

      // Mid-month settlement
      const payments: Payment[] = [{ id: 'p1', amount_cents: 5000, paid_by: parentAId }]

      const result = calculateBalanceFromData(expenses, payments, parentAId, parentBId, 0.5)

      // Total expenses: $545
      // Each owes: $272.50
      // A paid: $225 in expenses + $50 settlement = $275
      // B paid: $320 in expenses
      // A owes: $272.50, paid $275, overpaid by $2.50
      // But need to account for settlement...

      // Step by step (all values in cents, 50-50 split):
      // Expense 1: A pays 15000, A's share = 7500, balance = 7500-15000 = -7500
      // Expense 2: B pays 20000, A's share = 10000, balance = -7500+10000 = 2500
      // Expense 3: A pays 7500, A's share = 3750, balance = 2500+(3750-7500) = -1250
      // Expense 4: B pays 12000, A's share = 6000, balance = -1250+6000 = 4750
      // Payment: A pays B 5000, balance = 4750-5000 = -250

      expect(result.totalExpensesCents).toBe(54500)
      expect(result.aPaidCents).toBe(22500)
      expect(result.bPaidCents).toBe(32000)
      expect(result.paymentsAToBCents).toBe(5000)
      // Final balance: -250 (B owes A $2.50)
      expect(result.balance).toBe(-250)
    })
  })
})

// ============================================================================
// Validation functions
// ============================================================================

describe('isValidRatio', () => {
  it('accepts valid ratios', () => {
    expect(isValidRatio(0)).toBe(true)
    expect(isValidRatio(0.5)).toBe(true)
    expect(isValidRatio(1)).toBe(true)
    expect(isValidRatio(0.33)).toBe(true)
    expect(isValidRatio(0.6)).toBe(true)
  })

  it('rejects invalid ratios', () => {
    expect(isValidRatio(-0.1)).toBe(false)
    expect(isValidRatio(1.1)).toBe(false)
    expect(isValidRatio(-1)).toBe(false)
    expect(isValidRatio(2)).toBe(false)
  })
})

describe('isValidAmount', () => {
  it('accepts valid amounts', () => {
    expect(isValidAmount(1)).toBe(true)
    expect(isValidAmount(100)).toBe(true)
    expect(isValidAmount(999999)).toBe(true)
  })

  it('rejects invalid amounts', () => {
    expect(isValidAmount(0)).toBe(false)
    expect(isValidAmount(-1)).toBe(false)
    expect(isValidAmount(1.5)).toBe(false) // Must be integer
    expect(isValidAmount(-100)).toBe(false)
  })
})
