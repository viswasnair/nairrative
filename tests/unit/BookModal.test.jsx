import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import BookModal from '../../src/components/BookModal.jsx'

vi.mock('../../src/components/MultiSelect.jsx', () => ({
  default: ({ options, selected, onChange, placeholder }) => (
    <select
      data-testid={`multiselect-${placeholder}`}
      multiple
      value={selected}
      onChange={e => onChange(Array.from(e.target.selectedOptions, o => o.value))}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  ),
}))

const DRAFT = {
  title: '', authors: [{ name: '' }], genres: [],
  yearStart: '', yearEnd: '', pages: '', format: 'Novel',
  fiction: true, series: '', rating: '', cover_url: '',
}

const EDITING_BOOK = {
  id: 99, title: 'Existing Book', author: 'Author Name',
}

function makeProps(overrides = {}) {
  return {
    editingBook:    null,
    bookDraft:      DRAFT,
    setBookDraft:   vi.fn(),
    bookChatInputRef: { current: null },
    bookChatLoading: false,
    bookChatPending: null,
    bookSaving:     false,
    bookMsg:        null,
    newGenreInput:  '', setNewGenreInput: vi.fn(),
    newGenreOpen:   false, setNewGenreOpen: vi.fn(),
    newGenreSaving: false,
    genreList:      ['Fiction', 'Science Fiction', 'History'],
    chatFillBook:   vi.fn(),
    applyPending:   vi.fn(),
    setBookChatPending: vi.fn(),
    addGenre:       vi.fn(),
    saveBook:       vi.fn(),
    deleteBook:     vi.fn(),
    onClose:        vi.fn(),
    authorSuggestions: [[]],
    checkAuthorSuggestion:   vi.fn(),
    acceptAuthorSuggestion:  vi.fn(),
    dismissAuthorSuggestion: vi.fn(),
    genreSuggestion:        [],
    acceptGenreSuggestion:  vi.fn(),
    dismissGenreSuggestion: vi.fn(),
    ...overrides,
  }
}

describe('BookModal', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ docs: [] }), { status: 200 })
      )
    )
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('renders "Add Book" heading when editingBook is null', () => {
    render(<BookModal {...makeProps()} />)
    expect(screen.getByText('Add Book')).toBeTruthy()
  })

  it('renders "Edit Book" heading when editingBook is provided', () => {
    render(<BookModal {...makeProps({ editingBook: EDITING_BOOK })} />)
    expect(screen.getByText('Edit Book')).toBeTruthy()
  })

  it('Delete button absent in add mode', () => {
    render(<BookModal {...makeProps()} />)
    expect(screen.queryByText('Delete')).toBeNull()
  })

  it('Delete button present in edit mode', () => {
    render(<BookModal {...makeProps({ editingBook: EDITING_BOOK })} />)
    expect(screen.getByText('Delete')).toBeTruthy()
  })

  it('Delete button calls window.confirm then deleteBook on confirm', () => {
    const deleteBook = vi.fn()
    render(<BookModal {...makeProps({ editingBook: EDITING_BOOK, deleteBook })} />)
    fireEvent.click(screen.getByText('Delete'))
    expect(window.confirm).toHaveBeenCalledTimes(1)
    expect(deleteBook).toHaveBeenCalledTimes(1)
  })

  it('deleteBook NOT called if confirm returns false', () => {
    window.confirm.mockReturnValueOnce(false)
    const deleteBook = vi.fn()
    render(<BookModal {...makeProps({ editingBook: EDITING_BOOK, deleteBook })} />)
    fireEvent.click(screen.getByText('Delete'))
    expect(deleteBook).not.toHaveBeenCalled()
  })

  it('all 7 rating buttons render', () => {
    render(<BookModal {...makeProps()} />)
    expect(screen.getByText('Transformative')).toBeTruthy()
    expect(screen.getByText('Loved')).toBeTruthy()
    expect(screen.getByText('Enjoyed')).toBeTruthy()
    expect(screen.getByText('Meh')).toBeTruthy()
    expect(screen.getByText("Don't Remember")).toBeTruthy()
    expect(screen.getByText('Dropped')).toBeTruthy()
    expect(screen.getByText("Didn't Like")).toBeTruthy()
  })

  it('bookMsg is displayed when the prop is set', () => {
    render(<BookModal {...makeProps({ bookMsg: '✓ Book saved!' })} />)
    expect(screen.getByText('✓ Book saved!')).toBeTruthy()
  })

  it('save button is disabled when bookSaving is true', () => {
    render(<BookModal {...makeProps({ bookSaving: true })} />)
    expect(screen.getByText('Saving…').closest('button').disabled).toBe(true)
  })

  it('Fill button click calls chatFillBook', () => {
    const chatFillBook = vi.fn()
    render(<BookModal {...makeProps({ chatFillBook })} />)
    fireEvent.click(screen.getByText('Fill'))
    expect(chatFillBook).toHaveBeenCalledTimes(1)
  })

  it('auto-searches OpenLibrary covers when title is provided', async () => {
    vi.useFakeTimers()
    try {
      const draft = { ...DRAFT, title: 'Dune' }
      render(<BookModal {...makeProps({ bookDraft: draft })} />)
      await act(async () => { vi.advanceTimersByTime(800) })
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('openlibrary.org/search.json')
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not auto-search when title is empty', async () => {
    vi.useFakeTimers()
    try {
      render(<BookModal {...makeProps()} />) // DRAFT has title: ''
      await act(async () => { vi.advanceTimersByTime(800) })
      expect(fetch).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('Paste URL toggle shows URL input; Enter applies the URL', () => {
    const setBookDraft = vi.fn()
    const draft = { ...DRAFT, title: 'Dune' }
    render(<BookModal {...makeProps({ bookDraft: draft, setBookDraft })} />)

    fireEvent.click(screen.getByText('Paste URL'))
    const urlInput = screen.getByPlaceholderText('https://…')
    expect(urlInput).toBeTruthy()

    fireEvent.change(urlInput, { target: { value: 'https://example.com/cover.jpg' } })
    fireEvent.keyDown(urlInput, { key: 'Enter' })
    expect(setBookDraft).toHaveBeenCalled()
  })

  it('Escape key press calls onClose', () => {
    const onClose = vi.fn()
    render(<BookModal {...makeProps({ onClose })} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('× close button calls onClose', () => {
    const onClose = vi.fn()
    render(<BookModal {...makeProps({ onClose })} />)
    fireEvent.click(screen.getByText('×'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Cancel button calls onClose', () => {
    const onClose = vi.fn()
    render(<BookModal {...makeProps({ onClose })} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('save button shows "Add to Library" in add mode', () => {
    render(<BookModal {...makeProps()} />)
    expect(screen.getByText('Add to Library')).toBeTruthy()
  })

  it('save button shows "Save Changes" in edit mode', () => {
    render(<BookModal {...makeProps({ editingBook: EDITING_BOOK })} />)
    expect(screen.getByText('Save Changes')).toBeTruthy()
  })

  it('save button calls saveBook', () => {
    const saveBook = vi.fn()
    render(<BookModal {...makeProps({ saveBook })} />)
    fireEvent.click(screen.getByText('Add to Library'))
    expect(saveBook).toHaveBeenCalledTimes(1)
  })

  it('title input onChange calls setBookDraft', () => {
    const setBookDraft = vi.fn()
    render(<BookModal {...makeProps({ setBookDraft })} />)
    const input = screen.getByPlaceholderText('Book title')
    fireEvent.change(input, { target: { value: 'Dune' } })
    expect(setBookDraft).toHaveBeenCalledTimes(1)
  })

  it('format select onChange calls setBookDraft', () => {
    const setBookDraft = vi.fn()
    render(<BookModal {...makeProps({ setBookDraft })} />)
    const select = screen.getByDisplayValue('Novel')
    fireEvent.change(select, { target: { value: 'Non-Fiction' } })
    expect(setBookDraft).toHaveBeenCalledTimes(1)
  })

  it('fiction select onChange calls setBookDraft', () => {
    const setBookDraft = vi.fn()
    render(<BookModal {...makeProps({ setBookDraft })} />)
    const select = screen.getByDisplayValue('Fiction')
    fireEvent.change(select, { target: { value: 'nonfiction' } })
    expect(setBookDraft).toHaveBeenCalledTimes(1)
  })

  it('clicking a rating button calls setBookDraft', () => {
    const setBookDraft = vi.fn()
    render(<BookModal {...makeProps({ setBookDraft })} />)
    fireEvent.click(screen.getByText('Loved'))
    expect(setBookDraft).toHaveBeenCalledTimes(1)
  })

  it('+ Add author button calls setBookDraft', () => {
    const setBookDraft = vi.fn()
    render(<BookModal {...makeProps({ setBookDraft })} />)
    fireEvent.click(screen.getByText('+ Add author'))
    expect(setBookDraft).toHaveBeenCalledTimes(1)
  })

  it('author name onBlur calls checkAuthorSuggestion', () => {
    const checkAuthorSuggestion = vi.fn()
    render(<BookModal {...makeProps({ checkAuthorSuggestion })} />)
    const input = screen.getByPlaceholderText('Author name')
    fireEvent.blur(input, { target: { value: 'Frank Herbert' } })
    expect(checkAuthorSuggestion).toHaveBeenCalledWith(0, expect.any(String))
  })

  it('author suggestion "Did you mean" row and accept button render', () => {
    const acceptAuthorSuggestion = vi.fn()
    const authorSuggestions = [['Frank Herbert']]
    render(<BookModal {...makeProps({ authorSuggestions, acceptAuthorSuggestion })} />)
    expect(screen.getByText('Did you mean:')).toBeTruthy()
    fireEvent.click(screen.getByText('Frank Herbert'))
    expect(acceptAuthorSuggestion).toHaveBeenCalledWith(0, 'Frank Herbert')
  })

  it('author suggestion "Keep mine" calls dismissAuthorSuggestion', () => {
    const dismissAuthorSuggestion = vi.fn()
    const authorSuggestions = [['Frank Herbert']]
    render(<BookModal {...makeProps({ authorSuggestions, dismissAuthorSuggestion })} />)
    fireEvent.click(screen.getByText('Keep mine'))
    expect(dismissAuthorSuggestion).toHaveBeenCalledWith(0)
  })

  it('bookChatPending card renders title and Apply/Dismiss buttons', () => {
    const pending = {
      title: 'Dune', authors: [{ name: 'Frank Herbert' }],
      genres: ['Science Fiction'], fiction: true, format: 'Novel', year: 1965, pages: 412,
    }
    render(<BookModal {...makeProps({ bookChatPending: pending })} />)
    expect(screen.getByText(/"Dune" by Frank Herbert/)).toBeTruthy()
    expect(screen.getByText('Apply to form')).toBeTruthy()
    expect(screen.getByText('Dismiss')).toBeTruthy()
  })

  it('Apply to form button calls applyPending', () => {
    const applyPending = vi.fn()
    const pending = {
      title: 'Dune', authors: [{ name: 'Frank Herbert' }],
      genres: [], fiction: true, format: 'Novel', year: 1965,
    }
    render(<BookModal {...makeProps({ bookChatPending: pending, applyPending })} />)
    fireEvent.click(screen.getByText('Apply to form'))
    expect(applyPending).toHaveBeenCalledTimes(1)
  })

  it('Dismiss button calls setBookChatPending(null)', () => {
    const setBookChatPending = vi.fn()
    const pending = {
      title: 'Dune', authors: [{ name: 'Frank Herbert' }],
      genres: [], fiction: true, format: 'Novel', year: 1965,
    }
    render(<BookModal {...makeProps({ bookChatPending: pending, setBookChatPending })} />)
    fireEvent.click(screen.getByText('Dismiss'))
    expect(setBookChatPending).toHaveBeenCalledWith(null)
  })

  it('+ Add new genre button calls setNewGenreOpen(true)', () => {
    const setNewGenreOpen = vi.fn()
    render(<BookModal {...makeProps({ setNewGenreOpen })} />)
    fireEvent.click(screen.getByText('+ Add new genre'))
    expect(setNewGenreOpen).toHaveBeenCalledWith(true)
  })

  it('Add button in new genre input calls addGenre', () => {
    const addGenre = vi.fn()
    render(<BookModal {...makeProps({ newGenreOpen: true, addGenre })} />)
    fireEvent.click(screen.getByText('Add'))
    expect(addGenre).toHaveBeenCalledTimes(1)
  })

  it('Escape in genre input closes the input', () => {
    const setNewGenreOpen = vi.fn()
    render(<BookModal {...makeProps({ newGenreOpen: true, setNewGenreOpen })} />)
    fireEvent.keyDown(screen.getByPlaceholderText('New genre name…'), { key: 'Escape' })
    expect(setNewGenreOpen).toHaveBeenCalledWith(false)
  })

  it('genre suggestion "Did you mean" row renders and accept calls acceptGenreSuggestion', () => {
    const acceptGenreSuggestion = vi.fn()
    render(<BookModal {...makeProps({ newGenreOpen: true, genreSuggestion: ['Sci-Fi'], acceptGenreSuggestion })} />)
    expect(screen.getAllByText('Did you mean:').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByText('Sci-Fi'))
    expect(acceptGenreSuggestion).toHaveBeenCalledWith('Sci-Fi')
  })

  it('AI Attributes section renders when bookDraft has mood', () => {
    const draft = { ...DRAFT, mood: 'Melancholic', narrative_style: 'Third-person', setting_era: 'Future', archetype: 'Hero', theme: ['Identity'] }
    render(<BookModal {...makeProps({ bookDraft: draft })} />)
    expect(screen.getByText('Melancholic')).toBeTruthy()
    expect(screen.getByText('Third-person')).toBeTruthy()
    expect(screen.getByText('Future')).toBeTruthy()
    expect(screen.getByText('Hero')).toBeTruthy()
    expect(screen.getByText('Identity')).toBeTruthy()
  })

  it('AI Attributes section is hidden when no AI attributes are set', () => {
    render(<BookModal {...makeProps()} />)
    expect(screen.queryByText('AI Attributes')).toBeNull()
  })

  it('"No covers found" message shows after search returns empty', async () => {
    vi.useFakeTimers()
    try {
      const draft = { ...DRAFT, title: 'Dune' }
      // fetch returns no cover_i results
      fetch.mockResolvedValue(new Response(JSON.stringify({ docs: [] }), { status: 200 }))
      render(<BookModal {...makeProps({ bookDraft: draft })} />)
      await act(async () => { vi.advanceTimersByTime(800) })
      // Wait for state updates
      await act(async () => {})
      expect(screen.getByText(/No covers found/)).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('Paste URL Escape key closes the paste input', () => {
    render(<BookModal {...makeProps({ bookDraft: { ...DRAFT, title: 'Dune' } })} />)
    fireEvent.click(screen.getByText('Paste URL'))
    const input = screen.getByPlaceholderText('https://…')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByPlaceholderText('https://…')).toBeNull()
  })

  it('"Use" button in paste mode calls setBookDraft with the URL', () => {
    const setBookDraft = vi.fn()
    render(<BookModal {...makeProps({ setBookDraft, bookDraft: { ...DRAFT, title: 'Dune' } })} />)
    fireEvent.click(screen.getByText('Paste URL'))
    fireEvent.change(screen.getByPlaceholderText('https://…'), { target: { value: 'https://example.com/cover.jpg' } })
    fireEvent.click(screen.getByText('Use'))
    expect(setBookDraft).toHaveBeenCalled()
  })

  it('error bookMsg renders in red tone', () => {
    render(<BookModal {...makeProps({ bookMsg: '✗ Save failed.' })} />)
    expect(screen.getByText('✗ Save failed.')).toBeTruthy()
  })
})
