/**
 * Integration tests for useAnalysis — focused on the cache save scoping regression.
 *
 * Regression: cache tables were previously upserted with { id: 1, data }.
 * They must now require an active session and call the db adapter with the
 * correct user_id.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { getSession } from '../../src/lib/auth'
import * as db from '../../src/lib/db'
import { useAnalysis } from '../../src/hooks/useAnalysis'

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../../src/lib/auth', () => ({
  getSession: vi.fn(),
}))

vi.mock('../../src/lib/db', () => ({
  getPanelPrompts:   vi.fn(),
  getAnalysisCache:  vi.fn(),
  saveAnalysisCache: vi.fn(),
  savePanelPrompts:  vi.fn(),
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
    genre: ['Sci-Fi'], fiction: true, series: 'Dune', pages: 412,
  },
]

const DEFAULT_PROPS = {
  books: BOOKS,
  booksFingerprint: 'fp-test',
  activeTab: 'library',   // not 'analysis' — avoids the cache-load useEffect
  lastAddedAt: null,
}

// Resolves all pending microtasks and macrotasks
const flushPromises = () => new Promise(r => setTimeout(r, 0))

// ── Tests: savePanelPromptsToSupabase ─────────────────────────────────────────

describe('useAnalysis — savePanelPromptsToSupabase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    db.getPanelPrompts.mockResolvedValue({ data: null })
    db.getAnalysisCache.mockResolvedValue({ data: null })
    db.saveAnalysisCache.mockResolvedValue({ error: null })
    db.savePanelPrompts.mockResolvedValue({ error: null })
  })

  it('skips save when there is no active session', async () => {
    getSession.mockResolvedValue(null)

    const { result } = renderHook(() => useAnalysis(DEFAULT_PROPS))

    await act(async () => {
      await result.current.savePanelPromptsToSupabase({ temporal: 'custom prompt' })
    })

    expect(db.savePanelPrompts).not.toHaveBeenCalled()
  })

  it('calls db.savePanelPrompts with user_id and prompts when session exists', async () => {
    getSession.mockResolvedValue({ user: { id: 'user-abc' } })

    const { result } = renderHook(() => useAnalysis(DEFAULT_PROPS))
    const prompts = { temporal: 'Show volume trends', genre: 'Show genre shifts' }

    await act(async () => {
      await result.current.savePanelPromptsToSupabase(prompts)
    })

    expect(db.savePanelPrompts).toHaveBeenCalledOnce()
    expect(db.savePanelPrompts).toHaveBeenCalledWith('user-abc', prompts)
  })

  it('does not pass a legacy id field — only user_id is the key', async () => {
    getSession.mockResolvedValue({ user: { id: 'user-abc' } })

    const { result } = renderHook(() => useAnalysis(DEFAULT_PROPS))

    await act(async () => {
      await result.current.savePanelPromptsToSupabase({})
    })

    const [userId] = db.savePanelPrompts.mock.calls[0]
    expect(typeof userId).toBe('string')
    expect(userId).toBe('user-abc')
  })
})

// ── Tests: saveAnalysisToSupabase (triggered via regeneratePanel) ─────────────

const TEMPORAL_RESPONSE = {
  content: [{ type: 'text', text: JSON.stringify({
    temporal: { insight: 'Reading increased significantly.', evidence: ['Dune'] },
  }) }],
}

describe('useAnalysis — saveAnalysisToSupabase (via regeneratePanel)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(TEMPORAL_RESPONSE),
    }))
    db.getPanelPrompts.mockResolvedValue({ data: null })
    db.getAnalysisCache.mockResolvedValue({ data: null })
    db.saveAnalysisCache.mockResolvedValue({ error: null })
    db.savePanelPrompts.mockResolvedValue({ error: null })
  })

  it('skips analysis cache save when there is no active session', async () => {
    getSession.mockResolvedValue(null)

    const { result } = renderHook(() => useAnalysis(DEFAULT_PROPS))

    await act(async () => {
      await result.current.regeneratePanel('temporal')
    })
    await flushPromises()

    expect(db.saveAnalysisCache).not.toHaveBeenCalled()
    expect(db.savePanelPrompts).not.toHaveBeenCalled()
  })

  it('calls db.saveAnalysisCache with user_id, fingerprint, and data when session exists', async () => {
    getSession.mockResolvedValue({ user: { id: 'user-xyz' } })

    const { result } = renderHook(() => useAnalysis(DEFAULT_PROPS))

    await act(async () => {
      await result.current.regeneratePanel('temporal')
    })
    await flushPromises()

    expect(db.saveAnalysisCache).toHaveBeenCalledOnce()
    const [userId, fingerprint, data] = db.saveAnalysisCache.mock.calls[0]
    expect(userId).toBe('user-xyz')
    expect(fingerprint).toBe('fp-test')
    expect(data).toBeDefined()
  })

  it('analysis cache data contains the updated dimension result', async () => {
    getSession.mockResolvedValue({ user: { id: 'user-xyz' } })

    const { result } = renderHook(() => useAnalysis(DEFAULT_PROPS))

    await act(async () => {
      await result.current.regeneratePanel('temporal')
    })
    await flushPromises()

    const [, , data] = db.saveAnalysisCache.mock.calls[0]
    expect(data).toHaveProperty('temporal')
    expect(data.temporal).toHaveProperty('insight')
    expect(data.temporal.insight).toContain('Reading')
  })
})
