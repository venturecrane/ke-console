import { createMiddleware } from 'hono/factory'
import type { AppType } from '../types'

// Base64url decode helper
function base64urlDecode(input: string): Uint8Array {
  const padded = input + '='.repeat((4 - (input.length % 4)) % 4)
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// JWKS cache: imported CryptoKey keyed by kid, with TTL
let jwksCache: Map<string, CryptoKey> = new Map()
let jwksCacheExpiry = 0
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

async function fetchJWKS(clerkDomain: string): Promise<void> {
  const url = `https://${clerkDomain}/.well-known/jwks.json`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch JWKS: ${res.status}`)
  }
  const data = (await res.json()) as { keys: (JsonWebKey & { kid?: string })[] }

  const newCache = new Map<string, CryptoKey>()
  for (const jwk of data.keys) {
    if (jwk.kty === 'RSA' && jwk.alg === 'RS256' && jwk.kid) {
      const key = await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify']
      )
      newCache.set(jwk.kid, key)
    }
  }

  jwksCache = newCache
  jwksCacheExpiry = Date.now() + JWKS_CACHE_TTL_MS
}

async function getVerificationKey(
  kid: string,
  clerkDomain: string,
  forceRefresh = false
): Promise<CryptoKey | null> {
  if (forceRefresh || Date.now() > jwksCacheExpiry || jwksCache.size === 0) {
    await fetchJWKS(clerkDomain)
  }
  return jwksCache.get(kid) || null
}

interface JWTPayload {
  sub: string
  iss: string
  exp: number
  nbf?: number
  [key: string]: unknown
}

async function verifyJWT(
  token: string,
  clerkDomain: string,
  expectedIssuer?: string
): Promise<JWTPayload> {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format')
  }

  const [headerB64, payloadB64, signatureB64] = parts

  // Decode header to get kid
  const headerJson = new TextDecoder().decode(base64urlDecode(headerB64))
  const header = JSON.parse(headerJson) as { kid?: string; alg?: string }

  if (header.alg !== 'RS256') {
    throw new Error(`Unsupported algorithm: ${header.alg}`)
  }

  if (!header.kid) {
    throw new Error('Missing kid in JWT header')
  }

  // Get verification key (try cache first)
  let key = await getVerificationKey(header.kid, clerkDomain)

  // Verify signature
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  const signature = base64urlDecode(signatureB64)

  if (key) {
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data)
    if (!valid) {
      // Key rotation: refetch JWKS once and retry
      key = await getVerificationKey(header.kid, clerkDomain, true)
      if (!key) throw new Error('Key not found after JWKS refresh')
      const retryValid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data)
      if (!retryValid) throw new Error('Invalid JWT signature')
    }
  } else {
    // kid not in cache, refresh
    key = await getVerificationKey(header.kid, clerkDomain, true)
    if (!key) throw new Error('Signing key not found in JWKS')
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data)
    if (!valid) throw new Error('Invalid JWT signature')
  }

  // Decode and validate payload
  const payloadJson = new TextDecoder().decode(base64urlDecode(payloadB64))
  const payload = JSON.parse(payloadJson) as JWTPayload

  const now = Math.floor(Date.now() / 1000)

  if (payload.exp && payload.exp < now) {
    throw new Error('JWT expired')
  }

  if (payload.nbf && payload.nbf > now + 30) {
    // 30s clock skew tolerance
    throw new Error('JWT not yet valid')
  }

  if (!payload.sub) {
    throw new Error('Missing sub claim')
  }

  // Validate issuer — reject tokens from other Clerk applications
  if (expectedIssuer) {
    if (!payload.iss) {
      throw new Error('Missing iss claim')
    }
    if (payload.iss !== expectedIssuer) {
      throw new Error('Invalid issuer')
    }
  }

  // TODO: Validate aud (audience) and azp (authorized party) claims
  // when Clerk custom JWT templates are configured with audience restrictions.

  return payload
}

// Exported for testing only — not part of the public API
export {
  base64urlDecode as _base64urlDecode,
  verifyJWT as _verifyJWT,
  getVerificationKey as _getVerificationKey,
  fetchJWKS as _fetchJWKS,
}

// Reset JWKS cache — used by tests to ensure clean state between runs
export function _resetJWKSCache(): void {
  jwksCache = new Map()
  jwksCacheExpiry = 0
}

export const authMiddleware = createMiddleware<AppType>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const clerkDomain = c.env.CLERK_DOMAIN

  // Determine expected issuer: explicit env var takes precedence, otherwise derive from CLERK_DOMAIN
  const expectedIssuer =
    c.env.CLERK_ISSUER_URL || (clerkDomain ? `https://${clerkDomain}` : undefined)

  // Try JWT auth first if Authorization header and CLERK_DOMAIN are present
  if (authHeader?.startsWith('Bearer ') && clerkDomain) {
    try {
      const token = authHeader.slice(7)
      const payload = await verifyJWT(token, clerkDomain, expectedIssuer)
      c.set('userId', payload.sub)
      console.log('Auth: JWT verified for user', payload.sub)
      await next()
      return
    } catch (err) {
      console.error('JWT verification failed:', err)
      return c.json({ error: 'Invalid or expired token' }, 401)
    }
  }

  return c.json({ error: 'Missing authentication' }, 401)
})
