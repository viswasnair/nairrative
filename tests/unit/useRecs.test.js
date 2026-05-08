/**
 * Integration tests for useRecs — focused on the cache save scoping regression.
 *
 * Regression: recs_cache was previously upserted with { id: 1, data }.
 * It must now require an active session and upsert with { user_id, ... }
 * using onConflict: "user_id".
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
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
  CLAUDE_URL: 'https://mock/claude',
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
