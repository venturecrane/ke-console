/**
 * Smoke spec: happy path for creating an expense.
 *
 * Runs under `chromium-authed` (storageState from auth.setup.ts).
 *
 * Strategy:
 *   1. Navigate to /expenses/add via the dashboard's "Add Expense" CTA.
 *   2. Fill description + amount with a unique marker so the test is
 *      idempotent across runs (we never assert on a fixed amount).
 *   3. Submit and confirm we get redirected to /dashboard with the new
 *      expense visible (description appears in the Recent Activity list).
 *
 * If the test user has no family, the form redirects to /dashboard before
 * we can fill it — we detect that and skip rather than fail, since the
 * smoke layer should not bring its own family-state seed.
 */

import { expect, test } from '@playwright/test'

test('create expense from /expenses/add and see it on the dashboard', async ({ page }) => {
  // Unique marker per run so consecutive runs don't collide.
  const stamp = Date.now()
  const description = `e2e smoke ${stamp}`
  // Random small amount with cents to exercise the dollars→cents path.
  const amount = (1 + Math.floor(Math.random() * 50) + Math.random()).toFixed(2)

  await page.goto('/expenses/add')

  // If the user has no family, the page redirects to /dashboard. Skip
  // gracefully — covered by login.spec.ts already, and the smoke layer is
  // not responsible for seeding family state.
  await page.waitForLoadState('networkidle')
  if (!/\/expenses\/add/.test(page.url())) {
    test.skip(true, 'Test user has no family; /expenses/add redirects to /dashboard')
  }

  // Use accessibility-first locators. The form labels include a JSX <span>
  // for the asterisk, so we match by the leading text rather than exact.
  await page.getByLabel(/^Description/).fill(description)
  await page.getByLabel(/^Amount/).fill(amount)

  // Submit. Button label is "Add Expense" (dashboard CTA also says
  // "Add Expense" but we're already on /expenses/add at this point).
  await page.getByRole('button', { name: /^Add Expense$/ }).click()

  // The page calls router.push('/dashboard') on success.
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

  // The new expense should appear in Recent Activity / Recent Expenses.
  // Match by the unique stamp, not by amount (which could collide).
  await expect(page.getByText(description).first()).toBeVisible({ timeout: 15_000 })
})
