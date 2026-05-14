import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import handler from '../../api/claude.js'
import { verifyJWT, checkRateLimit } from '../../api/lib/apiUtils.js'

vi.mock('../../api/lib/apiUtils.js', () => ({
  corsHeaders: vi.fn(() => ({ 'Access-Control-Allow-Origin': '*' })),
  checkOrigin: vi.fn(() => ({ ok: true })),
  verifyJWT: vi.fn().mockResolvedValue({ ok: true, sub: 'user-123' }),
  checkRateLimit: vi.fn().mockResolvedValue(true),
  PRODUCTION_ORIGIN: 'https://nairrative.vercel.app',
}))

const GOOD_BODY = {
  model: 'claude-haiku-4-5-20251001',
  messages: [{ role: 'user', content: 'Hi' }],
  max_tokens: 100,
}

function makePost(body, authHeader = 'Bearer test-token') {
  const headers = { 'Content-Type': 'application/json' }
  if (authHeader) headers['Authorization'] = authHeader
  return new Request('https://nairrative.vercel.app/api/claude', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('api/claude.js handler', () => {
  let savedEnv

  beforeEach(() => {
    savedEnv = {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    }
    process.env.ANTHROPIC_API_KEY = 'test-api-key'
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-redis-token'

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"content":[]}', { status: 200 }))
    )
  })

  afterEach(() => {
    Object.entries(savedEnv).forEach(([k, v]) => {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    })
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('OPTIONS preflight → 204', async () => {
    const req = new Request('https://nairrative.vercel.app/api/claude', { method: 'OPTIONS' })
    const res = await handler(req)
    expect(res.status).toBe(204)
  })

  it('non-POST method (GET) → 405', async () => {
    const req = new Request('https://nairrative.vercel.app/api/claude', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(405)
  })

  it('missing ANTHROPIC_API_KEY → 500', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const res = await handler(makePost(GOOD_BODY))
    expect(res.status).toBe(500)
  })

  it('gpt-4o model with missing OPENAI_API_KEY → 500', async () => {
    delete process.env.OPENAI_API_KEY
    const res = await handler(makePost({ ...GOOD_BODY, model: 'gpt-4o' }))
    expect(res.status).toBe(500)
  })

  it('missing VITE_SUPABASE_URL → 500', async () => {
    delete process.env.VITE_SUPABASE_URL
    const res = await handler(makePost(GOOD_BODY))
    expect(res.status).toBe(500)
  })

  it('missing Authorization header → 401', async () => {
    const res = await handler(makePost(GOOD_BODY, null))
    expect(res.status).toBe(401)
  })

  it('invalid JWT → 401', async () => {
    verifyJWT.mockResolvedValueOnce({ ok: false })
    const res = await handler(makePost(GOOD_BODY))
    expect(res.status).toBe(401)
  })

  it('rate limit exceeded → 429', async () => {
    checkRateLimit.mockResolvedValueOnce(false)
    const res = await handler(makePost(GOOD_BODY))
    expect(res.status).toBe(429)
  })

  it('malformed JSON body → 400', async () => {
    const req = new Request('https://nairrative.vercel.app/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: 'not-valid-json{{{',
    })
    const res = await handler(req)
    expect(res.status).toBe(400)
  })

  it('disallowed model → 400', async () => {
    const res = await handler(makePost({ ...GOOD_BODY, model: 'unknown-model-xyz' }))
    expect(res.status).toBe(400)
  })

  it('missing messages → 400', async () => {
    const res = await handler(makePost({ ...GOOD_BODY, messages: undefined }))
    expect(res.status).toBe(400)
  })

  it('empty messages array → 400', async () => {
    const res = await handler(makePost({ ...GOOD_BODY, messages: [] }))
    expect(res.status).toBe(400)
  })

  it('messages not an array → 400', async () => {
    const res = await handler(makePost({ ...GOOD_BODY, messages: 'not an array' }))
    expect(res.status).toBe(400)
  })

  it('max_tokens as string → 400', async () => {
    const res = await handler(makePost({ ...GOOD_BODY, max_tokens: '100' }))
    expect(res.status).toBe(400)
  })

  it('max_tokens as negative integer → 400', async () => {
    const res = await handler(makePost({ ...GOOD_BODY, max_tokens: -1 }))
    expect(res.status).toBe(400)
  })

  it('max_tokens as float → 400', async () => {
    const res = await handler(makePost({ ...GOOD_BODY, max_tokens: 1.5 }))
    expect(res.status).toBe(400)
  })

  it('model as non-string → 400', async () => {
    const res = await handler(makePost({ ...GOOD_BODY, model: 42 }))
    expect(res.status).toBe(400)
  })

  it('fetch error returns generic 500 without leaking details', async () => {
    fetch.mockRejectedValueOnce(new Error('Connection refused to secret-internal-host'))
    const res = await handler(makePost(GOOD_BODY))
    expect(res.status).toBe(500)
    const body = await res.text()
    expect(body).not.toContain('Connection refused')
    expect(body).not.toContain('secret-internal-host')
  })

  it('max_tokens > 2000 is capped to 2000 before forwarding', async () => {
    await handler(makePost({ ...GOOD_BODY, max_tokens: 9999 }))
    const [, opts] = fetch.mock.calls[0]
    const forwarded = JSON.parse(opts.body)
    expect(forwarded.max_tokens).toBe(2000)
  })

  it('happy path: claude model forwarded to Anthropic URL', async () => {
    const res = await handler(makePost(GOOD_BODY))
    expect(fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({ method: 'POST' })
    )
    expect(res.status).toBe(200)
  })

  it('gpt-4o model forwarded to OpenAI URL when key is present', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key'
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: 'hi' } }] }), { status: 200 })
    )
    const res = await handler(makePost({ ...GOOD_BODY, model: 'gpt-4o' }))
    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' })
    )
    expect(res.status).toBe(200)
  })
})
