# ke-api

Cloudflare Worker that serves the Kid Expenses API. Hono on D1, deployed via
`wrangler`.

See `wrangler.toml` for the full list of bindings and environment variables.

## Local development

```bash
npm install
npx wrangler dev
```

## Deploy

```bash
# Apply any pending migrations first.
npx wrangler d1 migrations apply ke-main --remote
npx wrangler deploy
```

## JWT audience validation

The auth middleware verifies Clerk-issued JWTs. To close the cross-application
replay surface (a token minted for another app on the same Clerk instance
otherwise passes verification), configure both sides:

1. In the Clerk dashboard, add a JWT template that includes an `aud` claim.
   Recommended value: `aud: "ke-api"`.
2. Set the matching Worker secret so the API enforces the claim:

   ```bash
   npx wrangler secret put CLERK_JWT_AUDIENCE
   # paste: ke-api  (or whatever value you chose in the Clerk template)
   ```

When `CLERK_JWT_AUDIENCE` is unset, the middleware logs a single startup
warning and skips the check — existing deployments keep working until the
Clerk template is configured. When set, JWTs whose `aud` claim is missing or
mismatched are rejected with `401 Invalid or expired token`.
