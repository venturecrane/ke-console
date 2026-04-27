/**
 * Smoke spec: auth gate (authenticated half).
 *
 * Runs under the `chromium-authed` project in playwright.config.ts, which
 * loads the Clerk storageState captured by playwright/auth.setup.ts. With a
 * valid session cookie, /dashboard should render the authenticated UI.
 *
 * Pair: app/e2e/login.public.spec.ts covers the unauthenticated redirect.
 */

import { expect, test } from '@playwright/test'

test('authenticated user lands on /dashboard and sees the dashboard shell', async ({ page }) => {
  await page.goto('/dashboard')

  // We should NOT be bounced to /sign-in.
  await expect(page).toHaveURL(/\/dashboard/)

  // The dashboard renders one of two states depending on whether the test
  // user has joined a family yet:
  //   - hasFamily=true  → "Net Balance" card + "Recent Activity" section
  //   - hasFamily=false → onboarding "Set Up Your Family" surface
  // Either is a successful authenticated render. We assert the union so the
  // spec doesn't depend on the test account's family state.
  const balanceCard = page.getByText('Net Balance', { exact: false }).first()
  const setupSurface = page.getByText(/Set Up Your Family|Have an invite code/i).first()

  await expect(balanceCard.or(setupSurface)).toBeVisible({ timeout: 15_000 })
})
