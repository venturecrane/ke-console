import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendNotification } from '../services/notifications'

// Mock generateId
vi.mock('../utils', () => ({
  generateId: vi.fn().mockReturnValue('mock-uuid-001'),
}))

// ============================================================================
// Helper: create a mock D1Database
// ============================================================================

interface MockDbOptions {
  notificationPrefs?: {
    expense_created: number
    expense_questioned: number
    question_resolved: number
    payment_recorded: number
    recurring_generated: number
  } | null
  userEmail?: string | null
  userName?: string | null
}

function createMockDb(options: MockDbOptions = {}) {
  const {
    notificationPrefs = null,
    userEmail = 'test@example.com',
    userName = 'Test User',
  } = options

  let prepareCallIndex = 0

  const prepareFn = vi.fn().mockImplementation(() => {
    prepareCallIndex++

    return {
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockImplementation(() => {
          if (prepareCallIndex === 1) {
            // First call: check notification_preferences
            return Promise.resolve(notificationPrefs)
          }
          if (prepareCallIndex === 2) {
            // Second call: get user email
            return Promise.resolve(userEmail ? { email: userEmail, name: userName } : null)
          }
          return Promise.resolve(null)
        }),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
    }
  })

  return { prepare: prepareFn } as unknown as D1Database
}

// ============================================================================
// Notification Preference Tests
// ============================================================================

describe('Notification Preferences', () => {
  const originalFetch = globalThis.fetch
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 'email-123' }), { status: 200 }))
    globalThis.fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('Preference creation with defaults', () => {
    it('sends notification when no preferences exist (defaults to enabled)', async () => {
      const db = createMockDb({
        notificationPrefs: null, // no preferences row -> defaults to enabled
        userEmail: 'recipient@example.com',
      })
      const env = { RESEND_API_KEY: 'test-key', APP_URL: 'https://test.app' }

      await sendNotification(db, env, 'user-001', 'fam-001', 'expense_created', {
        description: 'Test expense',
        amount_cents: 5000,
        actor_name: 'Alice',
      })

      // Should have called fetch (Resend API) since defaults are all enabled
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[0]).toBe('https://api.resend.com/emails')
      expect(callArgs[1].method).toBe('POST')
    })

    it('sends notification when all preferences are enabled (1)', async () => {
      const db = createMockDb({
        notificationPrefs: {
          expense_created: 1,
          expense_questioned: 1,
          question_resolved: 1,
          payment_recorded: 1,
          recurring_generated: 1,
        },
        userEmail: 'recipient@example.com',
      })
      const env = { RESEND_API_KEY: 'test-key' }

      await sendNotification(db, env, 'user-001', 'fam-001', 'expense_created', {
        description: 'Tuition',
        amount_cents: 50000,
        actor_name: 'Bob',
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Preference update (toggle individual types)', () => {
    it('does NOT send when expense_created is disabled', async () => {
      const db = createMockDb({
        notificationPrefs: {
          expense_created: 0,
          expense_questioned: 1,
          question_resolved: 1,
          payment_recorded: 1,
          recurring_generated: 1,
        },
        userEmail: 'recipient@example.com',
      })
      const env = { RESEND_API_KEY: 'test-key' }

      await sendNotification(db, env, 'user-001', 'fam-001', 'expense_created', {
        description: 'Test',
        amount_cents: 1000,
        actor_name: 'Alice',
      })

      // Should NOT have called fetch since expense_created is disabled
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('does NOT send when expense_questioned is disabled', async () => {
      const db = createMockDb({
        notificationPrefs: {
          expense_created: 1,
          expense_questioned: 0,
          question_resolved: 1,
          payment_recorded: 1,
          recurring_generated: 1,
        },
        userEmail: 'recipient@example.com',
      })
      const env = { RESEND_API_KEY: 'test-key' }

      await sendNotification(db, env, 'user-001', 'fam-001', 'expense_questioned', {
        description: 'Test',
        reason: 'wrong_amount',
        actor_name: 'Bob',
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('does NOT send when question_resolved is disabled', async () => {
      const db = createMockDb({
        notificationPrefs: {
          expense_created: 1,
          expense_questioned: 1,
          question_resolved: 0,
          payment_recorded: 1,
          recurring_generated: 1,
        },
        userEmail: 'recipient@example.com',
      })
      const env = { RESEND_API_KEY: 'test-key' }

      await sendNotification(db, env, 'user-001', 'fam-001', 'question_resolved', {
        description: 'Test',
        action: 'keep',
        actor_name: 'Alice',
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('does NOT send when payment_recorded is disabled', async () => {
      const db = createMockDb({
        notificationPrefs: {
          expense_created: 1,
          expense_questioned: 1,
          question_resolved: 1,
          payment_recorded: 0,
          recurring_generated: 1,
        },
        userEmail: 'recipient@example.com',
      })
      const env = { RESEND_API_KEY: 'test-key' }

      await sendNotification(db, env, 'user-001', 'fam-001', 'payment_recorded', {
        amount_cents: 10000,
        actor_name: 'Bob',
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('Preference respect (disabled = no send)', () => {
    it('still sends when other prefs are disabled but target pref is enabled', async () => {
      const db = createMockDb({
        notificationPrefs: {
          expense_created: 0,
          expense_questioned: 0,
          question_resolved: 0,
          payment_recorded: 1, // only this is enabled
          recurring_generated: 0,
        },
        userEmail: 'recipient@example.com',
      })
      const env = { RESEND_API_KEY: 'test-key' }

      await sendNotification(db, env, 'user-001', 'fam-001', 'payment_recorded', {
        amount_cents: 5000,
        actor_name: 'Alice',
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('does not send when RESEND_API_KEY is missing', async () => {
      const db = createMockDb({
        notificationPrefs: null,
        userEmail: 'recipient@example.com',
      })
      const env = { RESEND_API_KEY: undefined }

      await sendNotification(db, env, 'user-001', 'fam-001', 'expense_created', {
        description: 'Test',
        amount_cents: 1000,
        actor_name: 'Alice',
      })

      // Should NOT call fetch when no API key
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('does not send when user email not found', async () => {
      const db = createMockDb({
        notificationPrefs: null,
        userEmail: null,
      })
      const env = { RESEND_API_KEY: 'test-key' }

      await sendNotification(db, env, 'user-001', 'fam-001', 'expense_created', {
        description: 'Test',
        amount_cents: 1000,
        actor_name: 'Alice',
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('never throws even if fetch fails (BR-056)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const db = createMockDb({
        notificationPrefs: null,
        userEmail: 'recipient@example.com',
      })
      const env = { RESEND_API_KEY: 'test-key' }

      // Should not throw
      await expect(
        sendNotification(db, env, 'user-001', 'fam-001', 'expense_created', {
          description: 'Test',
          amount_cents: 1000,
          actor_name: 'Alice',
        })
      ).resolves.toBeUndefined()
    })

    it('includes expense description and amount in email body', async () => {
      const db = createMockDb({
        notificationPrefs: null,
        userEmail: 'recipient@example.com',
      })
      const env = { RESEND_API_KEY: 'test-key' }

      await sendNotification(db, env, 'user-001', 'fam-001', 'expense_created', {
        description: 'Piano Lessons',
        amount_cents: 7500,
        actor_name: 'Alice',
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string)
      expect(callBody.subject).toContain('Piano Lessons')
      expect(callBody.html).toContain('$75.00')
      expect(callBody.html).toContain('Alice')
    })
  })
})
