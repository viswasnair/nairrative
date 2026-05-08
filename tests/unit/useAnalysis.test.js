/**
 * Integration tests for useAnalysis — focused on the cache save scoping regression.
 *
 * Regression: cache tables were previously upserted with { id: 1, data }.
 * They must now require an active session and upsert with { user_id, ... }
 * using onConflict: "user_id".
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { supabase } from '../../src/lib/supabase'
import { useAnalysis } from '../../src/hooks/useAnalysis'
import { DEFAULT_PANEL_PROMPTS } from '../../src/constants/config'

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

// ── Mock factory ──────────────────────────────────────────────────────────────

/**
 * Wires supabase.from() so we can track upsert calls per table independently.
 * Returns { analysisUpsert, promptsUpsert } for assertions.
 */
function makeFromMock() {
  const analysisUpsert = vi.fn().mockResolvedValue({ error: null })
  const promptsUpsert  = vi.fn().mockResolvedValue({ error: null })
  const maybeSingle    = vi.fn().mockResolvedValue({ data: null })
  const select         = vi.fn().mockReturnValue({ maybeSingle })

  supabase.from.mockImplementation((table) => {
    if (table === 'analysis_cache') return { select, upsert: analysisUpsert }
    if (table === 'panel_prompts')  return { select, upsert: promptsUpsert }
    return { select, upsert: vi.fn().mockResolvedValue({ error: null }) }
  })

  return { analysisUpsert, promptsUpsert }
}

// ── Tests: savePanelPromptsToSupabase ─────────────────────────────────────────
// This function is returned by the hook, so we can call it directly.

describe('useAnalysis — savePanelPromptsToSupabase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('skips upsert when there is no active session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    const { promptsUpsert } = makeFromMock()

    const { result } = renderHook(() => useAnalysis(DEFAULT_PROPS))

    await act(async () => {
      await result.current.savePanelPromptsToSupabase({ temporal: 'custom prompt' })
    })

    expect(promptsUpsert).not.toHaveBeenCalled()
  })

  it('upserts panel_prompts with user_id and onConflict:"user_id" when session exists', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-abc' } } },
    })
    const { promptsUpsert } = makeFromMock()

    const { result } = renderHook(() => useAnalysis(DEFAULT_PROPS))
    const prompts = { temporal: 'Show volume trends', genre: 'Show genre shifts' }

    await act(async () => {
      await result.current.savePanelPromptsToSupabase(prompts)
    })

    expect(promptsUpsert).toHaveBeenCalledOnce()
    expect(promptsUpsert).toHaveBeenCalledWith(
      { user_id: 'user-abc', data: prompts },
      { onConflict: 'user_id' },
    )
  })

  it('payload does not contain the legacy id:1 field', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-abc' } } },
    })
    const { promptsUpsert } = makeFromMock()

    const { result } = renderHook(() => useAnalysis(DEFAULT_PROPS))

    await act(async () => {
      await result.current.savePanelPromptsToSupabase({})
    })

    const [payload] = promptsUpsert.mock.calls[0]
    expect(payload).not.toHaveProperty('id')
    expect(payload).toHaveProperty('user_id')
  })

  it('targets the panel_prompts table', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-abc' } } },
    })
    makeFromMock()

    const { result } = renderHook(() => useAnalysis(DEFAULT_PROPS))

    await act(async () => {
      await result.current.savePanelPromptsToSupabase({ temporal: 'x' })
    })

    expect(supabase.from).toHaveBeenCalledWith('panel_prompts')
  })
})

// ── Tests: updatePanelPrompt / resetPanelPrompt ───────────────────────────────

describe('useAnalysis — updatePanelPrompt and resetPanelPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    makeFromMock()
  })

  it('updatePanelPrompt updates panelPrompts state and persists to localStorage', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    const { result } = renderHook(() => useAnalysis(DEFAULT_PROPS))
    await act(async () => { await flushPromises() })

    await act(async () => { result.current.updatePanelPrompt('temporal', 'Focus on gaps.') })

    expect(result.current.panelPrompts.temporal).toBe('Focus on gaps.')
    const stored = JSON.parse(localStorage.getItem('nairrative_panel_prompts') || '{}')
    expect(stored.temporal).toBe('Focus on gaps.')
  })

  it('resetPanelPrompt restores the DEFAULT_PANEL_PROMPTS value for that dimension', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    const { result } = renderHook(() => useAnalysis(DEFAULT_PROPS))
    await act(async () => { await flushPromises() })

    // First set a custom prompt
    await act(async () => { result.current.updatePanelPrompt('temporal', 'Custom prompt.') })
    expect(result.current.panelPrompts.temporal).toBe('Custom prompt.')

    // Then reset it — should restore the real default
    await act(async () => { result.current.resetPanelPrompt('temporal') })
    expect(result.current.panelPrompts.temporal).toBe(DEFAULT_PANEL_PROMPTS.temporal)
  })
})

// ── Tests: cache load paths ───────────────────────────────────────────────────

describe('useAnalysis — cache load paths', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('loads analysisAI from localStorage when fingerprint matches (skips Supabase)', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    const { analysisUpsert } = makeFromMock()
    // Pre-populate localStorage with a matching fingerprint and cached result
    const cached = { temporal: { insight: 'Cached insight.', evidence: [] } }
    localStorage.setItem('nairrative_analysis_fp', 'fp-test')
    localStorage.setItem('nairrative_analysis_ai', JSON.stringify(cached))

    const { result } = renderHook(() => useAnalysis({ ...DEFAULT_PROPS, activeTab: 'analysis' }))
    await act(async () => { await flushPromises() })

    expect(result.current.analysisAI?.temporal?.insight).toBe('Cached insight.')
    // Supabase should NOT have been queried since the cache hit
    expect(analysisUpsert).not.toHaveBeenCalled()
  })

  it('loads panel prompts from Supabase on mount and updates state', async () => {
    const customPrompts = { temporal: 'From DB prompt.' }
    // Mock panel_prompts select to return data
    const maybeSingle = vi.fn().mockResolvedValue({ data: { data: customPrompts } })
    const select      = vi.fn().mockReturnValue({ maybeSingle })
    supabase.from.mockImplementation((table) => {
      if (table === 'panel_prompts')  return { select, upsert: vi.fn().mockResolvedValue({ error: null }) }
      if (table === 'analysis_cache') return { select: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }), upsert: vi.fn().mockResolvedValue({ error: null }) }
      return { select: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }), upsert: vi.fn().mockResolvedValue({ error: null }) }
    })

    const { result } = renderHook(() => useAnalysis(DEFAULT_PROPS))
    await act(async () => { await flushPromises() })

    expect(result.current.panelPrompts.temporal).toBe('From DB prompt.')
  })
})

// ── Tests: saveAnalysisToSupabase (triggered via regeneratePanel) ─────────────
// saveAnalysisToSupabase is internal; we reach it by calling regeneratePanel()
// which also calls fetch (mocked below).

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
  })

  it('skips analysis_cache upsert when there is no active session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    const { analysisUpsert, promptsUpsert } = makeFromMock()

    const { result } = renderHook(() => useAnalysis(DEFAULT_PROPS))

    await act(async () => {
      await result.current.regeneratePanel('temporal')
    })
    await flushPromises()

    expect(analysisUpsert).not.toHaveBeenCalled()
    expect(promptsUpsert).not.toHaveBeenCalled()
  })

  it('upserts analysis_cache with user_id and onConflict:"user_id" when session exists', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-xyz' } } },
    })
    const { analysisUpsert } = makeFromMock()

    const { result } = renderHook(() => useAnalysis(DEFAULT_PROPS))

    await act(async () => {
      await result.current.regeneratePanel('temporal')
    })
    await flushPromises()

    expect(analysisUpsert).toHaveBeenCalledOnce()
    const [payload, options] = analysisUpsert.mock.calls[0]
    expect(payload).toHaveProperty('user_id', 'user-xyz')
    expect(payload).toHaveProperty('fingerprint', 'fp-test')
    expect(payload).toHaveProperty('data')
    expect(payload).not.toHaveProperty('id')
    expect(options).toEqual({ onConflict: 'user_id' })
  })

  it('analysis_cache payload contains the updated dimension result', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-xyz' } } },
    })
    const { analysisUpsert } = makeFromMock()

    const { result } = renderHook(() => useAnalysis(DEFAULT_PROPS))

    await act(async () => {
      await result.current.regeneratePanel('temporal')
    })
    await flushPromises()

    const [{ data }] = analysisUpsert.mock.calls[0]
    expect(data).toHaveProperty('temporal')
    expect(data.temporal).toHaveProperty('insight')
    expect(data.temporal.insight).toContain('Reading')
  })
})
