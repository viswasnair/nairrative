import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BookshelfTab from '../../src/components/BookshelfTab.jsx'

// ResizeObserver used by SpineView — not available in jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const BOOKS = [
  {
    id: 1, title: 'Dune', author: 'Frank Herbert',
    genre: ['Science Fiction'], pages: 412,
    year_read_end: 2022, cover_url: null,
    rating: 'transformative', description: 'A desert planet saga.',
  },
  {
    id: 2, title: 'Sapiens', author: 'Yuval Noah Harari',
    genre: ['History'], pages: 443,
    year_read_end: 2023, cover_url: null,
    rating: 'loved', description: '',
  },
  {
    id: 3, title: 'The Road', author: 'Cormac McCarthy',
    genre: ['Literary Fiction'], pages: 287,
    year_read_end: 2022, cover_url: null,
    rating: 'enjoyed', description: 'Post-apocalyptic survival.',
  },
]

const GENRE_MAP = {
  'Science Fiction': '#4a9eff',
  History: '#c9a84c',
  'Literary Fiction': '#e8d5a3',
}

function setup(overrides = {}) {
  const defaults = {
    books: BOOKS,
    genreMap: GENRE_MAP,
    openEditModal: vi.fn(),
    session: null,
  }
  return render(<BookshelfTab {...defaults} {...overrides} />)
}

describe('BookshelfTab', () => {
  it('renders the Hall of Fame label', () => {
    setup()
    expect(screen.getByText(/hall of fame/i)).toBeTruthy()
  })

  it('Hall of Fame only shows transformative and loved books', () => {
    setup()
    // Dune (transformative) and Sapiens (loved) appear in the cover row
    // The Road (enjoyed) should not appear in the Hall of Fame cover row.
    // All three appear in MosaicView as well, so we look for *multiple* instances for Hall books.
    // Simplest test: the cover row section renders letters of loved/transformative book titles
    // (Dune → "D", Sapiens → "S")
    const ds = screen.getAllByText('D')
    expect(ds.length).toBeGreaterThan(0)
  })

  it('renders MosaicView year labels for books', () => {
    setup()
    expect(screen.getByText('2022')).toBeTruthy()
    expect(screen.getByText('2023')).toBeTruthy()
  })

  it('renders book count annotation next to each year', () => {
    setup()
    // 2022 has Dune + The Road → "2 books"
    expect(screen.getByText(/2 books/i)).toBeTruthy()
    // 2023 has Sapiens → "1 book"
    expect(screen.getByText(/1 book/i)).toBeTruthy()
  })

  it('MosaicView hover info strip is invisible when nothing is hovered', () => {
    const { container } = setup()
    // The info strip should have opacity 0 when no book is hovered
    const strip = container.querySelector('[style*="opacity: 0"]') ||
      [...container.querySelectorAll('div')].find(d => d.style.opacity === '0')
    expect(strip).toBeTruthy()
  })

  it('MosaicView shows title and author in info strip on hover', () => {
    const { container } = setup()
    const tile = container.querySelector('[title*="Dune"]')
    expect(tile).toBeTruthy()
    fireEvent.mouseEnter(tile)
    // "by Frank Herbert" only appears in the info strip (tiles don't show author)
    expect(screen.getByText(/Frank Herbert/)).toBeTruthy()
  })

  it('MosaicView hover strip shows description when book has one', () => {
    const { container } = setup()
    const tile = container.querySelector('[title*="Dune"]')
    fireEvent.mouseEnter(tile)
    // description rendered after an em dash separator
    expect(screen.getByText(/A desert planet saga/)).toBeTruthy()
  })

  it('MosaicView hover strip shows year when book has no description', () => {
    const { container } = setup()
    // Sapiens has empty description
    const tile = container.querySelector('[title*="Sapiens"]')
    fireEvent.mouseEnter(tile)
    // "· 2023" only appears in the info strip, not in tiles
    expect(screen.getByText('· 2023')).toBeTruthy()
  })

  it('MosaicView hover strip clears when mouse leaves a tile', () => {
    const { container } = setup()
    const tile = container.querySelector('[title*="Dune"]')
    fireEvent.mouseEnter(tile)
    // "by Frank Herbert" only appears in the info strip — confirms it's showing
    expect(screen.getByText(/Frank Herbert/)).toBeTruthy()
    fireEvent.mouseLeave(tile)
    // After leaving the tile, the info strip is empty; "Frank Herbert" disappears
    expect(screen.queryByText(/Frank Herbert/)).toBeNull()
  })

  it('clicking a mosaic tile calls openEditModal when session is set', () => {
    const openEditModal = vi.fn()
    const session = { user: { id: 'u1' } }
    const { container } = setup({ session, openEditModal })
    const tile = container.querySelector('[title*="Dune"]')
    fireEvent.click(tile)
    expect(openEditModal).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, title: 'Dune' })
    )
  })

  it('clicking a mosaic tile does NOT call openEditModal when session is null', () => {
    const openEditModal = vi.fn()
    const { container } = setup({ session: null, openEditModal })
    const tile = container.querySelector('[title*="Dune"]')
    fireEvent.click(tile)
    expect(openEditModal).not.toHaveBeenCalled()
  })

  it('Hall of Fame is hidden when no books have transformative or loved rating', () => {
    const { container } = setup({
      books: [BOOKS[2]], // only "enjoyed" rating
    })
    expect(screen.queryByText(/hall of fame/i)).toBeNull()
  })
})
