import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LibraryTab from '../../src/components/LibraryTab.jsx'

vi.mock('../../src/components/BookshelfTab.jsx', () => ({
  default: () => <div data-testid="bookshelf-tab" />,
}))

vi.mock('../../src/components/MultiSelect.jsx', () => ({
  default: ({ placeholder }) => <div data-testid={`multiselect-${placeholder}`} />,
}))

vi.mock('../../src/lib/bookUtils.js', () => ({
  downloadCSV:  vi.fn(),
  downloadJSON: vi.fn(),
  normalizeBook: vi.fn(b => b),
  stripMd:      vi.fn(s => s),
}))

import { downloadCSV, downloadJSON } from '../../src/lib/bookUtils.js'

const BOOKS = [
  {
    id: 1, title: 'Dune', author: 'Frank Herbert',
    authors: [{ name: 'Frank Herbert' }],
    genre: ['Science Fiction'], format: 'Novel',
    fiction: true, pages: 412, year_read_start: 2022, year_read_end: 2022,
    rating: 'loved', cover_url: null,
  },
  {
    id: 2, title: 'Sapiens', author: 'Yuval Noah Harari',
    authors: [{ name: 'Yuval Noah Harari' }],
    genre: ['History'], format: 'Non-Fiction',
    fiction: false, pages: 443, year_read_start: 2023, year_read_end: 2023,
    rating: null, cover_url: null,
  },
]

const GENRE_MAP = { 'Science Fiction': '#4a9eff', History: '#c9a84c' }

function setup(overrides = {}) {
  const defaults = {
    books:         BOOKS,
    session:       null,
    genreMap:      GENRE_MAP,
    filteredBooks: BOOKS,
    search: '', setSearch: vi.fn(),
    libGenres: [], setLibGenres: vi.fn(),
    libYears:  [], setLibYears:  vi.fn(),
    libAuthors:[], setLibAuthors:vi.fn(),
    libCountries: [], setLibCountries: vi.fn(),
    libFormats: [], setLibFormats: vi.fn(),
    libSort: 'year', setLibSort: vi.fn(),
    allGenres:  ['Science Fiction', 'History'],
    allYears:   [2022, 2023],
    allAuthors: ['Frank Herbert', 'Yuval Noah Harari'],
    allCountries: ['United States', 'Israel'],
    allFormats: ['Non-Fiction', 'Novel'],
    openAddModal:   vi.fn(),
    openEditModal:  vi.fn(),
    openRatingMode: vi.fn(),
  }
  return render(<LibraryTab {...defaults} {...overrides} />)
}

describe('LibraryTab', () => {
  it('renders List and Bookshelf nav buttons', () => {
    setup()
    expect(screen.getByText('List')).toBeTruthy()
    expect(screen.getByText('Bookshelf')).toBeTruthy()
  })

  it('default subtab shows the book table, not BookshelfTab', () => {
    setup()
    expect(screen.queryByTestId('bookshelf-tab')).toBeNull()
    expect(screen.getByText('Dune')).toBeTruthy()
  })

  it('clicking Bookshelf renders the BookshelfTab', () => {
    setup()
    fireEvent.click(screen.getByText('Bookshelf'))
    expect(screen.getByTestId('bookshelf-tab')).toBeTruthy()
  })

  it('book rows show title and author', () => {
    setup()
    expect(screen.getByText('Dune')).toBeTruthy()
    expect(screen.getByText('Frank Herbert')).toBeTruthy()
    expect(screen.getByText('Sapiens')).toBeTruthy()
  })

  it('renders format values for each book', () => {
    setup()
    expect(screen.getByText('Novel')).toBeTruthy()
    // 'Non-Fiction' appears in both the format column and the fiction/type column for Sapiens
    expect(screen.getAllByText('Non-Fiction').length).toBeGreaterThan(0)
  })

  it('shows empty-state message when filteredBooks is empty', () => {
    setup({ filteredBooks: [] })
    expect(screen.getByText('No books match your filters.')).toBeTruthy()
  })

  it('+ Add Book is dimmed when session is null', () => {
    setup({ session: null })
    const btn = screen.getByText('+ Add Book').closest('button')
    expect(btn.style.opacity).toBe('0.35')
  })

  it('+ Add Book calls openAddModal when session is present', () => {
    const openAddModal = vi.fn()
    const session = { user: { id: 'u1' } }
    setup({ session, openAddModal })
    fireEvent.click(screen.getByText('+ Add Book'))
    expect(openAddModal).toHaveBeenCalledTimes(1)
  })

  it('⚡ Rate Library is dimmed when session is null', () => {
    setup({ session: null })
    const btn = screen.getByText('⚡ Rate Library').closest('button')
    expect(btn.style.opacity).toBe('0.35')
  })

  it('↓ CSV button calls downloadCSV', () => {
    setup()
    fireEvent.click(screen.getByText('↓ CSV'))
    expect(downloadCSV).toHaveBeenCalledWith(BOOKS)
  })

  it('↓ JSON button calls downloadJSON', () => {
    setup()
    fireEvent.click(screen.getByText('↓ JSON'))
    expect(downloadJSON).toHaveBeenCalledWith(BOOKS)
  })

  it('edit pencil button calls openEditModal with the correct book', () => {
    const openEditModal = vi.fn()
    const session = { user: { id: 'u1' } }
    setup({ session, openEditModal })
    const editButtons = screen.getAllByText('✎')
    fireEvent.click(editButtons[0])
    expect(openEditModal).toHaveBeenCalledWith(BOOKS[0])
  })

  it('description hover strip shows book description on mouse enter', () => {
    const books = [
      { ...BOOKS[0], description: 'An epic desert saga.' },
    ]
    setup({ filteredBooks: books, books })
    const row = screen.getByText('Dune').closest('.lib-row')
    fireEvent.mouseEnter(row)
    expect(screen.getByText('An epic desert saga.')).toBeTruthy()
  })

  it('description hover strip shows "No description yet." when book has no description', () => {
    const books = [
      { ...BOOKS[0], description: '' },
    ]
    setup({ filteredBooks: books, books })
    const row = screen.getByText('Dune').closest('.lib-row')
    fireEvent.mouseEnter(row)
    expect(screen.getByText('No description yet.')).toBeTruthy()
  })

  it('description hover strip clears on mouse leave', () => {
    const books = [
      { ...BOOKS[0], description: 'An epic desert saga.' },
    ]
    setup({ filteredBooks: books, books })
    const row = screen.getByText('Dune').closest('.lib-row')
    fireEvent.mouseEnter(row)
    expect(screen.getByText('An epic desert saga.')).toBeTruthy()
    fireEvent.mouseLeave(row)
    expect(screen.queryByText('An epic desert saga.')).toBeNull()
  })
})
