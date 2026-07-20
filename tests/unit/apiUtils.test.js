import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { corsHeaders, checkOrigin, checkRateLimit, verifyJWT, b64url } from '../../api/lib/apiUtils.js'

// ── b64url ────────────────────────────────────────────────────────────────────

describe('b64url', () => {
  it('decodes standard base64url to a string', () => {
    // base64url for '{"alg":"HS256","typ":"JWT"}'
    const encoded = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
    const decoded = b64url(encoded)
    expect(decoded).toContain('HS256')
    expect(decoded).toContain('JWT')
  })

  it('handles - and _ (base64url) by converting to + and /', () => {
    // base64url uses - instead of + and _ instead of /
    const standardB64 = btoa('hello world')           // aGVsbG8gd29ybGQ=
    const urlSafe = standardB64.replace(/\+/g, '-').replace(/\//g, '_')
    expect(b64url(urlSafe)).toBe('hello world')
  })
})

// ── corsHeaders ───────────────────────────────────────────────────────────────

describe('corsHeaders', () => {
  const ALLOWED = 'https://nairrative.vercel.app'

  function makeReq(origin) {
    return { headers: { get: (k) => k === 'Origin' ? origin : null } }
  }

  beforeEach(() => {
    delete process.env.ALLOWED_ORIGIN
  })

  it('echoes the allowed origin in the ACAO header', () => {
    const h = corsHeaders(makeReq(ALLOWED))
    expect(h['Access-Control-Allow-Origin']).toBe(ALLOWED)
  })

  it('returns an empty ACAO for a disallowed origin', () => {
    const h = corsHeaders(makeReq('https://evil.com'))
    expect(h['Access-Control-Allow-Origin']).toBe('')
  })

  it('returns an empty ACAO when no Origin header is present', () => {
    const h = corsHeaders(makeReq(null))
    expect(h['Access-Control-Allow-Origin']).toBe('')
  })

  it('respects the ALLOWED_ORIGIN env var', () => {
    process.env.ALLOWED_ORIGIN = 'https://preview.example.com'
    const h = corsHeaders(makeReq('https://preview.example.com'))
    expect(h['Access-Control-Allow-Origin']).toBe('https://preview.example.com')
  })

  it('always allows POST and OPTIONS methods', () => {
    const h = corsHeaders(makeReq(ALLOWED))
    expect(h['Access-Control-Allow-Methods']).toContain('POST')
    expect(h['Access-Control-Allow-Methods']).toContain('OPTIONS')
  })
})

// ── checkOrigin ───────────────────────────────────────────────────────────────

describe('checkOrigin', () => {
  const ALLOWED = 'https://nairrative.vercel.app'

  function makeReq(origin) {
    return { headers: { get: (k) => k === 'Origin' ? origin : null } }
  }

  beforeEach(() => {
    delete process.env.ALLOWED_ORIGIN
  })

  it('returns { ok: true } for the allowed origin', () => {
    expect(checkOrigin(makeReq(ALLOWED))).toEqual({ ok: true })
  })

  it('returns { ok: false, origin } for a disallowed origin', () => {
    expect(checkOrigin(makeReq('https://evil.com'))).toEqual({ ok: false, origin: 'https://evil.com' })
  })

  it('returns { ok: true } when no Origin header is present (server-to-server calls)', () => {
    expect(checkOrigin(makeReq(null))).toEqual({ ok: true })
  })

  it('respects the ALLOWED_ORIGIN env var', () => {
    process.env.ALLOWED_ORIGIN = 'https://preview.example.com'
    expect(checkOrigin(makeReq('https://preview.example.com'))).toEqual({ ok: true })
  })
})

// ── checkRateLimit ────────────────────────────────────────────────────────────

describe('checkRateLimit', () => {
  const URL = 'https://redis.example.com'
  const TOKEN = 'test-token'
  const SUB = 'user-123'

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function mockRedis(count) {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => [{ result: count }, { result: 1 }],
    })
  }

  it('returns true (allow) when count is below the limit', async () => {
    mockRedis(10)
    expect(await checkRateLimit(SUB, URL, TOKEN)).toBe(true)
  })

  it('returns true (allow) when count equals the limit (30)', async () => {
    mockRedis(30)
    expect(await checkRateLimit(SUB, URL, TOKEN)).toBe(true)
  })

  it('returns false (block) when count exceeds the limit (31)', async () => {
    mockRedis(31)
    expect(await checkRateLimit(SUB, URL, TOKEN)).toBe(false)
  })

  it('fails closed (returns false) when Redis responds with non-ok', async () => {
    fetch.mockResolvedValue({ ok: false })
    expect(await checkRateLimit(SUB, URL, TOKEN)).toBe(false)
  })

  it('fails closed (returns false) when fetch throws', async () => {
    fetch.mockRejectedValue(new Error('Network error'))
    expect(await checkRateLimit(SUB, URL, TOKEN)).toBe(false)
  })

  it('fails closed when count is not a number (unexpected Redis response)', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => [{ result: 'unexpected' }],
    })
    expect(await checkRateLimit(SUB, URL, TOKEN)).toBe(false)
  })
})

// ── verifyJWT ─────────────────────────────────────────────────────────────────

describe('verifyJWT', () => {
  const SUPABASE_URL = 'https://example.supabase.co'

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns { ok: false } for a token with fewer than 3 parts', async () => {
    expect(await verifyJWT('only.two', SUPABASE_URL)).toEqual({ ok: false })
    expect(await verifyJWT('one', SUPABASE_URL)).toEqual({ ok: false })
  })

  it('returns { ok: false } for an expired token', async () => {
    // Build a minimal JWT with exp in the past
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({ sub: 'user1', exp: Math.floor(Date.now() / 1000) - 3600 }))
    const sig = btoa('fake-signature')
    const token = `${header}.${payload}.${sig}`
    expect(await verifyJWT(token, SUPABASE_URL)).toEqual({ ok: false })
  })

  it('returns { ok: false } when JWKS fetch fails', async () => {
    fetch.mockResolvedValue({ ok: false })
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({ sub: 'user1', exp: Math.floor(Date.now() / 1000) + 3600 }))
    const sig = btoa('fake-signature')
    const token = `${header}.${payload}.${sig}`
    expect(await verifyJWT(token, SUPABASE_URL)).toEqual({ ok: false })
  })

  it('returns { ok: false } when JWKS returns no matching key', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [] }), // no keys
    })
    const header = btoa(JSON.stringify({ alg: 'HS256', kid: 'key1' }))
    const payload = btoa(JSON.stringify({ sub: 'user1', exp: Math.floor(Date.now() / 1000) + 3600 }))
    const sig = btoa('fake-signature')
    const token = `${header}.${payload}.${sig}`
    expect(await verifyJWT(token, SUPABASE_URL)).toEqual({ ok: false })
  })

  it('returns { ok: false } for an unknown key type (kty)', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [{ kty: 'UnknownType', kid: 'k1' }] }),
    })
    const header = btoa(JSON.stringify({ alg: 'XX', kid: 'k1' }))
    const payload = btoa(JSON.stringify({ sub: 'user1', exp: Math.floor(Date.now() / 1000) + 3600 }))
    const sig = btoa('fake-signature')
    const token = `${header}.${payload}.${sig}`
    expect(await verifyJWT(token, SUPABASE_URL)).toEqual({ ok: false })
  })

  it('returns { ok: false } when header.alg does not match the key family (algorithm confusion)', async () => {
    // RSA key but header claims HS256 (HMAC) — classic alg-confusion attack shape
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [{ kty: 'RSA', kid: 'k1' }] }),
    })
    const header = btoa(JSON.stringify({ alg: 'HS256', kid: 'k1' }))
    const payload = btoa(JSON.stringify({ sub: 'user1', exp: Math.floor(Date.now() / 1000) + 3600 }))
    const sig = btoa('fake-signature')
    const token = `${header}.${payload}.${sig}`
    expect(await verifyJWT(token, SUPABASE_URL)).toEqual({ ok: false })
  })

  async function signWithRSA(headerObj, payloadObj) {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true, ['sign', 'verify'],
    )
    const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
    jwk.kid = 'k1'
    const b64urlEncode = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const headerB64 = b64urlEncode(headerObj)
    const payloadB64 = b64urlEncode(payloadObj)
    const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    const sigBuf = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, keyPair.privateKey, signingInput)
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    return { token: `${headerB64}.${payloadB64}.${sigB64}`, jwk }
  }

  it('returns { ok: true, sub } for a validly signed RSA token', async () => {
    const payloadObj = { sub: 'user-42', exp: Math.floor(Date.now() / 1000) + 3600 }
    const { token, jwk } = await signWithRSA({ alg: 'RS256', kid: 'k1' }, payloadObj)
    fetch.mockResolvedValue({ ok: true, json: async () => ({ keys: [jwk] }) })
    expect(await verifyJWT(token, SUPABASE_URL)).toEqual({ ok: true, sub: 'user-42' })
  })

  it('returns { ok: false } when the RSA signature does not verify (tampered payload)', async () => {
    const payloadObj = { sub: 'user-42', exp: Math.floor(Date.now() / 1000) + 3600 }
    const { token, jwk } = await signWithRSA({ alg: 'RS256', kid: 'k1' }, payloadObj)
    fetch.mockResolvedValue({ ok: true, json: async () => ({ keys: [jwk] }) })
    const [h, , s] = token.split('.')
    const tamperedPayload = btoa(JSON.stringify({ sub: 'attacker', exp: payloadObj.exp })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const tamperedToken = `${h}.${tamperedPayload}.${s}`
    expect(await verifyJWT(tamperedToken, SUPABASE_URL)).toEqual({ ok: false })
  })
})
