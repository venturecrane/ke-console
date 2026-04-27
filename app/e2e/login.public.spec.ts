/**
 * Smoke spec: auth gate (unauthenticated half).
 *
 * Filename ends in `.public.spec.ts` so it runs under the `chromium-public`
 * project in playwright.config.ts, which has no storageState. That gives us
 * a true cold-start visitor — no Clerk cookie — to assert the middleware in
 * app/src/middleware.ts actually gates /dashboard.
 *
 * Pair: app/e2e/login.spec.ts covers the authenticated half.
 */

import { expect, test } from '@playwright/test'

test('unauthenticated /dashboard redirects to /sign-in', async ({ page }) => {
  await page.goto('/dashboard')

  // Clerk middleware should bounce us to the sign-in surface.
  await expect(page).toHaveURL(/\/sign-in/)

  // The Clerk-hosted form mounts an email input — proves we landed on a real
  // sign-in surface, not a 404 or partial render.
  await expect(page.locator('input[type="email"]').first()).toBeVisible()
})
