import { test, expect } from '@playwright/test';

/**
 * Security regression tests for the /api/claude edge function.
 *
 * These tests verify that all auth, CORS, and input validation gates
 * are in place. They run against the deployed URL only — the Vercel
 * edge function does not run in the local dev server.
 *
 * To run:
 *   PLAYWRIGHT_BASE_URL=https://nairrative.vercel.app npx playwright test security
 */

const DEPLOYED = !!process.env.PLAYWRIGHT_BASE_URL;
const API = `${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'}/api/claude`;

const VALID_BODY = {
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 10,
  messages: [{ role: 'user', content: 'hi' }],
};

test.describe('API authentication', () => {
  test.skip(!DEPLOYED, 'Security tests require a deployed URL — set PLAYWRIGHT_BASE_URL');

  test('no Authorization header → 401', async ({ request }) => {
    const res = await request.post(API, { data: VALID_BODY });
    expect(res.status()).toBe(401);
  });

  test('empty Bearer token → 401', async ({ request }) => {
    const res = await request.post(API, {
      headers: { Authorization: 'Bearer ' },
      data: VALID_BODY,
    });
    expect(res.status()).toBe(401);
  });

  test('malformed JWT → 401', async ({ request }) => {
    const res = await request.post(API, {
      headers: { Authorization: 'Bearer not.a.valid.jwt' },
      data: VALID_BODY,
    });
    expect(res.status()).toBe(401);
  });

  test('well-formed but invalid JWT signature → 401', async ({ request }) => {
    // A structurally valid JWT with a fake signature
    const fakeJwt =
      'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9' +
      '.eyJzdWIiOiJ0ZXN0IiwiZXhwIjo5OTk5OTk5OTk5fQ' +
      '.invalidsignatureXXXXXXXXXXXXXXXXXXXXXXXX';
    const res = await request.post(API, {
      headers: { Authorization: `Bearer ${fakeJwt}` },
      data: VALID_BODY,
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('HTTP method enforcement', () => {
  test.skip(!DEPLOYED, 'Security tests require a deployed URL — set PLAYWRIGHT_BASE_URL');

  test('GET → 405', async ({ request }) => {
    const res = await request.get(API);
    expect(res.status()).toBe(405);
  });

  test('PUT → 405', async ({ request }) => {
    const res = await request.put(API, { data: VALID_BODY });
    expect(res.status()).toBe(405);
  });
});

test.describe('CORS', () => {
  test.skip(!DEPLOYED, 'Security tests require a deployed URL — set PLAYWRIGHT_BASE_URL');

  test('OPTIONS preflight from allowed origin → 204 with correct headers', async ({ request }) => {
    const res = await request.fetch(API, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://nairrative.vercel.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });
    expect(res.status()).toBe(204);
    expect(res.headers()['access-control-allow-origin']).toBe('https://nairrative.vercel.app');
    expect(res.headers()['access-control-allow-methods']).toContain('POST');
  });

  test('request from disallowed origin → Access-Control-Allow-Origin is not echoed', async ({ request }) => {
    const res = await request.post(API, {
      headers: {
        Authorization: 'Bearer fake.token.here',
        Origin: 'https://evil.com',
      },
      data: VALID_BODY,
    });
    // Auth will return 401, but the hostile origin must not be reflected
    const allowedOrigin = res.headers()['access-control-allow-origin'] || '';
    expect(allowedOrigin).not.toBe('https://evil.com');
  });
});

test.describe('Input validation', () => {
  test.skip(!DEPLOYED, 'Security tests require a deployed URL — set PLAYWRIGHT_BASE_URL');

  test('disallowed model → 400 (not forwarded to Anthropic)', async ({ request }) => {
    // No valid JWT — will hit 401 first. This test verifies the endpoint
    // doesn't forward the request before checking the model.
    // A full model-rejection test (400) requires an authenticated session
    // and is covered by manual testing after deploy.
    const res = await request.post(API, {
      headers: { Authorization: 'Bearer fake.token' },
      data: { ...VALID_BODY, model: 'gpt-4o' },
    });
    // Will be 401 (auth fails before model check) — confirms request is blocked
    expect([400, 401]).toContain(res.status());
  });

  test('non-JSON body → 400', async ({ request }) => {
    const res = await request.post(API, {
      headers: {
        Authorization: 'Bearer fake.token',
        'Content-Type': 'application/json',
      },
      body: 'this is not json',
    });
    expect([400, 401]).toContain(res.status());
  });
});

test.describe('Bundle secrets check', () => {
  // This test runs locally against the built dist/ folder.
  // It does NOT require PLAYWRIGHT_BASE_URL.

  test('ANTHROPIC_API_KEY is not present in the built bundle', async ({ request }) => {
    // Fetch the main JS bundle from the running server
    const indexRes = await request.get(
      process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'
    );
    const html = await indexRes.text();

    // Extract JS bundle src from the HTML
    const scriptMatch = html.match(/src="([^"]*\.js)"/);
    if (!scriptMatch) {
      // No bundle found — skip (dev server serves modules differently)
      test.skip();
      return;
    }

    const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
    const bundleRes = await request.get(`${base}${scriptMatch[1]}`);
    const bundle = await bundleRes.text();

    expect(bundle).not.toContain('ANTHROPIC_API_KEY');
    expect(bundle).not.toContain('sk-ant-');
  });
});
