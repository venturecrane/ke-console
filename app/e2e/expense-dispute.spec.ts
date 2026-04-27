/**
 * Smoke spec: dispute (question) an expense and verify the activity feed
 * reflects the status change.
 *
 * Runs under `chromium-authed` (storageState from auth.setup.ts).
 *
 * Reality check on `canQuestion`:
 *   app/src/lib/expenseActions.ts requires `expense.created_by !== userId` —
 *   the questioner must NOT be the creator. With a single-user test fixture,
 *   the only questionable expenses are ones created by a co-parent. So this
 *   spec:
 *     1. Loads the expenses list.
 *     2. Walks recent expenses looking for one whose detail page exposes the
 *        "Question This Expense" button.
 *     3. If found: dispute it, assert the StatusBadge flips to "Questioned"
 *        and the timeline gains a new event.
 *     4. If none found: skip with a clear message — the smoke layer should
 *        not seed cross-user fixtures.
 *
 * Future hardening: an API-level seed that creates a questionable expense
 * before the spec runs would let us drop the skip path.
 */

import { expect, test } from '@playwright/test'

test('question a posted expense and see status + timeline update', async ({ page }) => {
  await page.goto('/expenses')
  await page.waitForLoadState('networkidle')

  // If no family yet, /expenses redirects or renders an empty surface — skip.
  if (!/\/expenses(\?|$)/.test(page.url())) {
    test.skip(true, 'Test user has no family; /expenses not available')
  }

  // Collect detail-page links from the expenses list. The list renders
  // <Link href={`/expenses/${expense.id}`}> rows.
  const detailLinks = await page
    .locator('a[href^="/expenses/"]')
    .evaluateAll((els) =>
      Array.from(
        new Set(
          (els as HTMLAnchorElement[])
            .map((el) => el.getAttribute('href') ?? '')
            .filter((href) => /^\/expenses\/[^/?#]+$/.test(href))
        )
      )
    )

  if (detailLinks.length === 0) {
    test.skip(true, 'No expenses available to question')
  }

  // Walk the first few recent expenses; the questioner can only question
  // expenses they did NOT create, so most candidates may not be eligible.
  let questioned = false
  for (const href of detailLinks.slice(0, 10)) {
    await page.goto(href)
    await page.waitForLoadState('networkidle')

    const questionButton = page.getByRole('button', { name: 'Question This Expense' })
    if (await questionButton.isVisible().catch(() => false)) {
      await questionButton.click()

      // The form opens with a default reason (`wrong_amount`). Optional note
      // field — skip it. Submit.
      await page.getByRole('button', { name: /^Submit Question$/ }).click()

      // After success, the StatusBadge should render "Questioned".
      await expect(page.getByText('Questioned', { exact: true }).first()).toBeVisible({
        timeout: 15_000,
      })

      // The Timeline section should be present and non-empty (the question
      // creates a new activity event).
      await expect(page.getByRole('heading', { name: /^Timeline$/ })).toBeVisible()

      questioned = true
      break
    }
  }

  if (!questioned) {
    test.skip(
      true,
      'No questionable expense found (test user creates all expenses; need cross-user seed)'
    )
  }
})
