/**
 * Integration tests for useRecs — focused on the cache save scoping regression.
 *
 * Regression: recs_cache was previously upserted with { id: 1, data }.
 * It must now require an active session and call the db adapter with the
 * correct user_id.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { getSession } from '../../src/lib/auth'
import * as db from '../../src/lib/db'
import { useRecs } from '../../src/hooks/useRecs'

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../../src/lib/auth', () => ({
  getSession: vi.fn(),
}))

vi.mock('../../src/lib/db', () => ({
  getRecsCache:  vi.fn(),
  saveRecsCache: vi.fn(),
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

const mockFetchResponse = () => ({
  ok: true,
  json: () => Promise.resolve({
    content: [{ type: 'text', text: JSON.stringify(MOCK_REC) }],
  }),
})

// Resolves all pending microtasks and macrotasks
const flushPromises = () => new Promise(r => setTimeout(r, 0))

// ── Tests: saveRecsToSupabase (triggered via fetchIntentRecs) ─────────────────

describe('useRecs — saveRecsToSupabase (via fetchIntentRecs)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse()))
    db.getRecsCache.mockResolvedValue({ data: null })
    db.saveRecsCache.mockResolvedValue({ error: null })
  })

  it('skips recs cache save when there is no active session', async () => {
    getSession.mockResolvedValue(null)

    const { result } = renderHook(() => useRecs(DEFAULT_PROPS))

    await act(async () => {
      await result.current.fetchIntentRecs('loved', 'Dune')
    })
    await flushPromises()

    expect(db.saveRecsCache).not.toHaveBeenCalled()
  })

  it('calls db.saveRecsCache with user_id, fingerprint, and data when session exists', async () => {
    getSession.mockResolvedValue({ user: { id: 'user-recs' } })

    const { result } = renderHook(() => useRecs(DEFAULT_PROPS))

    await act(async () => {
      await result.current.fetchIntentRecs('loved', 'Dune')
    })
    await flushPromises()

    expect(db.saveRecsCache).toHaveBeenCalledOnce()
    const [userId, fingerprint, data] = db.saveRecsCache.mock.calls[0]
    expect(userId).toBe('user-recs')
    expect(fingerprint).toBe('fp-recs')
    expect(data).toBeDefined()
  })

  it('does not pass a legacy id field — only user_id is the key', async () => {
    getSession.mockResolvedValue({ user: { id: 'user-recs' } })

    const { result } = renderHook(() => useRecs(DEFAULT_PROPS))

    await act(async () => {
      await result.current.fetchIntentRecs('loved', 'Dune')
    })
    await flushPromises()

    const [userId] = db.saveRecsCache.mock.calls[0]
    expect(typeof userId).toBe('string')
    expect(userId).toBe('user-recs')
  })

  it('payload data contains the recommended book under the correct lens key', async () => {
    getSession.mockResolvedValue({ user: { id: 'user-recs' } })

    const { result } = renderHook(() => useRecs(DEFAULT_PROPS))

    await act(async () => {
      await result.current.fetchIntentRecs('loved', 'Dune')
    })
    await flushPromises()

    const [, , data] = db.saveRecsCache.mock.calls[0]
    expect(data).toHaveProperty('loved')
    expect(Array.isArray(data.loved)).toBe(true)
    expect(data.loved[0]).toMatchObject({ title: 'Foundation', author: 'Isaac Asimov' })
  })

  it('updates intentResults state with the fetched recommendation', async () => {
    getSession.mockResolvedValue({ user: { id: 'user-recs' } })

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
})
