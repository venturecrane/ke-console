import { Hono } from 'hono'
import type { AppType } from '../types'
import { generateId } from '../utils'

/**
 * Public waitlist signup endpoint.
 *
 * POST /waitlist
 *   Body: { email, turnstileToken, utm_source?, utm_medium?, utm_campaign?,
 *           utm_content?, referrer?, landing_path? }
 *   Returns: 200 { ok: true, status: "pending" | "already_signed_up" }
 *
 * Public — no auth (parent index.ts mounts this at /waitlist alongside other
 * public routes; ke-api has no global auth barrier so no special wiring needed).
 * Anti-abuse via Cloudflare Turnstile token verification.
 * Idempotent: dup email returns 200 with status="already_signed_up".
 */
const app = new Hono<AppType>()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const VENTURE_CODE = 'ke'
const VENTURE_NAME = 'Kid Expenses'
const DEFAULT_FROM = 'Kid Expenses <hello@mail.kidexpenses.app>'
const DEFAULT_NOTIFY = 'smdurgan@venturecrane.com'

interface SignupBody {
  email?: string
  turnstileToken?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  referrer?: string
  landing_path?: string
}

app.post('/', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as SignupBody

  const email = body.email?.trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return c.json({ error: 'Invalid email', code: 'INVALID_EMAIL' }, 400)
  }

  const turnstileToken = body.turnstileToken
  if (!turnstileToken) {
    return c.json({ error: 'Missing verification', code: 'MISSING_TURNSTILE' }, 400)
  }

  const remoteIp = c.req.header('cf-connecting-ip') ?? undefined
  const turnstileOk = await verifyTurnstile(
    c.env.TURNSTILE_SECRET_KEY ?? '',
    turnstileToken,
    remoteIp
  )
  if (!turnstileOk) {
    return c.json({ error: 'Verification failed', code: 'TURNSTILE_FAILED' }, 400)
  }

  const id = generateId()
  const unsubscribeToken = crypto.randomUUID()
  const ipCountry = c.req.header('cf-ipcountry') ?? null
  const userAgent = c.req.header('user-agent')?.slice(0, 500) ?? null

  const result = await c.env.DB.prepare(
    `INSERT INTO waitlist_signups
      (id, email, unsubscribe_token, utm_source, utm_medium, utm_campaign,
       utm_content, referrer, landing_path, ip_country, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(email) DO NOTHING`
  )
    .bind(
      id,
      email,
      unsubscribeToken,
      body.utm_source ?? null,
      body.utm_medium ?? null,
      body.utm_campaign ?? null,
      body.utm_content ?? null,
      body.referrer ?? null,
      body.landing_path ?? null,
      ipCountry,
      userAgent
    )
    .run()

  const isNewSignup = (result.meta?.changes ?? 0) > 0

  console.log(
    JSON.stringify({
      level: 'info',
      event: 'waitlist_signup',
      venture: VENTURE_CODE,
      email_hash: await hashEmail(email),
      status: isNewSignup ? 'new' : 'duplicate',
      utm_source: body.utm_source ?? null,
      ip_country: ipCountry,
      timestamp: new Date().toISOString(),
    })
  )

  if (isNewSignup) {
    const apiKey = c.env.RESEND_API_KEY
    if (apiKey) {
      const from = c.env.WAITLIST_FROM_EMAIL ?? DEFAULT_FROM
      const notify = c.env.WAITLIST_NOTIFY_EMAIL ?? DEFAULT_NOTIFY
      await Promise.allSettled([
        sendResend(apiKey, {
          from,
          to: email,
          subject: 'You are on the Kid Expenses list',
          text: confirmationEmailText(),
          html: confirmationEmailHtml(),
        }),
        sendResend(apiKey, {
          from,
          to: notify,
          subject: `[${VENTURE_CODE}] new waitlist signup: ${email}`,
          text: notificationEmailText(email, body, ipCountry),
        }),
      ]).then((results) => {
        results.forEach((r, i) => {
          if (r.status === 'rejected') {
            console.error(
              JSON.stringify({
                level: 'error',
                event: 'waitlist_email_failed',
                venture: VENTURE_CODE,
                recipient_kind: i === 0 ? 'user' : 'notify',
                error: String(r.reason),
              })
            )
          }
        })
      })
    } else {
      console.warn(
        JSON.stringify({
          level: 'warn',
          event: 'waitlist_email_skipped',
          venture: VENTURE_CODE,
          reason: 'RESEND_API_KEY not configured',
        })
      )
    }
  }

  return c.json({
    ok: true,
    status: isNewSignup ? 'pending' : 'already_signed_up',
  })
})

async function verifyTurnstile(secret: string, token: string, remoteIp?: string): Promise<boolean> {
  if (!secret) return false
  const form = new FormData()
  form.append('secret', secret)
  form.append('response', token)
  if (remoteIp) form.append('remoteip', remoteIp)

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    })
    const data = (await res.json()) as { success?: boolean }
    return Boolean(data.success)
  } catch {
    return false
  }
}

interface ResendMessage {
  from: string
  to: string
  subject: string
  text: string
  html?: string
}

async function sendResend(apiKey: string, msg: ResendMessage): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(msg),
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`Resend ${res.status}: ${errBody.slice(0, 200)}`)
  }
}

async function hashEmail(email: string): Promise<string> {
  const enc = new TextEncoder().encode(email)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function confirmationEmailText(): string {
  return `Welcome to ${VENTURE_NAME}.

You are on the early-access list for ${VENTURE_NAME} - the shared ledger for co-parents. A neutral place to log shared child expenses, track running balance, and settle without arguments.

We are in private alpha right now, building deliberately, inviting families in small batches. When your spot opens, you will get an invite to sign in.

In the meantime: keep records of what you spend. We will help you make sense of it.

The ${VENTURE_NAME} team
https://kidexpenses.app`
}

function confirmationEmailHtml(): string {
  return `<!doctype html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:40px auto;padding:0 20px;color:#0f172a;line-height:1.6">
  <h1 style="font-size:24px;font-weight:600;color:#4f46e5;margin:0 0 24px">Welcome to ${VENTURE_NAME}.</h1>
  <p>You are on the early-access list for <strong>${VENTURE_NAME}</strong> - the shared ledger for co-parents. A neutral place to log shared child expenses, track running balance, and settle without arguments.</p>
  <p>We are in private alpha right now, building deliberately, inviting families in small batches. When your spot opens, you will get an invite to sign in.</p>
  <p>In the meantime: keep records of what you spend. We will help you make sense of it.</p>
  <p style="margin-top:32px;color:#64748b;font-size:14px">The ${VENTURE_NAME} team<br><a href="https://kidexpenses.app" style="color:#4f46e5;text-decoration:none">kidexpenses.app</a></p>
</body>
</html>`
}

function notificationEmailText(email: string, body: SignupBody, ipCountry: string | null): string {
  const lines = [
    `New waitlist signup for ${VENTURE_NAME}.`,
    ``,
    `Email: ${email}`,
    `Country: ${ipCountry ?? 'unknown'}`,
    `Source: ${body.utm_source ?? body.referrer ?? 'direct'}`,
    `Landing: ${body.landing_path ?? '/'}`,
    ``,
    `Promote to allowlist: https://dashboard.clerk.com (Kid Expenses app > Settings > Restrictions > Allowlist)`,
  ]
  return lines.join('\n')
}

export default app
