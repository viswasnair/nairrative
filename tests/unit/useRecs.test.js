/**
 * Integration tests for useRecs — focused on the cache save scoping regression.
 *
 * Regression: recs_cache was previously upserted with { id: 1, data }.
 * It must now require an active session and upsert with { user_id, ... }
 * using onConflict: "user_id".
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { supabase } from '../../src/lib/supabase'
import { useRecs } from '../../src/hooks/useRecs'

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn() },
    from: vi.fn(),
  },
}))

vi.mock('../../src/lib/api', () => ({
  LLM_URL: 'https://mock/claude',
  claudeHeaders: vi.fn(() => ({ 'content-type': 'application/json' })),
  INTER_REQUEST_DELAY_MS: 0,
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BOOKS = [
  {
    id: 1, title: 'Dune', author: 'Frank Herbert',
    year: 2022, year_read_end: 2022, year_read_start: 2022,
    genre: ['Sci-Fi'], fiction: true, series: 'Dune',
  },
]

const DEFAULT_PROPS = {
  books: BOOKS,
  booksFingerprint: 'fp-recs',
  activeTab: 'library',     // not 'recs' — avoids the cache-load useEffect
  readTitlesString: 'Dune',
}

// A recommendation that doesn't match any book in BOOKS (avoids the retry path)
const MOCK_REC = [
  { title: 'Foundation', author: 'Isaac Asimov', year: 1951, reason: 'Classic sci-fi match.' },
]

// The fetch response format useRecs expects
const mockFetchResponse = () => ({
  ok: true,
  json: () => Promise.resolve({
    content: [{ type: 'text', text: JSON.stringify(MOCK_REC) }],
  }),
})

// Resolves all pending microtasks and macrotasks
const flushPromises = () => new Promise(r => setTimeout(r, 0))

// ── Mock factory ──────────────────────────────────────────────────────────────

/**
 * Wires supabase.from() with a per-table upsert mock for recs_cache.
 * Returns { recsUpsert } for assertions.
 */
function makeFromMock() {
  const recsUpsert  = vi.fn().mockResolvedValue({ error: null })
  const maybeSingle = vi.fn().mockResolvedValue({ data: null })
  const eq          = vi.fn().mockReturnValue({ maybeSingle })
  const select      = vi.fn().mockReturnValue({ maybeSingle, eq })

  supabase.from.mockImplementation((table) => {
    if (table === 'recs_cache') return { select, upsert: recsUpsert }
    return { select, upsert: vi.fn().mockResolvedValue({ error: null }) }
  })

  return { recsUpsert }
}

// ── Tests: saveRecsToSupabase (triggered via fetchIntentRecs) ─────────────────
// saveRecsToSupabase is internal; we reach it by calling fetchIntentRecs().

describe('useRecs — saveRecsToSupabase (via fetchIntentRecs)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse()))
  })

  it('skips recs_cache upsert when there is no active session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    const { recsUpsert } = makeFromMock()

    const { result } = renderHook(() => useRecs(DEFAULT_PROPS))

    await act(async () => {
      await result.current.fetchIntentRecs('loved', 'Dune')
    })
    await flushPromises()

    expect(recsUpsert).not.toHaveBeenCalled()
  })

  it('upserts recs_cache with user_id and onConflict:"user_id" when session exists', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-recs' } } },
    })
    const { recsUpsert } = makeFromMock()

    const { result } = renderHook(() => useRecs(DEFAULT_PROPS))

    await act(async () => {
      await result.current.fetchIntentRecs('loved', 'Dune')
    })
    await flushPromises()

    expect(recsUpsert).toHaveBeenCalledOnce()
    const [payload, options] = recsUpsert.mock.calls[0]
    expect(payload).toHaveProperty('user_id', 'user-recs')
    expect(payload).toHaveProperty('fingerprint', 'fp-recs')
    expect(payload).not.toHaveProperty('id')
    expect(options).toEqual({ onConflict: 'user_id' })
  })

  it('payload data contains the recommended book under the correct lens key', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-recs' } } },
    })
    const { recsUpsert } = makeFromMock()

    const { result } = renderHook(() => useRecs(DEFAULT_PROPS))

    await act(async () => {
      await result.current.fetchIntentRecs('loved', 'Dune')
    })
    await flushPromises()

    const [{ data }] = recsUpsert.mock.calls[0]
    expect(data).toHaveProperty('loved')
    expect(Array.isArray(data.loved)).toBe(true)
    expect(data.loved[0]).toMatchObject({ title: 'Foundation', author: 'Isaac Asimov' })
  })

  it('updates intentResults state with the fetched recommendation', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-recs' } } },
    })
    makeFromMock()

    const { result } = renderHook(() => useRecs(DEFAULT_PROPS))

    await act(async () => {
      await result.current.fetchIntentRecs('loved', 'Dune')
    })
    await flushPromises()

    expect(result.current.intentResults['loved']).toBeDefined()
    expect(result.current.intentResults['loved'][0]).toMatchObject({
      title: 'Foundation',
      author: 'Isaac Asimov',
    })
  })

  it('sets an error result when fetch rejects', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    makeFromMock()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')))

    const { result } = renderHook(() => useRecs(DEFAULT_PROPS))

    await act(async () => { await result.current.fetchIntentRecs('loved', 'Dune') })
    await flushPromises()

    const rec = result.current.intentResults['loved']?.[0]
    expect(rec).toBeDefined()
    expect(rec.title).toBe('Could not load')
    expect(rec.reason).toContain('Recommendation unavailable')
  })

  it('loads intentResults from localStorage when fingerprint matches', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    makeFromMock()
    const cached = { 'more-like': [{ title: 'Cached Book', author: 'Author', reason: 'From cache.' }] }
    localStorage.setItem('nairrative_recs_fp', 'fp-recs')
    localStorage.setItem('nairrative_recs', JSON.stringify(cached))

    // Switch to the recs tab — triggers the cache-load effect
    const { result } = renderHook(() => useRecs({ ...DEFAULT_PROPS, activeTab: 'recs' }))
    await act(async () => { await flushPromises() })

    // Seed is merged in; cached result should appear for 'more-like'
    expect(result.current.intentResults['more-like']?.[0].title).toBe('Cached Book')
  })

  it('targets the recs_cache table (not a different cache table)', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-recs' } } },
    })
    makeFromMock()

    const { result } = renderHook(() => useRecs(DEFAULT_PROPS))

    await act(async () => {
      await result.current.fetchIntentRecs('loved', 'Dune')
    })
    await flushPromises()

    expect(supabase.from).toHaveBeenCalledWith('recs_cache')
  })
})

// ── Tests: already-read enforcement + cross-panel dedup ──────────────────────

describe('useRecs — already-read enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    makeFromMock()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('retries when AI returns an already-read book and stores first unread pick', async () => {
    const alreadyRead = [{ title: 'Dune', author: 'Frank Herbert', year: 1965, reason: 'Classic.' }]
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ content: [{ type: 'text', text: JSON.stringify(alreadyRead) }] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ content: [{ type: 'text', text: JSON.stringify(MOCK_REC) }] }) })
    )

    const { result } = renderHook(() => useRecs(DEFAULT_PROPS))
    await act(async () => { await result.current.fetchIntentRecs('loved', 'test') })
    await flushPromises()

    expect(result.current.intentResults['loved']?.[0].title).toBe('Foundation')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('stores "no unread match" message after 3 retries all return already-read books', async () => {
    const alreadyRead = [{ title: 'Dune', author: 'Frank Herbert', year: 1965, reason: 'Classic.' }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: [{ type: 'text', text: JSON.stringify(alreadyRead) }] }),
    }))

    const { result } = renderHook(() => useRecs(DEFAULT_PROPS))
    await act(async () => { await result.current.fetchIntentRecs('loved', 'test') })
    await flushPromises()

    expect(result.current.intentResults['loved']?.[0].title).toBe('No unread match found')
    // initial fetch + 3 retry attempts = 4 total
    expect(fetch).toHaveBeenCalledTimes(4)
  })

  it('filters already-read books from cache when loading on recs tab', async () => {
    // 'Dune' is in BOOKS (already read); 'Foundation' is not
    const cached = {
      'more-like': [{ title: 'Dune', author: 'Frank Herbert', reason: 'Already read.' }],
      'trending':  [{ title: 'Foundation', author: 'Isaac Asimov', reason: 'Unread.' }],
    }
    localStorage.setItem('nairrative_recs_fp', 'fp-recs')
    localStorage.setItem('nairrative_recs', JSON.stringify(cached))

    const { result } = renderHook(() => useRecs({ ...DEFAULT_PROPS, activeTab: 'recs' }))
    await act(async () => { await flushPromises() })

    // Dune is filtered from 'more-like'; seed data fills the gap — confirm it isn't Dune
    expect(result.current.intentResults['more-like']?.[0].title).not.toBe('Dune')
    // Foundation is unread — it should survive the filter
    expect(result.current.intentResults['trending']?.[0].title).toBe('Foundation')
  })

  it('deduplicates across panels when loading from cache — first panel wins', async () => {
    const cached = {
      'more-like': [{ title: 'Foundation', author: 'Isaac Asimov', reason: 'First claim.' }],
      'trending':  [{ title: 'Foundation', author: 'Isaac Asimov', reason: 'Duplicate.' }],
    }
    localStorage.setItem('nairrative_recs_fp', 'fp-recs')
    localStorage.setItem('nairrative_recs', JSON.stringify(cached))

    const { result } = renderHook(() => useRecs({ ...DEFAULT_PROPS, activeTab: 'recs' }))
    await act(async () => { await flushPromises() })

    // 'more-like' claimed Foundation first — it should keep it
    expect(result.current.intentResults['more-like']?.[0].title).toBe('Foundation')
    // 'trending' had a duplicate — it's dropped and seed fills the gap; confirm it isn't Foundation
    expect(result.current.intentResults['trending']?.[0].title).not.toBe('Foundation')
  })
})

// ── Tests: abort / race conditions ────────────────────────────────────────────

describe('useRecs — abort and race condition handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    makeFromMock()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('AbortError from fetch is silently swallowed — no error entry in intentResults', async () => {
    const abortError = new DOMException('The user aborted a request.', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError))

    const { result } = renderHook(() => useRecs(DEFAULT_PROPS))
    await act(async () => { await result.current.fetchIntentRecs('loved', 'Dune') })
    await flushPromises()

    expect(result.current.intentResults['loved']?.some(r => r.title === 'Could not load')).toBeFalsy()
  })

  it('unmounting the hook aborts any pending intent fetch requests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))

    const { result, unmount } = renderHook(() => useRecs(DEFAULT_PROPS))
    act(() => { void result.current.fetchIntentRecs('loved', 'Dune') })

    // Flush microtasks so supabase.auth.getSession() resolves and fetch gets called
    await act(async () => { await flushPromises() })

    const signal = fetch.mock.calls[0]?.[1]?.signal
    expect(signal).toBeDefined()

    unmount()
    expect(signal.aborted).toBe(true)
  })
})
