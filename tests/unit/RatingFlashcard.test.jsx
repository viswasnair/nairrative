import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RatingFlashcard from '../../src/components/RatingFlashcard.jsx'

// Use fake timers so the flash setTimeout doesn't fire after tests end
beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

// Queue is sorted by year_read_end DESC: Dune(2023) → Sapiens(2022) → 1984(2021)
const UNRATED = [
  { id: 1, title: 'Dune',    author: 'Frank Herbert',     year_read_end: 2023, rating: null, genre: ['Science Fiction'], pages: 412 },
  { id: 2, title: 'Sapiens', author: 'Yuval Harari',      year_read_end: 2022, rating: null, genre: [] },
  { id: 3, title: '1984',    author: 'George Orwell',     year_read_end: 2021, rating: null },
]

const RATED = [
  { id: 4, title: 'Meditations', author: 'Marcus Aurelius', year_read_end: 2020, rating: 'loved' },
]

function setup(overrides = {}) {
  return render(
    <RatingFlashcard
      books={UNRATED}
      updateBookRating={vi.fn()}
      onClose={vi.fn()}
      {...overrides}
    />
  )
}

describe('RatingFlashcard', () => {
  it('renders "Rate Your Library" heading', () => {
    setup()
    expect(screen.getByText('Rate Your Library')).toBeTruthy()
  })

  it('shows the first unrated book sorted newest first', () => {
    setup()
    expect(screen.getByText('Dune')).toBeTruthy()
    expect(screen.getByText('Frank Herbert')).toBeTruthy()
  })

  it('progress counter shows "1 / total" for unrated books only', () => {
    // Mix of rated and unrated — counter should reflect unrated count only
    setup({ books: [...UNRATED, ...RATED] })
    expect(screen.getByText('1 / 3')).toBeTruthy()
  })

  it('renders all 7 tier buttons', () => {
    setup()
    for (const label of ['Transformative', 'Loved', 'Enjoyed', 'Meh', "Don't Remember", 'Dropped', "Didn't Like"]) {
      expect(screen.getByText(label)).toBeTruthy()
    }
  })

  it('clicking a tier button calls updateBookRating with book id and rating value', () => {
    const updateBookRating = vi.fn()
    setup({ updateBookRating })
    fireEvent.click(screen.getByText('Loved').closest('button'))
    expect(updateBookRating).toHaveBeenCalledWith(1, 'loved')
  })

  it('clicking a tier button advances to the next book', () => {
    setup()
    fireEvent.click(screen.getByText('Loved').closest('button'))
    expect(screen.getByText('Sapiens')).toBeTruthy()
    expect(screen.getByText('2 / 3')).toBeTruthy()
  })

  it('Skip button advances without calling updateBookRating', () => {
    const updateBookRating = vi.fn()
    setup({ updateBookRating })
    fireEvent.click(screen.getByText(/Skip/))
    expect(updateBookRating).not.toHaveBeenCalled()
    expect(screen.getByText('Sapiens')).toBeTruthy()
  })

  it('pressing a digit key (1–7) calls advance with the matching rating', () => {
    const updateBookRating = vi.fn()
    setup({ updateBookRating })
    fireEvent.keyDown(window, { key: '1' })
    expect(updateBookRating).toHaveBeenCalledWith(1, 'transformative')
  })

  it('pressing "2" key calls advance with "loved"', () => {
    const updateBookRating = vi.fn()
    setup({ updateBookRating })
    fireEvent.keyDown(window, { key: '2' })
    expect(updateBookRating).toHaveBeenCalledWith(1, 'loved')
  })

  it('pressing Space skips the current book without rating it', () => {
    const updateBookRating = vi.fn()
    setup({ updateBookRating })
    fireEvent.keyDown(window, { key: ' ' })
    expect(updateBookRating).not.toHaveBeenCalled()
    expect(screen.getByText('Sapiens')).toBeTruthy()
  })

  it('pressing Enter skips the current book without rating it', () => {
    const updateBookRating = vi.fn()
    setup({ updateBookRating })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(updateBookRating).not.toHaveBeenCalled()
    expect(screen.getByText('Sapiens')).toBeTruthy()
  })

  it('pressing Escape calls onClose', () => {
    const onClose = vi.fn()
    setup({ onClose })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('× button in the header calls onClose', () => {
    const onClose = vi.fn()
    setup({ onClose })
    fireEvent.click(screen.getByText('×'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows "All done!" immediately when all books are already rated', () => {
    setup({ books: RATED })
    expect(screen.getByText('All done!')).toBeTruthy()
  })

  it('shows "All done!" with rated count after exhausting the queue', () => {
    setup({ books: UNRATED.slice(0, 1) })         // queue of 1
    fireEvent.click(screen.getByText('Loved').closest('button'))
    expect(screen.getByText('All done!')).toBeTruthy()
    expect(screen.getByText(/You rated 1 book this session/)).toBeTruthy()
  })

  it('"Close" button in the done state calls onClose', () => {
    const onClose = vi.fn()
    setup({ books: RATED, onClose })
    fireEvent.click(screen.getByText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('rated count message uses plural for more than one book', () => {
    setup({ books: UNRATED.slice(0, 2) })         // queue of 2
    fireEvent.click(screen.getByText('Loved').closest('button'))
    fireEvent.click(screen.getByText('Enjoyed').closest('button'))
    expect(screen.getByText(/You rated 2 books this session/)).toBeTruthy()
  })

  it('genre tags and page count render on the book card', () => {
    setup()
    expect(screen.getByText(/Science Fiction/)).toBeTruthy()
    expect(screen.getByText(/412pp/)).toBeTruthy()
  })

  it('book with cover_url renders an img element instead of first-letter placeholder', () => {
    const booksWithCover = [
      { id: 1, title: 'Dune', author: 'Frank Herbert', year_read_end: 2023, rating: null, cover_url: 'https://example.com/cover.jpg' },
    ]
    const { container } = setup({ books: booksWithCover })
    expect(container.querySelector('img')).toBeTruthy()
  })

  it('book without pages shows no page count', () => {
    const booksNoPages = [
      { id: 1, title: 'Dune', author: 'Frank Herbert', year_read_end: 2023, rating: null, genre: [] },
    ]
    setup({ books: booksNoPages })
    expect(screen.queryByText(/\d+pp/)).toBeNull()
  })

  it('book without year_read_end shows no year', () => {
    const booksNoYear = [
      { id: 1, title: 'Dune', author: 'Frank Herbert', rating: null, genre: [] },
    ]
    setup({ books: booksNoYear })
    // No year rendered in the card info area
    expect(screen.queryByText(/202/)).toBeNull()
  })

  it('done state shows "still unrated" count when queue was not fully rated', () => {
    // 2-book queue: rate one, skip one — total - rated = 1 still unrated
    setup({ books: UNRATED.slice(0, 2) })
    fireEvent.click(screen.getByText('Loved').closest('button'))  // rate book 1
    fireEvent.click(screen.getByText(/Skip/))                     // skip book 2
    expect(screen.getByText(/1 still unrated/)).toBeTruthy()
  })

  it('clicking the modal overlay calls onClose', () => {
    const onClose = vi.fn()
    const { container } = setup({ onClose })
    const overlay = container.querySelector('.modal-overlay')
    // Simulate a click where target === currentTarget (clicking the overlay itself)
    fireEvent.click(overlay, { bubbles: true })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
