// ============================================================================
// Shared JWT test helpers
//
// Centralizes the RSA key generation, base64url encoding, JWT signing, and
// JWKS response construction used across multiple test files. Keep this module
// dependency-free (no test framework imports) so it can be consumed by any
// test file without coupling.
// ============================================================================

export function base64urlEncode(data: Uint8Array | ArrayBuffer): string {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function encodeJWTPart(obj: Record<string, unknown>): string {
  const json = JSON.stringify(obj)
  const bytes = new TextEncoder().encode(json)
  return base64urlEncode(bytes)
}

export interface RSAKeySet {
  privateKey: CryptoKey
  publicKey: CryptoKey
  publicJWK: JsonWebKey & { kid: string }
}

export async function generateRSAKeyPair(kid: string): Promise<RSAKeySet> {
  const keyPair = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  )) as CryptoKeyPair

  const publicJWK = await crypto.subtle.exportKey('jwk', keyPair.publicKey)

  return {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    publicJWK: {
      ...publicJWK,
      kid,
      alg: 'RS256',
      kty: 'RSA',
      use: 'sig',
    },
  }
}

export async function createSignedJWT(
  payload: Record<string, unknown>,
  privateKey: CryptoKey,
  kid: string,
  headerOverrides?: Record<string, unknown>
): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT', kid, ...headerOverrides }

  const headerB64 = encodeJWTPart(header)
  const payloadB64 = encodeJWTPart(payload)

  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, signingInput)

  return `${headerB64}.${payloadB64}.${base64urlEncode(signature)}`
}

export function createJWKSResponse(keys: Array<JsonWebKey & { kid: string }>): Response {
  return new Response(JSON.stringify({ keys }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
