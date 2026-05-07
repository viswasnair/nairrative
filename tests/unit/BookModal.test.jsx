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

  it('Search covers button triggers fetch to OpenLibrary', async () => {
    const draft = { ...DRAFT, title: 'Dune' }
    render(<BookModal {...makeProps({ bookDraft: draft })} />)
    await act(async () => {
      fireEvent.click(screen.getByText('Search covers'))
    })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('openlibrary.org/search.json')
    )
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
})
