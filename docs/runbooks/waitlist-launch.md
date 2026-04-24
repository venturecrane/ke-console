# Waitlist + Closed-Allowlist Launch Runbook

Manual setup steps to bring the new landing + waitlist + Clerk allowlist gate live on `kidexpenses.app`. Code is in PR; this is the operator checklist.

## 1. Vercel custom domain

`kidexpenses.app` is registered (smd-llc team) but not yet linked to the `ke-console` Vercel project.

- Vercel project `ke-console` → Settings → Domains → Add `kidexpenses.app`
- Vercel issues DNS records (A or ALIAS for apex; CNAME for `www`).
- Add records to Cloudflare (kidexpenses.app zone).
- Verify Vercel reports `Valid Configuration`.

## 2. Clerk Pro (already covered if DC shipped first)

If Clerk Pro is already active from the DC launch, just provision a new app for KE.

- https://dashboard.clerk.com → New application → "Kid Expenses"
- Settings → Restrictions → enable **Allowlist mode**
- Allowlist → add `smdurgan@venturecrane.com` + any test invitees
- Settings → Email & SMS → Magic link → enable as primary sign-in method
- Customize the magic-link email template (sender: `hello@mail.kidexpenses.app`, body styled to KE brand voice)
- Save the Clerk publishable + secret keys → Vercel env vars on `ke-console`

## 3. Resend domain verification

We send from `mail.kidexpenses.app` to isolate from the existing `invites@kidexpenses.app` sender used for family invites.

- https://resend.com/domains → Add domain → `mail.kidexpenses.app`
- Add SPF + DKIM TXT records and DMARC record to Cloudflare (kidexpenses.app zone).
- Wait for `Verified`.
- The existing `RESEND_API_KEY` (already used by ke-api for invite emails) covers the new sender once the domain is verified — same key, new domain.

## 4. Cloudflare Turnstile

- https://dash.cloudflare.com → Turnstile → Add site
- Site name: `kidexpenses.app waitlist`
- Domain: `kidexpenses.app`
- Widget mode: **Managed** (default)
- Save site key (public) and secret key (server-side).
- Save `TURNSTILE_SECRET_KEY` in Infisical `/ke`.

## 5. Worker secret

```bash
cd workers/ke-api
infisical run --env=prod --path=/ke -- bash -c '
  echo "$TURNSTILE_SECRET_KEY" | wrangler secret put TURNSTILE_SECRET_KEY
'
```

`RESEND_API_KEY` is already configured for ke-api (used by family invite emails).

## 6. Vercel env var (Turnstile site key + new Clerk keys)

- Vercel project `ke-console` → Settings → Environment Variables
- Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (Production + Preview)
- Update `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to the new KE Clerk app values
- Trigger a redeploy

## 7. D1 migration

```bash
cd workers/ke-api
wrangler d1 migrations apply ke-main --remote
```

## 8. End-to-end verification

1. Visit https://kidexpenses.app — landing renders, six sections present, brand-correct (indigo, calm-neutral, light/dark mode adapts).
2. Submit waitlist with a test email → success state appears.
3. Confirmation email arrives in test inbox.
4. Captain notification email arrives at `smdurgan@venturecrane.com`.
5. Submit the same email again → "you are already on the list" state.
6. PWA install on iOS — `start_url` is `/dashboard`, not `/`. Installed-app icon goes straight to product, not landing.
7. Open browser devtools, forge a Turnstile token → form submission rejected.
8. Visit `/sign-in` with an allowlisted email → magic link arrives → sign-in completes → lands on dashboard.
9. Visit `/sign-in` with a non-allowlisted email → blocked at Clerk.
10. Visit a gated route signed-out → redirect to `/sign-in`.
11. Tail the worker:
    ```bash
    cd workers/ke-api && wrangler tail
    ```
    Submit a test signup. Confirm structured `waitlist_signup` log line.

## 9. Reviewing waitlist signups

```bash
cd workers/ke-api
wrangler d1 execute ke-main --remote --command \
  "SELECT id, email, signed_up_at, status, utm_source, ip_country FROM waitlist_signups ORDER BY signed_up_at DESC LIMIT 50"
```

To promote: copy email → Clerk Allowlist → mark row as `invited`:

```bash
wrangler d1 execute ke-main --remote --command \
  "UPDATE waitlist_signups SET status = 'invited' WHERE email = 'foo@example.com'"
```

## Notes on the `(protected)` route group question

KE does NOT use a `(protected)` route group. Auth gating happens entirely in `app/src/proxy.ts` via Clerk middleware. All non-public routes (everything except `/`, `/sign-in`, `/sign-up`, `/api/webhooks`, `/api/waitlist`) are protected by `auth.protect()`. The product entry stays at `/dashboard` with a flat URL — no restructure needed.

The marketing page (`/`) checks `auth()` server-side and redirects authenticated users to `/dashboard`, so testers signing in never see the marketing page after their first visit.
