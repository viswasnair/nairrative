import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { stripMd, normalizeBook, buildBookContext, downloadCSV, downloadJSON } from '../../src/lib/bookUtils.js'

// ── stripMd ──────────────────────────────────────────────────────────────────

describe('stripMd', () => {
  it('strips bold markers (**text**)', () => {
    expect(stripMd('This is **bold** text')).toBe('This is bold text')
  })

  it('strips italic markers (*text*)', () => {
    expect(stripMd('This is *italic* text')).toBe('This is italic text')
  })

  it('strips underscore bold/italic (__text__ and _text_)', () => {
    expect(stripMd('__bold__ and _italic_')).toBe('bold and italic')
  })

  it('strips heading markers (# through ######)', () => {
    expect(stripMd('## Section Title')).toBe('Section Title')
    expect(stripMd('#### Deep Heading')).toBe('Deep Heading')
  })

  it('strips inline code backticks (`code`)', () => {
    expect(stripMd('Use `npm install` to install')).toBe('Use npm install to install')
  })

  it('strips list markers (- and * and +)', () => {
    expect(stripMd('- First item\n- Second item')).toBe('First item\nSecond item')
    expect(stripMd('* Bullet item')).toBe('Bullet item')
  })

  it('returns plain text unchanged', () => {
    const plain = 'No markdown here at all.'
    expect(stripMd(plain)).toBe(plain)
  })

  it('handles empty string', () => {
    expect(stripMd('')).toBe('')
  })

  it('handles multiline bold/italic spanning content', () => {
    expect(stripMd('**line one\nline two**')).toBe('line one\nline two')
  })
})

// ── normalizeBook ─────────────────────────────────────────────────────────────

describe('normalizeBook', () => {
  it('flattens a single author', () => {
    const raw = {
      id: 1,
      title: 'Dune',
      year_read_end: 2022,
      genre: ['Sci-Fi'],
      book_authors: [{ author_order: 1, authors: { name: 'Frank Herbert', country: 'United States' } }],
    }
    const b = normalizeBook(raw)
    expect(b.author).toBe('Frank Herbert')
    expect(b.authors).toHaveLength(1)
    expect(b.country).toBe('United States')
    expect(b.year).toBe(2022)
  })

  it('joins multiple authors with " & "', () => {
    const raw = {
      id: 2,
      title: 'Good Omens',
      year_read_end: 2021,
      genre: ['Fantasy'],
      book_authors: [
        { author_order: 1, authors: { name: 'Terry Pratchett', country: 'United Kingdom' } },
        { author_order: 2, authors: { name: 'Neil Gaiman', country: 'United Kingdom' } },
      ],
    }
    const b = normalizeBook(raw)
    expect(b.author).toBe('Terry Pratchett & Neil Gaiman')
    expect(b.country).toBe('United Kingdom')
  })

  it('respects author_order (not insertion order)', () => {
    const raw = {
      id: 3,
      title: 'Test',
      year_read_end: 2020,
      genre: [],
      book_authors: [
        { author_order: 2, authors: { name: 'Second', country: '' } },
        { author_order: 1, authors: { name: 'First', country: '' } },
      ],
    }
    const b = normalizeBook(raw)
    expect(b.author).toBe('First & Second')
  })

  it('falls back to empty country when no authors', () => {
    const raw = { id: 4, title: 'No Author', year_read_end: 2019, genre: [], book_authors: [] }
    const b = normalizeBook(raw)
    expect(b.author).toBe('')
    expect(b.country).toBe('')
  })

  it('wraps a scalar genre into an array', () => {
    const raw = {
      id: 5, title: 'Test', year_read_end: 2023,
      genre: 'Fiction',
      book_authors: [],
    }
    const b = normalizeBook(raw)
    expect(b.genre).toEqual(['Fiction'])
  })

  it('keeps genre as empty array when genre is falsy', () => {
    const raw = { id: 6, title: 'Test', year_read_end: 2023, genre: null, book_authors: [] }
    const b = normalizeBook(raw)
    expect(b.genre).toEqual([])
  })
})

// ── buildBookContext ──────────────────────────────────────────────────────────

describe('buildBookContext', () => {
  const books = [
    { id: 1, title: 'Dune', author: 'Frank Herbert', year_read_start: 2022, year_read_end: 2022, genre: ['Sci-Fi'], fiction: true, country: 'United States', series: 'Dune' },
    { id: 2, title: 'Neuromancer', author: 'William Gibson', year_read_start: 2022, year_read_end: 2022, genre: ['Sci-Fi'], fiction: true, country: 'Canada', series: '' },
    { id: 3, title: 'Sapiens', author: 'Yuval Noah Harari', year_read_start: 2021, year_read_end: 2021, genre: ['History'], fiction: false, country: 'Israel', series: '' },
  ]

  it('includes total book count', () => {
    const ctx = buildBookContext(books)
    expect(ctx).toContain('3 books')
  })

  it('includes year range', () => {
    const ctx = buildBookContext(books)
    expect(ctx).toContain('2021–2022')
  })

  it('includes top authors', () => {
    const ctx = buildBookContext(books)
    expect(ctx).toContain('Frank Herbert')
    expect(ctx).toContain('William Gibson')
  })

  it('includes genre counts', () => {
    const ctx = buildBookContext(books)
    expect(ctx).toContain('Sci-Fi(2)')
    expect(ctx).toContain('History(1)')
  })

  it('includes fiction/non-fiction counts', () => {
    const ctx = buildBookContext(books)
    expect(ctx).toContain('FICTION: 2')
    expect(ctx).toContain('NON-FICTION: 1')
  })

  it('includes series that have a name', () => {
    const ctx = buildBookContext(books)
    expect(ctx).toContain('Dune')
  })

  it('includes the 2010 placeholder note', () => {
    const ctx = buildBookContext(books)
    expect(ctx).toContain('Year 2010 is a collective entry')
  })
})

// ── downloadCSV / downloadJSON ────────────────────────────────────────────────
// jsdom doesn't implement URL.createObjectURL, so we stub it.
// We also spy on HTMLAnchorElement.prototype.click to confirm the download fires.

const DL_BOOKS = [
  { id: 1, title: 'Dune', author: 'Frank Herbert', year_read_start: 2022, year_read_end: 2022,
    genre: ['Science Fiction'], country: 'United States', format: 'Novel', pages: 412,
    series: 'Dune', notes: '' },
  { id: 2, title: 'Sapiens', author: 'Yuval Harari', year_read_start: 2023, year_read_end: 2023,
    genre: [], country: '', format: 'Non-Fiction', pages: 443, series: '', notes: 'Great book' },
]

describe('downloadCSV', () => {
  let blobSpy, clickSpy

  beforeEach(() => {
    // jsdom has no createObjectURL implementation
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn().mockReturnValue('blob:mock-csv'),
      writable: true, configurable: true,
    })
    blobSpy  = vi.spyOn(global, 'Blob')
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => vi.restoreAllMocks())

  it('calls click() to trigger the browser download', () => {
    downloadCSV(DL_BOOKS)
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('creates a Blob with type "text/csv"', () => {
    downloadCSV(DL_BOOKS)
    const [, options] = blobSpy.mock.calls[0]
    expect(options.type).toBe('text/csv')
  })

  it('CSV content includes the header row', () => {
    downloadCSV(DL_BOOKS)
    const [blobParts] = blobSpy.mock.calls[0]
    expect(blobParts[0]).toContain('Title')
    expect(blobParts[0]).toContain('Author')
    expect(blobParts[0]).toContain('Genre')
  })

  it('CSV content includes each book title', () => {
    downloadCSV(DL_BOOKS)
    const [blobParts] = blobSpy.mock.calls[0]
    expect(blobParts[0]).toContain('Dune')
    expect(blobParts[0]).toContain('Sapiens')
  })

  it('sets download attribute to "my_reading_list.csv"', () => {
    // Capture the created anchor to inspect its download attribute
    const origCreate = document.createElement.bind(document)
    let capturedAnchor = null
    vi.spyOn(document, 'createElement').mockImplementation(tag => {
      const el = origCreate(tag)
      if (tag === 'a') capturedAnchor = el
      return el
    })
    downloadCSV(DL_BOOKS)
    expect(capturedAnchor?.download).toBe('my_reading_list.csv')
  })
})

describe('downloadJSON', () => {
  let blobSpy, clickSpy

  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn().mockReturnValue('blob:mock-json'),
      writable: true, configurable: true,
    })
    blobSpy  = vi.spyOn(global, 'Blob')
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => vi.restoreAllMocks())

  it('calls click() to trigger the browser download', () => {
    downloadJSON(DL_BOOKS)
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('creates a Blob with type "application/json"', () => {
    downloadJSON(DL_BOOKS)
    const [, options] = blobSpy.mock.calls[0]
    expect(options.type).toBe('application/json')
  })

  it('JSON content round-trips back to the original books array', () => {
    downloadJSON(DL_BOOKS)
    const [blobParts] = blobSpy.mock.calls[0]
    expect(JSON.parse(blobParts[0])).toEqual(DL_BOOKS)
  })

  it('sets download attribute to "my_reading_list.json"', () => {
    const origCreate = document.createElement.bind(document)
    let capturedAnchor = null
    vi.spyOn(document, 'createElement').mockImplementation(tag => {
      const el = origCreate(tag)
      if (tag === 'a') capturedAnchor = el
      return el
    })
    downloadJSON(DL_BOOKS)
    expect(capturedAnchor?.download).toBe('my_reading_list.json')
  })
})
