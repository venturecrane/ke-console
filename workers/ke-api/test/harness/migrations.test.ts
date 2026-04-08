/**
 * ke-api migration validation via @venturecrane/crane-test-harness.
 *
 * Asserts:
 *   1. The full migration chain applies cleanly to a fresh in-memory D1.
 *   2. Every table the ke-api source code reads from / writes to exists
 *      post-migration. Catches schema drift if a migration is dropped or
 *      renamed.
 */

import { describe, it, expect } from 'vitest'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createTestD1,
  runMigrations,
  discoverNumericMigrations,
} from '@venturecrane/crane-test-harness'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, '..', '..', 'migrations')

describe('ke-api migrations via harness', () => {
  it('runMigrations applies the full chain to a fresh DB cleanly', async () => {
    const db = createTestD1()
    const files = discoverNumericMigrations(migrationsDir)
    expect(files.length).toBeGreaterThan(0)
    await runMigrations(db, { files })
  })

  it('post-migration schema includes every table the worker handlers use', async () => {
    const db = createTestD1()
    await runMigrations(db, { files: discoverNumericMigrations(migrationsDir) })

    // Tables referenced by ke-api source (FROM / INSERT INTO / UPDATE)
    // intersected with CREATE TABLE statements in migrations/.
    const expectedTables = [
      'users', // 0001
      'families', // 0001
      'children', // 0001
      'expenses', // 0001
      'payments', // 0001
      'fixed_expenses', // 0001
      'activity_events', // 0001
      'subscriptions', // 0001 / 0004
      'pending_invites', // 0002
      'notification_preferences', // 0005
    ]

    const result = await db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all<{ name: string }>()
    const actualTables = (result.results || []).map((r) => r.name)

    for (const expected of expectedTables) {
      expect(actualTables, `expected table ${expected} to exist post-migration`).toContain(expected)
    }
  })
})
