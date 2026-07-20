/**
 * Unit tests for useBooks hook.
 *
 * Covers: modal state management, draft population, author/genre suggestion
 * helpers, saveBook validation (before DB calls), and updateBookRating
 * optimistic state update.
 *
 * DB-heavy flows (full INSERT/UPDATE/DELETE chains) are covered by E2E.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { supabase } from '../../src/lib/supabase'
import { useBooks } from '../../src/hooks/useBooks'

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
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

// Raw shape expected by normalizeBook (mirrors what Supabase returns)
const RAW_BOOK = {
  id: 1, title: 'Dune', user_id: 'u1',
  year_read_start: 2022, year_read_end: 2022,
  genre: ['Science Fiction'], format: 'Novel', fiction: true,
  series: 'Dune', pages: 412, rating: null, cover_url: '', description: '',
  user_added: true, created_at: '2022-01-01', updated_at: '2022-01-01',
  book_authors: [{ author_order: 1, authors: { id: 10, name: 'Frank Herbert', country: 'United States' } }],
}

// A normalized book as it appears in books state after normalizeBook
const BOOK_IN_STATE = {
  id: 1, title: 'Dune', author: 'Frank Herbert',
  year: 2022, year_read_start: 2022, year_read_end: 2022,
  genre: ['Science Fiction'], format: 'Novel', fiction: true,
  series: 'Dune', pages: 412, rating: null, cover_url: '', description: '',
  authors: [{ name: 'Frank Herbert', country: 'United States' }],
}

const flushPromises = () => new Promise(r => setTimeout(r, 0))

// ── Mock factory ──────────────────────────────────────────────────────────────

/**
 * Wires supabase.from() for the three mount-time fetches (books, genres, authors).
 * Returns handles for the books.update chain so callers can assert on it.
 */
function setupMocks({ booksData = [], authorsData = [], genresData = [] } = {}) {
  const booksUpdateEq2 = vi.fn().mockResolvedValue({ error: null })
  const booksUpdateEq  = vi.fn().mockReturnValue({ eq: booksUpdateEq2 })
  const booksUpdate    = vi.fn().mockReturnValue({ eq: booksUpdateEq })

  supabase.from.mockImplementation((table) => {
    if (table === 'books') return {
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: booksData, error: null }),
      }),
      update: booksUpdate,
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('not mocked') }),
        }),
      }),
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }
    if (table === 'genres') return {
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: genresData, error: null }),
      }),
    }
    if (table === 'authors') return {
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: authorsData, error: null }),
        eq:    vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 99, name: 'Test Author' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }
    if (table === 'book_authors') return {
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }
    return {
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }
  })

  return { booksUpdate, booksUpdateEq, booksUpdateEq2 }
}

// ── Tests: modal state management ─────────────────────────────────────────────

describe('useBooks — modal state management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('openAddModal shows modal with an empty draft and no editingBook', async () => {
    const { result } = renderHook(() => useBooks({ session: null }))
    await act(async () => { await flushPromises() })
    await act(async () => { result.current.openAddModal() })
    expect(result.current.showBookModal).toBe(true)
    expect(result.current.editingBook).toBeNull()
    expect(result.current.bookDraft.title).toBe('')
    expect(result.current.bookDraft.authors).toEqual([{ name: '' }])
    expect(result.current.bookDraft.genres).toEqual([])
  })

  it('openEditModal opens modal with book pre-loaded into draft', async () => {
    const { result } = renderHook(() => useBooks({ session: null }))
    await act(async () => { await flushPromises() })
    await act(async () => { result.current.openEditModal(BOOK_IN_STATE) })
    expect(result.current.showBookModal).toBe(true)
    expect(result.current.editingBook).toBe(BOOK_IN_STATE)
    expect(result.current.bookDraft.title).toBe('Dune')
    expect(result.current.bookDraft.authors[0].name).toBe('Frank Herbert')
    expect(result.current.bookDraft.genres).toEqual(['Science Fiction'])
    expect(result.current.bookDraft.rating).toBe('')
  })

  it('openEditModal falls back to b.author when b.authors is empty', async () => {
    const bookNoAuthors = { ...BOOK_IN_STATE, authors: [], author: 'Herbert' }
    const { result } = renderHook(() => useBooks({ session: null }))
    await act(async () => { await flushPromises() })
    await act(async () => { result.current.openEditModal(bookNoAuthors) })
    expect(result.current.bookDraft.authors[0].name).toBe('Herbert')
  })
})

// ── Tests: applyPending ───────────────────────────────────────────────────────

describe('useBooks — applyPending', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('merges bookChatPending into draft and clears pending', async () => {
    const { result } = renderHook(() => useBooks({ session: null }))
    await act(async () => { await flushPromises() })

    const pending = {
      title: 'Foundation', authors: [{ name: 'Isaac Asimov' }],
      genres: ['Science Fiction'], fiction: true, format: 'Novel',
      year: 1951, pages: 255, description: 'A galactic saga.',
    }
    await act(async () => { result.current.setBookChatPending(pending) })
    await act(async () => { result.current.applyPending() })

    expect(result.current.bookDraft.title).toBe('Foundation')
    expect(result.current.bookDraft.authors[0].name).toBe('Isaac Asimov')
    expect(result.current.bookDraft.pages).toBe('255')
    expect(result.current.bookDraft.yearStart).toBe(1951)
    expect(result.current.bookDraft.description).toBe('A galactic saga.')
    expect(result.current.bookChatPending).toBeNull()
  })

  it('is a no-op when bookChatPending is null', async () => {
    const { result } = renderHook(() => useBooks({ session: null }))
    await act(async () => { await flushPromises() })
    const titleBefore = result.current.bookDraft.title
    await act(async () => { result.current.applyPending() })
    expect(result.current.bookDraft.title).toBe(titleBefore)
  })
})

// ── Tests: author suggestion helpers ─────────────────────────────────────────

describe('useBooks — author suggestion helpers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('checkAuthorSuggestion sets a fuzzy match suggestion when name is close but not exact', async () => {
    setupMocks({ authorsData: [{ name: 'Frank Herbert' }] })
    const { result } = renderHook(() => useBooks({ session: null }))
    await act(async () => { await flushPromises() })

    await act(async () => { result.current.checkAuthorSuggestion(0, 'Frank Herbet') }) // typo
    expect(result.current.authorSuggestions[0]).toContain('Frank Herbert')
  })

  it('checkAuthorSuggestion sets null when name exactly matches (case-insensitive)', async () => {
    setupMocks({ authorsData: [{ name: 'Frank Herbert' }] })
    const { result } = renderHook(() => useBooks({ session: null }))
    await act(async () => { await flushPromises() })

    await act(async () => { result.current.checkAuthorSuggestion(0, 'frank herbert') })
    expect(result.current.authorSuggestions[0]).toBeNull()
  })

  it('checkAuthorSuggestion sets null when name is empty', async () => {
    setupMocks()
    const { result } = renderHook(() => useBooks({ session: null }))
    await act(async () => { await flushPromises() })

    await act(async () => { result.current.checkAuthorSuggestion(0, '') })
    expect(result.current.authorSuggestions[0]).toBeNull()
  })

  it('acceptAuthorSuggestion updates the author name and clears suggestion', async () => {
    setupMocks({ authorsData: [{ name: 'Frank Herbert' }] })
    const { result } = renderHook(() => useBooks({ session: null }))
    await act(async () => { await flushPromises() })

    await act(async () => { result.current.checkAuthorSuggestion(0, 'Frank Herbet') })
    expect(result.current.authorSuggestions[0]).toContain('Frank Herbert')

    await act(async () => { result.current.acceptAuthorSuggestion(0, 'Frank Herbert') })
    expect(result.current.bookDraft.authors[0].name).toBe('Frank Herbert')
    expect(result.current.authorSuggestions[0]).toBeNull()
  })

  it('dismissAuthorSuggestion clears suggestion without changing the draft', async () => {
    setupMocks({ authorsData: [{ name: 'Frank Herbert' }] })
    const { result } = renderHook(() => useBooks({ session: null }))
    await act(async () => { await flushPromises() })

    await act(async () => { result.current.checkAuthorSuggestion(0, 'Frank Herbet') })
    const nameBefore = result.current.bookDraft.authors[0].name

    await act(async () => { result.current.dismissAuthorSuggestion(0) })
    expect(result.current.authorSuggestions[0]).toBeNull()
    expect(result.current.bookDraft.authors[0].name).toBe(nameBefore)
  })
})

// ── Tests: genre suggestion helpers ──────────────────────────────────────────

describe('useBooks — genre suggestion helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('acceptGenreSuggestion adds the genre to the draft and closes the input', async () => {
    const { result } = renderHook(() => useBooks({ session: null }))
    await act(async () => { await flushPromises() })

    await act(async () => { result.current.acceptGenreSuggestion('Science Fiction') })
    expect(result.current.bookDraft.genres).toContain('Science Fiction')
    expect(result.current.genreSuggestion).toBeNull()
    expect(result.current.newGenreOpen).toBe(false)
  })

  it('acceptGenreSuggestion does not add a duplicate genre', async () => {
    const { result } = renderHook(() => useBooks({ session: null }))
    await act(async () => { await flushPromises() })

    await act(async () => { result.current.acceptGenreSuggestion('Science Fiction') })
    await act(async () => { result.current.acceptGenreSuggestion('Science Fiction') })
    expect(result.current.bookDraft.genres).toHaveLength(1)
  })

  it('dismissGenreSuggestion clears genreSuggestion', async () => {
    const { result } = renderHook(() => useBooks({ session: null }))
    await act(async () => { await flushPromises() })

    await act(async () => { result.current.dismissGenreSuggestion() })
    expect(result.current.genreSuggestion).toBeNull()
  })
})

// ── Tests: saveBook validation ────────────────────────────────────────────────

describe('useBooks — saveBook validation (pre-DB checks)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('shows error when title is empty', async () => {
    const { result } = renderHook(() => useBooks({ session: null }))
    await act(async () => { await flushPromises() })
    // bookDraft.title defaults to '' → validation fails immediately
    await act(async () => { await result.current.saveBook() })
    expect(result.current.bookMsg).toBe('Title and at least one author are required.')
    expect(result.current.bookSaving).toBe(false)
  })

  it('shows error when author name is empty', async () => {
    const { result } = renderHook(() => useBooks({ session: null }))
    await act(async () => { await flushPromises() })
    await act(async () => {
      result.current.setBookDraft(p => ({ ...p, title: 'Dune', authors: [{ name: '' }] }))
    })
    await act(async () => { await result.current.saveBook() })
    expect(result.current.bookMsg).toBe('Title and at least one author are required.')
  })

  it('shows error when yearStart > yearEnd', async () => {
    const { result } = renderHook(() => useBooks({ session: null }))
    await act(async () => { await flushPromises() })
    await act(async () => {
      result.current.setBookDraft(p => ({
        ...p, title: 'Dune', authors: [{ name: 'Frank Herbert' }],
        yearStart: 2024, yearEnd: 2020,
      }))
    })
    await act(async () => { await result.current.saveBook() })
    expect(result.current.bookMsg).toBe('Year Start must be ≤ Year End.')
  })

  it('shows author suggestion warning when name is close but not in DB', async () => {
    setupMocks({ authorsData: [{ name: 'Frank Herbert' }] })
    const { result } = renderHook(() => useBooks({ session: null }))
    await act(async () => { await flushPromises() })
    await act(async () => {
      result.current.setBookDraft(p => ({
        ...p, title: 'Dune', authors: [{ name: 'Frank Herbet' }], // typo
      }))
    })
    await act(async () => { await result.current.saveBook() })
    expect(result.current.bookMsg).toContain('Check the author name suggestion')
    expect(result.current.authorSuggestions[0]).toContain('Frank Herbert')
  })
})

// ── Tests: updateBookRating ───────────────────────────────────────────────────

describe('useBooks — updateBookRating', () => {
  beforeEach(() => vi.clearAllMocks())

  it('optimistically updates local books state and calls supabase update', async () => {
    const { booksUpdate, booksUpdateEq } = setupMocks({ booksData: [RAW_BOOK] })
    const { result } = renderHook(() => useBooks({ session: null }))
    await act(async () => { await flushPromises() })

    // Confirm book is in state with null rating
    expect(result.current.books.find(b => b.id === 1)?.rating).toBeNull()

    // Rate it
    await act(async () => { await result.current.updateBookRating(1, 'loved') })

    // Optimistic update
    expect(result.current.books.find(b => b.id === 1)?.rating).toBe('loved')
    // DB call
    expect(booksUpdate).toHaveBeenCalledWith({ rating: 'loved' })
    expect(booksUpdateEq).toHaveBeenCalledWith('id', 1)
  })

  it('passes null to supabase when rating is falsy (clearing a rating)', async () => {
    const ratedRaw = { ...RAW_BOOK, rating: 'loved' }
    const { booksUpdate } = setupMocks({ booksData: [ratedRaw] })
    const { result } = renderHook(() => useBooks({ session: null }))
    await act(async () => { await flushPromises() })

    await act(async () => { await result.current.updateBookRating(1, '') })
    expect(booksUpdate).toHaveBeenCalledWith({ rating: null })
  })
})
