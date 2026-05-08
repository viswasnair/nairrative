import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { stripMd, normalizeBook, buildBookContext, toRow, downloadCSV, downloadJSON } from '../../src/lib/bookUtils.js'

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

  it('maps description from raw book', () => {
    const raw = { id: 7, title: 'Test', year_read_end: 2023, genre: [], book_authors: [], description: 'A great read.' }
    const b = normalizeBook(raw)
    expect(b.description).toBe('A great read.')
  })

  it('defaults description to empty string when absent', () => {
    const raw = { id: 8, title: 'Test', year_read_end: 2023, genre: [], book_authors: [] }
    const b = normalizeBook(raw)
    expect(b.description).toBe('')
  })
})

// ── buildBookContext ──────────────────────────────────────────────────────────

describe('buildBookContext', () => {
  const books = [
    { id: 1, title: 'Dune', author: 'Frank Herbert', year_read_start: 2022, year_read_end: 2022, genre: ['Sci-Fi'], fiction: true, country: 'United States', series: 'Dune',
      mood: 'epic', narrative_style: 'omniscient third-person', setting_era: 'far future', archetype: 'Hero\'s Journey', theme: ['survival', 'power', 'religion'] },
    { id: 2, title: 'Neuromancer', author: 'William Gibson', year_read_start: 2022, year_read_end: 2022, genre: ['Sci-Fi'], fiction: true, country: 'Canada', series: '',
      mood: 'tense', narrative_style: 'linear third-person', setting_era: 'near future', archetype: 'Overcoming the Monster', theme: ['identity', 'technology', 'survival'] },
    { id: 3, title: 'Sapiens', author: 'Yuval Noah Harari', year_read_start: 2021, year_read_end: 2021, genre: ['History'], fiction: false, country: 'Israel', series: '',
      mood: 'analytical', narrative_style: 'expository', setting_era: 'contemporary', archetype: 'Comedy', theme: ['power', 'human nature'] },
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

  it('includes top themes aggregated across all books', () => {
    const ctx = buildBookContext(books)
    expect(ctx).toContain('TOP THEMES')
    // 'survival' and 'power' each appear in 2 books
    expect(ctx).toContain('survival(2)')
    expect(ctx).toContain('power(2)')
    // 'religion' appears in only 1 book
    expect(ctx).toContain('religion(1)')
  })

  it('includes mood counts', () => {
    const ctx = buildBookContext(books)
    expect(ctx).toContain('MOODS')
    expect(ctx).toContain('epic(1)')
    expect(ctx).toContain('tense(1)')
    expect(ctx).toContain('analytical(1)')
  })

  it('includes narrative style counts', () => {
    const ctx = buildBookContext(books)
    expect(ctx).toContain('NARRATIVE STYLES')
    expect(ctx).toContain('omniscient third-person(1)')
    expect(ctx).toContain('linear third-person(1)')
    expect(ctx).toContain('expository(1)')
  })

  it('includes setting era counts', () => {
    const ctx = buildBookContext(books)
    expect(ctx).toContain('SETTING ERAS')
    expect(ctx).toContain('far future(1)')
    expect(ctx).toContain('near future(1)')
    expect(ctx).toContain('contemporary(1)')
  })

  it('includes archetype counts', () => {
    const ctx = buildBookContext(books)
    expect(ctx).toContain('ARCHETYPES')
    expect(ctx).toContain("Hero's Journey(1)")
    expect(ctx).toContain('Overcoming the Monster(1)')
  })

  it('silently skips books with null theme/mood/style/era/archetype', () => {
    const sparse = [
      { id: 1, title: 'Bare', author: 'A', year_read_start: 2023, year_read_end: 2023, genre: [], fiction: true, country: '', series: '',
        mood: null, narrative_style: null, setting_era: null, archetype: null, theme: null },
    ]
    expect(() => buildBookContext(sparse)).not.toThrow()
    const ctx = buildBookContext(sparse)
    expect(ctx).toContain('TOP THEMES')
  })

  it('includes RATINGS line with counts in canonical order', () => {
    const rated = [
      { id: 1, title: 'A', author: 'X', year_read_start: 2023, year_read_end: 2023, genre: [], fiction: true, country: '', series: '', rating: 'loved' },
      { id: 2, title: 'B', author: 'Y', year_read_start: 2023, year_read_end: 2023, genre: [], fiction: true, country: '', series: '', rating: 'loved' },
      { id: 3, title: 'C', author: 'Z', year_read_start: 2023, year_read_end: 2023, genre: [], fiction: false, country: '', series: '', rating: 'enjoyed' },
    ]
    const ctx = buildBookContext(rated)
    expect(ctx).toContain('RATINGS')
    expect(ctx).toContain('loved(2)')
    expect(ctx).toContain('enjoyed(1)')
    // 'loved' should appear before 'enjoyed' in the RATINGS line
    expect(ctx.indexOf('loved(2)')).toBeLessThan(ctx.indexOf('enjoyed(1)'))
  })

  it('omits RATINGS line content when no books have a rating', () => {
    const unrated = [
      { id: 1, title: 'A', author: 'X', year_read_start: 2023, year_read_end: 2023, genre: [], fiction: true, country: '', series: '' },
    ]
    const ctx = buildBookContext(unrated)
    expect(ctx).toContain('RATINGS:')
    // value after colon should be empty
    const ratingsLine = ctx.split('\n').find(l => l.startsWith('RATINGS:'))
    expect(ratingsLine).toBe('RATINGS: ')
  })
})

// ── toRow ─────────────────────────────────────────────────────────────────────

describe('toRow', () => {
  const fullBook = {
    title: 'Dune', author: 'Frank Herbert', year_read_end: 2022, year: 2022,
    genre: ['Sci-Fi', 'Classic'], pages: 412, series: 'Dune', fiction: true,
    mood: 'epic', narrative_style: 'omniscient third-person', setting_era: 'far future',
    archetype: "Hero's Journey", theme: ['survival', 'power'],
    rating: 'loved', description: 'A desert planet epic.', notes: 'Re-read',
  }

  it('includes year, title, author, and genre', () => {
    const row = toRow(fullBook)
    expect(row).toContain('[2022]')
    expect(row).toContain('"Dune"')
    expect(row).toContain('Frank Herbert')
    expect(row).toContain('Sci-Fi/Classic')
  })

  it('includes pages, series, and fiction flag', () => {
    const row = toRow(fullBook)
    expect(row).toContain('412pp')
    expect(row).toContain('series: Dune')
    expect(row).toContain('fiction')
  })

  it('includes mood, narrative_style, setting_era, archetype, and themes', () => {
    const row = toRow(fullBook)
    expect(row).toContain('mood: epic')
    expect(row).toContain('style: omniscient third-person')
    expect(row).toContain('era: far future')
    expect(row).toContain("archetype: Hero's Journey")
    expect(row).toContain('themes: survival, power')
  })

  it('includes rating and description', () => {
    const row = toRow(fullBook)
    expect(row).toContain('rating: loved')
    expect(row).toContain('desc: A desert planet epic.')
  })

  it('includes notes', () => {
    const row = toRow(fullBook)
    expect(row).toContain('notes: Re-read')
  })

  it('omits optional fields when absent', () => {
    const minimal = { title: 'X', author: 'A', year_read_end: 2020, genre: [], fiction: true }
    const row = toRow(minimal)
    expect(row).not.toContain('pp')
    expect(row).not.toContain('series:')
    expect(row).not.toContain('mood:')
    expect(row).not.toContain('rating:')
    expect(row).not.toContain('desc:')
    expect(row).not.toContain('notes:')
  })

  it('falls back to b.year when year_read_end is absent', () => {
    const b = { title: 'X', author: 'A', year: 2019, genre: [], fiction: false }
    expect(toRow(b)).toContain('[2019]')
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
