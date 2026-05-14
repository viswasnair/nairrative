import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { makeDraft, useBookCRUD } from '../../src/hooks/useBookCRUD'

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../../src/lib/db', () => ({
  insertBook:         vi.fn(),
  updateBook:         vi.fn(),
  deleteBook:         vi.fn(),
  deleteBookAuthors:  vi.fn(),
  getBookAuthorLinks: vi.fn(),
  getAuthorBookCount: vi.fn(),
  deleteAuthor:       vi.fn(),
  updateBookRating:   vi.fn(),
}))

vi.mock('../../src/lib/authorUtils', () => ({
  resolveAuthorLinks: vi.fn(),
}))

vi.mock('../../src/lib/bookUtils', () => ({
  normalizeBook: vi.fn(b => ({ ...b, _normalized: true })),
}))

import * as db from '../../src/lib/db'
import { resolveAuthorLinks } from '../../src/lib/authorUtils'
import { normalizeBook } from '../../src/lib/bookUtils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeParams(overrides = {}) {
  return {
    session:       { user: { id: 'u-1' } },
    books:         [],
    setBooks:      vi.fn(),
    bookDraft:     makeDraft(),
    setBookDraft:  vi.fn(),
    authorList:    [],
    setAuthorList: vi.fn(),
    onReset:       vi.fn(),
    ...overrides,
  }
}

const AUTHOR_LIST = ['Frank Herbert', 'Isaac Asimov']

// ── makeDraft ─────────────────────────────────────────────────────────────────

describe('makeDraft', () => {
  it('returns an object with expected defaults', () => {
    const draft = makeDraft()
    expect(draft.title).toBe('')
    expect(draft.authors).toEqual([{ name: '' }])
    expect(draft.genres).toEqual([])
    expect(draft.format).toBe('Novel')
    expect(draft.fiction).toBe(true)
    expect(draft.theme).toEqual([])
  })

  it('returns a new object on every call', () => {
    expect(makeDraft()).not.toBe(makeDraft())
  })
})

// ── Modal state ───────────────────────────────────────────────────────────────

describe('useBookCRUD — modal state', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('showBookModal starts as false', () => {
    const { result } = renderHook(() => useBookCRUD(makeParams()))
    expect(result.current.showBookModal).toBe(false)
  })

  it('openAddModal opens the modal, clears editingBook, and calls setBookDraft + onReset', () => {
    const params = makeParams()
    const { result } = renderHook(() => useBookCRUD(params))

    act(() => { result.current.openAddModal() })

    expect(result.current.showBookModal).toBe(true)
    expect(result.current.editingBook).toBeNull()
    expect(params.setBookDraft).toHaveBeenCalledOnce()
    expect(params.onReset).toHaveBeenCalledOnce()
  })

  it('openEditModal opens the modal, sets editingBook, and populates the draft from the book', () => {
    const book = {
      id: 'b-1', title: 'Dune', author: 'Frank Herbert',
      authors: [{ name: 'Frank Herbert' }],
      genre: ['Sci-Fi'], format: 'Novel', fiction: true,
      year_read_start: 2022, year_read_end: 2022, year: 2022,
      series: 'Dune', pages: 412, notes: '', cover_url: '', rating: 'loved',
    }
    const params = makeParams()
    const { result } = renderHook(() => useBookCRUD(params))

    act(() => { result.current.openEditModal(book) })

    expect(result.current.showBookModal).toBe(true)
    expect(result.current.editingBook).toBe(book)
    const draft = params.setBookDraft.mock.calls[0][0]
    expect(draft.title).toBe('Dune')
    expect(draft.authors).toEqual([{ name: 'Frank Herbert' }])
    expect(draft.yearStart).toBe(2022)
    expect(draft.rating).toBe('loved')
    expect(params.onReset).toHaveBeenCalledOnce()
  })
})

// ── Author suggestions ────────────────────────────────────────────────────────

describe('useBookCRUD — author suggestions', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('checkAuthorSuggestion sets null when input is an exact match (case-insensitive)', () => {
    const params = makeParams({ authorList: AUTHOR_LIST })
    const { result } = renderHook(() => useBookCRUD(params))

    act(() => { result.current.checkAuthorSuggestion(0, 'frank herbert') })

    expect(result.current.authorSuggestions[0]).toBeNull()
  })

  it('checkAuthorSuggestion sets a suggestion array on a fuzzy match', () => {
    const params = makeParams({ authorList: AUTHOR_LIST })
    const { result } = renderHook(() => useBookCRUD(params))

    act(() => { result.current.checkAuthorSuggestion(0, 'Frank Herbart') }) // one-char typo

    expect(result.current.authorSuggestions[0]).toBeTruthy()
    expect(result.current.authorSuggestions[0]).toContain('Frank Herbert')
  })

  it('acceptAuthorSuggestion writes the corrected name into the draft and clears the suggestion', () => {
    const params = makeParams({ authorList: AUTHOR_LIST })
    const { result } = renderHook(() => useBookCRUD(params))

    act(() => { result.current.checkAuthorSuggestion(0, 'Frank Herbart') })
    act(() => { result.current.acceptAuthorSuggestion(0, 'Frank Herbert') })

    expect(result.current.authorSuggestions[0]).toBeNull()
    // setBookDraft is called with an updater function
    const updater = params.setBookDraft.mock.calls.at(-1)[0]
    const updated = updater({ authors: [{ name: 'Frank Herbart' }] })
    expect(updated.authors[0].name).toBe('Frank Herbert')
  })

  it('dismissAuthorSuggestion clears the suggestion for that index', () => {
    const params = makeParams({ authorList: AUTHOR_LIST })
    const { result } = renderHook(() => useBookCRUD(params))

    act(() => { result.current.checkAuthorSuggestion(0, 'Frank Herbart') })
    expect(result.current.authorSuggestions[0]).toBeTruthy()

    act(() => { result.current.dismissAuthorSuggestion(0) })
    expect(result.current.authorSuggestions[0]).toBeNull()
  })
})

// ── saveBook — validation ─────────────────────────────────────────────────────

describe('useBookCRUD — saveBook validation', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('rejects when title is blank', async () => {
    const params = makeParams({ bookDraft: { ...makeDraft(), title: '  ', authors: [{ name: 'Herbert' }] } })
    const { result } = renderHook(() => useBookCRUD(params))

    await act(async () => { await result.current.saveBook() })

    expect(result.current.bookMsg).toContain('required')
    expect(db.insertBook).not.toHaveBeenCalled()
  })

  it('rejects when first author name is blank', async () => {
    const params = makeParams({ bookDraft: { ...makeDraft(), title: 'Dune', authors: [{ name: '' }] } })
    const { result } = renderHook(() => useBookCRUD(params))

    await act(async () => { await result.current.saveBook() })

    expect(result.current.bookMsg).toContain('required')
    expect(db.insertBook).not.toHaveBeenCalled()
  })

  it('rejects when yearStart > yearEnd', async () => {
    const params = makeParams({
      bookDraft: { ...makeDraft(), title: 'Dune', authors: [{ name: 'Herbert' }], yearStart: 2024, yearEnd: 2020 },
    })
    const { result } = renderHook(() => useBookCRUD(params))

    await act(async () => { await result.current.saveBook() })

    expect(result.current.bookMsg).toContain('Year Start')
    expect(db.insertBook).not.toHaveBeenCalled()
  })

  it('blocks save and shows suggestion when author name has a fuzzy match', async () => {
    const params = makeParams({
      bookDraft: { ...makeDraft(), title: 'Dune', authors: [{ name: 'Frank Herbart' }], yearStart: 2022, yearEnd: 2022 },
      authorList: ['Frank Herbert'],
    })
    const { result } = renderHook(() => useBookCRUD(params))

    await act(async () => { await result.current.saveBook() })

    expect(result.current.bookMsg).toContain('author name suggestion')
    expect(db.insertBook).not.toHaveBeenCalled()
  })
})

// ── saveBook — add path ───────────────────────────────────────────────────────

describe('useBookCRUD — saveBook (add)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('inserts the book, calls setBooks, sets lastAddedAt, and shows success message', async () => {
    const newBook = { id: 'new-1', title: 'Dune', user_id: 'u-1' }
    db.insertBook.mockResolvedValue({ data: newBook, error: null })
    resolveAuthorLinks.mockResolvedValue([{ author_order: 1, authors: { name: 'Frank Herbert' } }])
    normalizeBook.mockImplementation(b => ({ ...b, _normalized: true }))

    const setBooks = vi.fn()
    const params = makeParams({
      bookDraft: { ...makeDraft(), title: 'Dune', authors: [{ name: 'Frank Herbert' }], yearStart: 2022, yearEnd: 2022 },
      setBooks,
    })
    const { result } = renderHook(() => useBookCRUD(params))

    await act(async () => { await result.current.saveBook() })

    expect(db.insertBook).toHaveBeenCalledOnce()
    const payload = db.insertBook.mock.calls[0][0]
    expect(payload.title).toBe('Dune')
    expect(payload.user_id).toBe('u-1')
    expect(setBooks).toHaveBeenCalledOnce()
    expect(result.current.lastAddedAt).not.toBeNull()
    expect(result.current.bookMsg).toBe('✓ Book added!')
  })

  it('sets a generic error message on insert failure', async () => {
    db.insertBook.mockResolvedValue({ data: null, error: new Error('DB error') })

    const params = makeParams({
      bookDraft: { ...makeDraft(), title: 'Dune', authors: [{ name: 'Herbert' }], yearStart: 2022, yearEnd: 2022 },
    })
    const { result } = renderHook(() => useBookCRUD(params))

    await act(async () => { await result.current.saveBook() })

    expect(result.current.bookMsg).toBe('Something went wrong. Please try again.')
  })
})

// ── saveBook — edit path ──────────────────────────────────────────────────────

describe('useBookCRUD — saveBook (edit)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('updates the book record and patches books list with the normalized result', async () => {
    const existing = { id: 'b-1', title: 'Dune', author: 'Frank Herbert', genre: [], fiction: true }
    db.updateBook.mockResolvedValue({ error: null })
    db.deleteBookAuthors.mockResolvedValue({ error: null })
    resolveAuthorLinks.mockResolvedValue([{ author_order: 1, authors: { name: 'Frank Herbert' } }])
    normalizeBook.mockImplementation(b => ({ ...b, _normalized: true }))

    const books = [existing]
    const setBooks = vi.fn()
    // bookDraft contains what we want to save — setBookDraft is a mock so it won't change it
    const params = makeParams({
      bookDraft: { ...makeDraft(), title: 'Dune Revised', authors: [{ name: 'Frank Herbert' }], yearStart: 2022, yearEnd: 2022 },
      books,
      setBooks,
    })
    const { result } = renderHook(() => useBookCRUD(params))

    act(() => { result.current.openEditModal(existing) })   // sets editingBook state
    await act(async () => { await result.current.saveBook() })

    expect(db.updateBook).toHaveBeenCalledOnce()
    expect(db.updateBook.mock.calls[0][0]).toBe(existing.id)
    expect(db.updateBook.mock.calls[0][1].title).toBe('Dune Revised')
    expect(db.deleteBookAuthors).toHaveBeenCalledWith(existing.id)
    expect(setBooks).toHaveBeenCalledOnce()
    expect(result.current.bookMsg).toBe('✓ Book updated!')
  })
})

// ── updateBookRating ──────────────────────────────────────────────────────────

describe('useBookCRUD — updateBookRating', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('applies an optimistic update to the books list', async () => {
    const books = [{ id: 'b-1', title: 'Dune', rating: 'liked' }]
    db.updateBookRating.mockResolvedValue({ error: null })
    const setBooks = vi.fn()
    const params = makeParams({ books, setBooks })
    const { result } = renderHook(() => useBookCRUD(params))

    await act(async () => { await result.current.updateBookRating('b-1', 'loved') })

    expect(setBooks).toHaveBeenCalledOnce()
    const updater = setBooks.mock.calls[0][0]
    const updated = updater(books)
    expect(updated[0].rating).toBe('loved')
  })

  it('rolls back to the snapshot on database error', async () => {
    const books = [{ id: 'b-1', title: 'Dune', rating: 'liked' }]
    db.updateBookRating.mockResolvedValue({ error: new Error('DB fail') })
    const setBooks = vi.fn()
    const params = makeParams({ books, setBooks })
    const { result } = renderHook(() => useBookCRUD(params))

    await act(async () => { await result.current.updateBookRating('b-1', 'loved') })

    // First call: optimistic update. Second call: rollback to original snapshot.
    expect(setBooks).toHaveBeenCalledTimes(2)
    expect(setBooks.mock.calls[1][0]).toBe(books)
  })
})

// ── deleteBook ────────────────────────────────────────────────────────────────

describe('useBookCRUD — deleteBook', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('does nothing when editingBook is null', async () => {
    const { result } = renderHook(() => useBookCRUD(makeParams()))

    await act(async () => { await result.current.deleteBook() })

    expect(db.deleteBook).not.toHaveBeenCalled()
  })

  it('removes the book from state and closes the modal on success', async () => {
    const bookToDelete = { id: 'b-del', title: 'Test' }
    db.getBookAuthorLinks.mockResolvedValue({ data: [] })
    db.deleteBookAuthors.mockResolvedValue({ error: null })
    db.deleteBook.mockResolvedValue({ error: null })

    const books = [bookToDelete, { id: 'b-keep', title: 'Keep' }]
    const setBooks = vi.fn()
    const params = makeParams({ books, setBooks })
    const { result } = renderHook(() => useBookCRUD(params))

    act(() => { result.current.openEditModal(bookToDelete) })
    await act(async () => { await result.current.deleteBook() })

    expect(db.deleteBook).toHaveBeenCalledWith(bookToDelete.id)
    expect(result.current.showBookModal).toBe(false)
    const filterFn = setBooks.mock.calls.at(-1)[0]
    const remaining = filterFn(books)
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe('b-keep')
  })

  it('deletes orphaned authors whose book count drops to zero', async () => {
    const bookToDelete = { id: 'b-del', title: 'Test' }
    db.getBookAuthorLinks.mockResolvedValue({
      data: [{ author_id: 'a-orphan', authors: { name: 'Orphan Author' } }],
    })
    db.deleteBookAuthors.mockResolvedValue({ error: null })
    db.deleteBook.mockResolvedValue({ error: null })
    db.getAuthorBookCount.mockResolvedValue({ count: 0 })
    db.deleteAuthor.mockResolvedValue({ error: null })

    const setAuthorList = vi.fn()
    const params = makeParams({
      books: [bookToDelete],
      setBooks: vi.fn(),
      authorList: ['Orphan Author', 'Other Author'],
      setAuthorList,
    })
    const { result } = renderHook(() => useBookCRUD(params))

    act(() => { result.current.openEditModal(bookToDelete) })
    await act(async () => { await result.current.deleteBook() })

    expect(db.deleteAuthor).toHaveBeenCalledWith('a-orphan')
    expect(setAuthorList).toHaveBeenCalledOnce()
    const filterFn = setAuthorList.mock.calls[0][0]
    const remaining = filterFn(['Orphan Author', 'Other Author'])
    expect(remaining).not.toContain('Orphan Author')
    expect(remaining).toContain('Other Author')
  })

  it('does not delete authors still linked to other books', async () => {
    const bookToDelete = { id: 'b-del', title: 'Test' }
    db.getBookAuthorLinks.mockResolvedValue({
      data: [{ author_id: 'a-active', authors: { name: 'Active Author' } }],
    })
    db.deleteBookAuthors.mockResolvedValue({ error: null })
    db.deleteBook.mockResolvedValue({ error: null })
    db.getAuthorBookCount.mockResolvedValue({ count: 2 }) // still has other books

    const setAuthorList = vi.fn()
    const params = makeParams({ books: [bookToDelete], setBooks: vi.fn(), setAuthorList })
    const { result } = renderHook(() => useBookCRUD(params))

    act(() => { result.current.openEditModal(bookToDelete) })
    await act(async () => { await result.current.deleteBook() })

    expect(db.deleteAuthor).not.toHaveBeenCalled()
    expect(setAuthorList).not.toHaveBeenCalled()
  })

  it('sets a generic error message on delete failure', async () => {
    const bookToDelete = { id: 'b-fail', title: 'Fail' }
    db.getBookAuthorLinks.mockResolvedValue({ data: [] })
    db.deleteBookAuthors.mockResolvedValue({ error: null })
    db.deleteBook.mockResolvedValue({ error: new Error('DB fail') })

    const params = makeParams({ books: [bookToDelete], setBooks: vi.fn() })
    const { result } = renderHook(() => useBookCRUD(params))

    act(() => { result.current.openEditModal(bookToDelete) })
    await act(async () => { await result.current.deleteBook() })

    expect(result.current.bookMsg).toBe('Something went wrong. Please try again.')
  })
})
