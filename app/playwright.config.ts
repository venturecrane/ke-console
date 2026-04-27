/**
 * Playwright config for ke-console (Next.js app workspace).
 *
 * Adopted via Clerk + Playwright auth bootstrap.
 * Crane runbook: docs/runbooks/clerk-playwright-auth-setup.md
 */

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    // 1. Auth setup — runs once before authenticated projects
    {
      name: 'setup-clerk',
      testMatch: /auth\.setup\.ts/,
    },

    // 2. Authenticated projects — reuse the captured storageState.
    //    Ignore *.public.spec.ts (those run in chromium-public) and the
    //    auth.setup.ts file (it's owned by the setup-clerk project).
    {
      name: 'chromium-authed',
      testIgnore: [/.*\.public\.spec\.ts/, /auth\.setup\.ts/],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.clerk/user.json',
      },
      dependencies: ['setup-clerk'],
    },

    // 3. Unauthenticated projects — no storageState, no dependency
    {
      name: 'chromium-public',
      testMatch: /.*\.public\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
